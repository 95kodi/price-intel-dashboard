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
    // Models only: variants are found again from each store search.
    foreach (q('SELECT ProductID, ExternalModelID, ItemName, Brand, ModelName, Category, LaunchDate FROM products WHERE IsActive = 1 AND ParentProductID IS NULL ORDER BY ProductID')->fetchAll() as $p) {
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
            'variants'      => [],
        ];
    }

    // Storage + colour combinations any store has listed. A store whose plain
    // search doesn't show one of them gets searched again by storage.
    foreach (q("SELECT ParentProductID, StorageSize, ColorName FROM products WHERE ParentProductID IS NOT NULL AND IsActive = 1 AND StorageSize <> '' AND ColorName <> ''")->fetchAll() as $v) {
        $id = (int) $v['ParentProductID'];
        if (!isset($products[$id])) continue;
        $products[$id]['variants'][] = ['Storage' => $v['StorageSize'], 'Color' => $v['ColorName']];
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

/** "cobalt  Violet" → "Cobalt Violet" */
function color_label(string $c): string
{
    return ucwords(strtolower(trim(preg_replace('/\s+/', ' ', $c))));
}

/**
 * The variant product (model + storage + colour) for a scraped listing,
 * created on first sight. Storage and colour make the key; RAM is kept as
 * an attribute, because some stores (Flipkart) leave it out of titles and the
 * same phone would otherwise split into two variants.
 */
function variant_product_id(int $parentId, array $v, array &$cache): ?int
{
    $storage = strtoupper(str_replace(' ', '', str_val($v['Storage'] ?? '', 16)));
    $color = color_label(str_val($v['Color'] ?? '', 60));
    $ram = strtoupper(str_replace(' ', '', str_val($v['RAM'] ?? '', 16)));
    if (!preg_match('/^\d+(GB|TB)$/', $storage) || $color === '') return null;

    $words = preg_split('/\s+/', strtolower($color));
    sort($words);
    $key = strtolower($storage) . '|' . implode(' ', $words);
    $cacheKey = "$parentId|$key";
    if (isset($cache[$cacheKey])) return $cache[$cacheKey];

    $parent = q('SELECT * FROM products WHERE ProductID = ?', [$parentId])->fetch();
    $label = ($ram !== '' ? "$ram/" : '') . "$storage $color";

    $existing = q('SELECT ProductID, RAM FROM products WHERE ParentProductID = ? AND VariantKey = ?', [$parentId, $key])->fetch();
    if ($existing) {
        // First seen on a store that omits RAM; fill it in once another store says.
        if ($existing['RAM'] === '' && $ram !== '') {
            q('UPDATE products SET RAM = ?, VariantName = ?, ItemName = ? WHERE ProductID = ?',
              [$ram, $label, mb_substr($parent['ItemName'] . ' ' . $label, 0, 255), (int) $existing['ProductID']]);
        }
        return $cache[$cacheKey] = (int) $existing['ProductID'];
    }

    q(
        'INSERT INTO products (ParentProductID, VariantKey, ItemCode, Brand, ModelName, RAM, StorageSize, ColorName,
                               VariantName, ItemName, Category, SubCategory, LaunchDate, IsActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)',
        [$parentId, $key, mb_substr($parent['ItemCode'] . '-' . strtoupper(preg_replace('/[^a-z0-9]+/', '', $key)), 0, 64),
         $parent['Brand'], $parent['ModelName'], $ram, $storage, $color, $label,
         mb_substr($parent['ItemName'] . ' ' . $label, 0, 255), $parent['Category'], 'Variant', $parent['LaunchDate']]
    );
    return $cache[$cacheKey] = (int) db()->lastInsertId();
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
    $variantCache = [];

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

            // A variant listing is stored against the variant product, not the model.
            if (!empty($r['Variant']) && is_array($r['Variant'])) {
                $variantId = variant_product_id($productId, $r['Variant'], $variantCache);
                if ($variantId === null) throw new InvalidArgumentException('Variant needs Storage (e.g. 128GB) and Color');
                $productId = $variantId;
            }

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
