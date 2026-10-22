<?php
declare(strict_types=1);

/** GET /product-platform-url/product/{id} — the product's active marketplace URLs. */
function get_product_urls(int $productId): array
{
    $p = q('SELECT ProductID, ItemName, Brand, ModelName FROM products WHERE ProductID = ?', [$productId])->fetch();
    if (!$p) throw new HttpError(404, 'Product not found');

    $rows = q(
        'SELECT pp.ProductPlatformID, pp.PlatformID, pl.PlatformName, pp.ProductURL, pp.UrlSource
           FROM product_platforms pp JOIN platforms pl ON pl.PlatformID = pp.PlatformID
          WHERE pp.ProductID = ? AND pp.IsActive = 1
          ORDER BY pl.PlatformID',
        [$productId]
    )->fetchAll();

    return [
        'success'   => true,
        'ProductID' => (int) $p['ProductID'],
        'ItemName'  => $p['ItemName'],
        'Brand'     => $p['Brand'],
        'ModelName' => $p['ModelName'],
        'Platforms' => array_map(fn($r) => [
            'ProductPlatformID' => (int) $r['ProductPlatformID'],
            'PlatformID'        => (int) $r['PlatformID'],
            'PlatformName'      => $r['PlatformName'],
            'ProductURL'        => $r['ProductURL'],
            'UrlSource'         => $r['UrlSource'],
        ], $rows),
    ];
}

/**
 * Saves a URL typed in the dashboard. It becomes 'manual', which the scraper's
 * auto-search never overwrites. Returns the ProductPlatformID.
 */
function save_manual_url(int $ppId, int $productId, int $platformId, string $url, bool $active): int
{
    if (!valid_url($url)) throw new HttpError(422, 'ProductURL must be a valid http(s) URL');
    if (!q('SELECT 1 FROM products WHERE ProductID = ?', [$productId])->fetchColumn()) {
        throw new HttpError(404, 'Product not found');
    }
    if (!q('SELECT 1 FROM platforms WHERE PlatformID = ?', [$platformId])->fetchColumn()) {
        throw new HttpError(404, 'Platform not found');
    }

    $existing = $ppId > 0
        ? q('SELECT * FROM product_platforms WHERE ProductPlatformID = ?', [$ppId])->fetch()
        : q('SELECT * FROM product_platforms WHERE ProductID = ? AND PlatformID = ?', [$productId, $platformId])->fetch();

    if ($existing) {
        // A new URL means the last scraped price belongs to a different page.
        $urlChanged = (int) ($existing['ProductURL'] !== $url);
        q(
            'UPDATE product_platforms
                SET ProductID = ?, PlatformID = ?, ProductURL = ?, UrlSource = \'manual\', IsActive = ?,
                    MatchedTitle = IF(?, NULL, MatchedTitle),
                    LastPrice = IF(?, NULL, LastPrice), LastMRP = IF(?, NULL, LastMRP),
                    LastDiscount = IF(?, NULL, LastDiscount), LastCheckedAt = IF(?, NULL, LastCheckedAt)
              WHERE ProductPlatformID = ?',
            [$productId, $platformId, $url, $active ? 1 : 0,
             $urlChanged, $urlChanged, $urlChanged, $urlChanged, $urlChanged, (int) $existing['ProductPlatformID']]
        );
        $id = (int) $existing['ProductPlatformID'];
    } else {
        q(
            'INSERT INTO product_platforms (ProductID, PlatformID, ProductURL, UrlSource, IsActive) VALUES (?, ?, ?, \'manual\', ?)',
            [$productId, $platformId, $url, $active ? 1 : 0]
        );
        $id = (int) db()->lastInsertId();
    }
    q('DELETE FROM search_misses WHERE ProductID = ? AND PlatformID = ?', [$productId, $platformId]);
    return $id;
}

/** POST /product-platform-url/save */
function save_product_url(): array
{
    $b = read_json();
    $id = save_manual_url(
        (int) ($b['ProductPlatformID'] ?? 0),
        (int) ($b['ProductID'] ?? 0),
        (int) ($b['PlatformID'] ?? 0),
        trim((string) ($b['ProductURL'] ?? '')),
        bool_val($b['IsActive'] ?? null)
    );
    return ['success' => true, 'message' => 'Product URL saved', 'ProductPlatformID' => $id];
}

/** POST /urlmap/update-url — older alias of save, kept for the dashboard's urlMapService. */
function update_url(): array
{
    $b = read_json();
    save_manual_url(
        (int) ($b['ProductPlatformID'] ?? 0),
        (int) ($b['ProductID'] ?? 0),
        (int) ($b['PlatformID'] ?? 0),
        trim((string) ($b['ProductURL'] ?? '')),
        true
    );
    return ['success' => true, 'message' => 'URL updated'];
}
