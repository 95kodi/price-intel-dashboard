<?php
/**
 * CLI, one-off: copy products, marketplace URLs and price history from the
 * old backend (api.gogizmo.co) into this MySQL database, so switching the
 * dashboard to the PHP API doesn't lose the URLs mapped so far.
 *
 *   php tools/import-from-old-api.php [https://api.gogizmo.co]
 *
 * Safe to re-run: products keep their old ProductID (upsert), URLs upsert on
 * (ProductID, PlatformID) as 'manual', and history rows are only added for
 * listings that have none yet.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/platforms.php';

$old = rtrim($argv[1] ?? 'https://api.gogizmo.co', '/');

function old_get(string $url): array
{
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 60, CURLOPT_CONNECTTIMEOUT => 15]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false || $status !== 200) throw new RuntimeException("GET $url failed: " . ($err ?: "HTTP $status"));
    $data = json_decode($body, true);
    if (!is_array($data)) throw new RuntimeException("GET $url: invalid JSON");
    return $data;
}

/** Same loose name match the dashboard uses ("Sangeetha" ≈ "Sangeetha Mobiles"). */
function name_key(string $s): string
{
    return preg_replace('/[^a-z0-9]/', '', strtolower($s));
}

function local_platform_id(string $name): int
{
    static $cache = null;
    $cache ??= array_map(fn($p) => name_key($p['PlatformName']), platforms_by_id());
    $key = name_key($name);
    foreach ($cache as $id => $k) {
        if ($k === $key || str_starts_with($k, $key) || str_starts_with($key, $k)) return $id;
    }
    $column = preg_replace('/[^A-Za-z0-9]/', '', $name);
    q('INSERT INTO platforms (PlatformCode, PlatformName, ColumnKey) VALUES (?, ?, ?)', [strtoupper($column), $name, $column]);
    $id = (int) db()->lastInsertId();
    $cache[$id] = $key;
    echo "  created platform $name (#$id)\n";
    return $id;
}

// Old ProductIDs are kept, so they'd collide with models already synced from
// GoFix. Run this once on the empty database, before the first model sync.
if (q('SELECT 1 FROM products WHERE ExternalModelID IS NOT NULL LIMIT 1')->fetchColumn()) {
    fwrite(STDERR, "Models were already synced into this database; the import would overwrite them.\n"
        . "Import into a fresh database first, then run the model sync.\n");
    exit(1);
}

echo "Importing from $old\n";

// 1. Products (paged, 100 per page).
$page = 1;
$count = 0;
do {
    $res = old_get("$old/products/?page=$page&page_size=100");
    foreach ($res['data'] ?? [] as $p) {
        q(
            'INSERT INTO products (ProductID, ItemCode, Brand, ModelName, RAM, StorageSize, ColorName, VariantName,
                                   ItemName, Category, SubCategory, IsActive, CurrentPrice, LastUpdated, CreatedOn)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))
             ON DUPLICATE KEY UPDATE ItemCode = VALUES(ItemCode), Brand = VALUES(Brand), ModelName = VALUES(ModelName),
                RAM = VALUES(RAM), StorageSize = VALUES(StorageSize), ColorName = VALUES(ColorName),
                VariantName = VALUES(VariantName), ItemName = VALUES(ItemName), Category = VALUES(Category),
                SubCategory = VALUES(SubCategory), IsActive = VALUES(IsActive),
                CurrentPrice = VALUES(CurrentPrice), LastUpdated = VALUES(LastUpdated)',
            [
                (int) $p['ProductID'], (string) ($p['ItemCode'] ?? ''), (string) ($p['Brand'] ?? ''),
                (string) ($p['ModelName'] ?? ''), (string) ($p['RAM'] ?? ''), (string) ($p['StorageSize'] ?? ''),
                (string) ($p['ColorName'] ?? ''), (string) ($p['VariantName'] ?? ''), (string) ($p['ItemName'] ?? ''),
                (string) ($p['Category'] ?? ''), (string) ($p['SubCategory'] ?? ''), empty($p['IsActive']) ? 0 : 1,
                num_or_null($p['CurrentPrice'] ?? null),
                isset($p['LastUpdated']) ? str_replace('T', ' ', substr((string) $p['LastUpdated'], 0, 19)) : null,
                isset($p['CreatedOn']) ? str_replace('T', ' ', substr((string) $p['CreatedOn'], 0, 19)) : null,
            ]
        );
        $count++;
    }
    $totalPages = (int) ($res['total_pages'] ?? 1);
    echo "  products page $page/$totalPages\n";
    $page++;
} while ($page <= $totalPages);
echo "Products: $count\n";

