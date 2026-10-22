<?php
declare(strict_types=1);

/**
 * GET /scrape/jobs — everything the scraper needs in one call: platforms,
 * active products, their current URLs (manual or auto) and recent search
 * misses, so the runner can decide per product/platform whether to scrape a
 * known URL, search the store, or skip.
 */
function scrape_jobs(): array
{
    require_scrape_token();

    $platforms = array_map(fn($p) => [
        'PlatformID'    => (int) $p['PlatformID'],
        'PlatformCode'  => $p['PlatformCode'],
        'PlatformName'  => $p['PlatformName'],
        'CollectorType' => $p['CollectorType'],
        'IsEnabled'     => (bool) $p['IsEnabled'],
    ], array_values(platforms_by_id()));

    $products = [];
    foreach (q('SELECT ProductID, ExternalModelID, ItemName, Brand, ModelName, Category, LaunchDate FROM products WHERE IsActive = 1 ORDER BY ProductID')->fetchAll() as $p) {
        $products[(int) $p['ProductID']] = [
            'ProductID'     => (int) $p['ProductID'],
            'ItemName'      => $p['ItemName'],
            'Brand'         => $p['Brand'],
            'ModelName'     => $p['ModelName'],
            'Category'      => $p['Category'],
            // Lets the runner skip long-discontinued models from the GoFix list.
            'FromModelList' => $p['ExternalModelID'] !== null,
            'LaunchDate'    => $p['LaunchDate'],
            'links'         => [],
            'misses'        => [],
        ];
    }

    foreach (q('SELECT ProductPlatformID, ProductID, PlatformID, ProductURL, UrlSource, IsActive, LastCheckedAt FROM product_platforms')->fetchAll() as $l) {
        $id = (int) $l['ProductID'];
        if (!isset($products[$id])) continue;
        $products[$id]['links'][] = [
            'ProductPlatformID' => (int) $l['ProductPlatformID'],
            'PlatformID'        => (int) $l['PlatformID'],
            'ProductURL'        => $l['ProductURL'],
            'UrlSource'         => $l['UrlSource'],
            'IsActive'          => (bool) $l['IsActive'],
            'LastCheckedAt'     => iso($l['LastCheckedAt']),
        ];
    }

    foreach (q('SELECT ProductID, PlatformID, SearchedAt FROM search_misses')->fetchAll() as $m) {
        $id = (int) $m['ProductID'];
        if (!isset($products[$id])) continue;
        $products[$id]['misses'][] = ['PlatformID' => (int) $m['PlatformID'], 'SearchedAt' => iso($m['SearchedAt'])];
    }

    return [
        'success'     => true,
        'generatedAt' => date('c'),
        'platforms'   => $platforms,
        'products'    => array_values($products),
    ];
}

/** "https://www.flipkart.com" → "flipkart.com" */
function base_domain(string $url): string
{
    $host = strtolower((string) parse_url($url, PHP_URL_HOST));
    return preg_replace('/^(www|m|dl)\./', '', $host);
}

/**
 * POST /scrape/results — a batch from the scraper. Each item is one of:
 *   {ProductID, PlatformID, ProductURL, MatchedTitle?, Price, MRP?, Discount?}  a price
 *   {ProductID, PlatformID, miss: true, reason?}                               no listing found
 *
 * A price for a URL the scraper found itself is stored as an 'auto' mapping.
 * Manual URLs win: if the dashboard has a different manual URL for that
 * product/platform, the scraped one is skipped. Mappings switched off in the
 * dashboard (IsActive = 0) are never re-enabled here.
 */