// 2. Which products have URLs — price-comparison already knows.
$mapped = [];
foreach (old_get("$old/price-comparison/")['data'] ?? [] as $row) {
    foreach ($row as $k => $v) {
        if (str_ends_with((string) $k, 'URL') && is_string($v) && $v !== '') {
            $mapped[] = (int) $row['ProductID'];
            break;
        }
    }
}
echo 'Products with URLs: ' . count($mapped) . "\n";

// 3. URLs + history per product.
$urls = 0;
$history = 0;
foreach ($mapped as $productId) {
    if (!q('SELECT 1 FROM products WHERE ProductID = ?', [$productId])->fetchColumn()) continue;
    $links = old_get("$old/product-platform-url/product/$productId")['Platforms'] ?? [];
    $ppByName = [];
    foreach ($links as $l) {
        if (empty($l['ProductURL'])) continue;
        $platformId = local_platform_id((string) $l['PlatformName']);
        q(
            'INSERT INTO product_platforms (ProductID, PlatformID, ProductURL, UrlSource) VALUES (?, ?, ?, \'manual\')
             ON DUPLICATE KEY UPDATE ProductURL = VALUES(ProductURL), UrlSource = \'manual\', IsActive = 1',
            [$productId, $platformId, $l['ProductURL']]
        );
        $ppByName[name_key((string) $l['PlatformName'])] = (int) q(
            'SELECT ProductPlatformID FROM product_platforms WHERE ProductID = ? AND PlatformID = ?',
            [$productId, $platformId]
        )->fetchColumn();
        $urls++;
    }

    try {
        $hist = old_get("$old/price-history/product/$productId")['Platforms'] ?? [];
    } catch (RuntimeException $e) {
        echo "  history for #$productId skipped: {$e->getMessage()}\n";
        continue;
    }
    foreach ($hist as $name => $info) {
        $ppId = $ppByName[name_key((string) ($info['PlatformName'] ?? $name))] ?? null;
        if ($ppId === null) continue;
        if (q('SELECT 1 FROM price_history WHERE ProductPlatformID = ? LIMIT 1', [$ppId])->fetchColumn()) continue;
        $last = null;
        foreach ($info['PriceHistory'] ?? [] as $h) {
            $price = num_or_null($h['Price'] ?? null);
            if ($price === null) continue;
            $at = str_replace('T', ' ', substr((string) ($h['CaptureTime'] ?? date('c')), 0, 19));
            q(
                'INSERT INTO price_history (ProductPlatformID, Price, MRP, Discount, Source, CaptureTime) VALUES (?, ?, ?, ?, ?, ?)',
                [$ppId, $price, num_or_null($h['MRP'] ?? null), isset($h['Discount']) ? (float) $h['Discount'] : null, 'Import', $at]
            );
            $history++;
            if ($last === null || $at >= $last['at']) $last = ['at' => $at, 'price' => $price, 'mrp' => num_or_null($h['MRP'] ?? null), 'disc' => $h['Discount'] ?? null];
        }
        if ($last) {
            q(
                'UPDATE product_platforms SET LastPrice = ?, LastMRP = ?, LastDiscount = ?, LastCheckedAt = ? WHERE ProductPlatformID = ?',
                [$last['price'], $last['mrp'], $last['disc'], $last['at'], $ppId]
            );
        }
    }
}
echo "URLs: $urls, history rows: $history\nDone.\n";