function scrape_results(): array
{
    require_scrape_token();
    $b = read_json();
    $results = $b['results'] ?? null;
    if (!is_array($results)) throw new HttpError(422, 'results must be an array');
    if (count($results) > 500) throw new HttpError(413, 'Send at most 500 results per request');
    $source = str_val($b['source'] ?? 'Scraper', 64) ?: 'Scraper';

    $platforms = platforms_by_id();
    $activeProducts = array_flip(array_map('intval', q('SELECT ProductID FROM products WHERE IsActive = 1')->fetchAll(PDO::FETCH_COLUMN)));
    $stats = ['saved' => 0, 'created' => 0, 'relinked' => 0, 'misses' => 0, 'skipped' => 0];
    $errors = [];

    foreach ($results as $i => $r) {
        try {
            $productId = (int) ($r['ProductID'] ?? 0);
            $platformId = (int) ($r['PlatformID'] ?? 0);
            if (!isset($activeProducts[$productId])) throw new InvalidArgumentException('unknown or inactive ProductID');
            if (!isset($platforms[$platformId])) throw new InvalidArgumentException('unknown PlatformID');

            if (!empty($r['miss'])) {
                q(
                    'INSERT INTO search_misses (ProductID, PlatformID, Reason, SearchedAt) VALUES (?, ?, ?, NOW())
                     ON DUPLICATE KEY UPDATE Reason = VALUES(Reason), SearchedAt = VALUES(SearchedAt)',
                    [$productId, $platformId, str_val($r['reason'] ?? '', 255)]
                );
                $stats['misses']++;
                continue;
            }

            $url = trim((string) ($r['ProductURL'] ?? ''));
            $price = num_or_null($r['Price'] ?? null);
            if (!valid_url($url)) throw new InvalidArgumentException('invalid ProductURL');
            if ($price === null) throw new InvalidArgumentException('Price must be positive');
            // Guard against a searcher returning some other site's link.
            $domain = base_domain($platforms[$platformId]['BaseURL']);
            if ($domain !== '' && !str_ends_with(base_domain($url), $domain)) {
                throw new InvalidArgumentException("URL is not on $domain");
            }
            $title = isset($r['MatchedTitle']) ? str_val($r['MatchedTitle'], 512) : null;

            $existing = q('SELECT * FROM product_platforms WHERE ProductID = ? AND PlatformID = ?', [$productId, $platformId])->fetch();
            if ($existing && (!$existing['IsActive'] || ($existing['UrlSource'] === 'manual' && $existing['ProductURL'] !== $url))) {
                $stats['skipped']++;
                continue;
            }

            if (!$existing) {
                q(
                    'INSERT INTO product_platforms (ProductID, PlatformID, ProductURL, UrlSource, MatchedTitle) VALUES (?, ?, ?, \'auto\', ?)',
                    [$productId, $platformId, $url, $title]
                );
                $ppId = (int) db()->lastInsertId();
                $stats['created']++;
            } else {
                $ppId = (int) $existing['ProductPlatformID'];
                if ($existing['ProductURL'] !== $url) {
                    // Auto URL went stale and the scraper found a new listing.
                    q(
                        'UPDATE product_platforms SET ProductURL = ?, MatchedTitle = ?, LastPrice = NULL, LastMRP = NULL,
                                LastDiscount = NULL, LastCheckedAt = NULL WHERE ProductPlatformID = ?',
                        [$url, $title, $ppId]
                    );
                    $stats['relinked']++;
                } elseif ($title !== null && $existing['UrlSource'] === 'auto') {
                    q('UPDATE product_platforms SET MatchedTitle = ? WHERE ProductPlatformID = ?', [$title, $ppId]);
                }
            }

            record_price(
                $ppId,
                $price,
                num_or_null($r['MRP'] ?? null),
                isset($r['Discount']) && $r['Discount'] !== null ? (float) $r['Discount'] : null,
                $source
            );
            q('DELETE FROM search_misses WHERE ProductID = ? AND PlatformID = ?', [$productId, $platformId]);
            $stats['saved']++;
        } catch (InvalidArgumentException $e) {
            $stats['skipped']++;
            if (count($errors) < 20) $errors[] = "#$i: " . $e->getMessage();
        }
    }

    return ['success' => true] + $stats + ['errors' => $errors];
}
