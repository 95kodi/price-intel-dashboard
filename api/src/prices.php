<?php
declare(strict_types=1);

/**
 * Records one scraped price for a listing. The latest value always lands on
 * product_platforms; a history row is only added when the price/MRP changed
 * or the last row is from an earlier day — four scans a day across ~1,000
 * models would otherwise add tens of thousands of identical rows daily.
 * Returns the new PriceID, or null when no history row was needed.
 */
function record_price(int $ppId, float $price, ?float $mrp, ?float $discount, string $source): ?int
{
    $mrp ??= $price;
    if ($discount === null && $mrp > 0) $discount = round(($mrp - $price) / $mrp * 100, 2);

    q(
        'UPDATE product_platforms SET LastPrice = ?, LastMRP = ?, LastDiscount = ?, LastCheckedAt = NOW() WHERE ProductPlatformID = ?',
        [$price, $mrp, $discount, $ppId]
    );

    $last = q(
        'SELECT Price, MRP, DATE(CaptureTime) AS Day FROM price_history
          WHERE ProductPlatformID = ? AND IsActive = 1 ORDER BY PriceID DESC LIMIT 1',
        [$ppId]
    )->fetch();
    $unchanged = $last
        && abs((float) $last['Price'] - $price) < 0.005
        && abs((float) ($last['MRP'] ?? 0) - $mrp) < 0.005
        && $last['Day'] === date('Y-m-d');
    if ($unchanged) return null;

    q(
        'INSERT INTO price_history (ProductPlatformID, Price, MRP, Discount, Source) VALUES (?, ?, ?, ?, ?)',
        [$ppId, $price, $mrp, $discount, mb_substr($source, 0, 64)]
    );
    return (int) db()->lastInsertId();
}

/** POST /platform-price-history/save — used by the desktop agent. */
function save_price(): array
{
    $b = read_json();
    $ppId = (int) ($b['ProductPlatformID'] ?? 0);
    $price = num_or_null($b['Price'] ?? null);
    if ($price === null) throw new HttpError(422, 'Price must be a positive number');
    if (!q('SELECT 1 FROM product_platforms WHERE ProductPlatformID = ?', [$ppId])->fetchColumn()) {
        throw new HttpError(404, 'ProductPlatformID not found');
    }
    $priceId = record_price(
        $ppId,
        $price,
        num_or_null($b['MRP'] ?? null),
        isset($b['Discount']) ? (float) $b['Discount'] : null,
        str_val($b['Source'] ?? 'Manual', 64)
    );
    return ['success' => true, 'message' => 'Price saved', 'PriceID' => $priceId];
}

/**
 * POST /platform-price-history/save-batch
 *   {"Source": "Desktop Agent", "Prices": [{ProductPlatformID, Price, MRP?, Discount?}, ...]}
 * Up to 200 prices on one database connection, so a full agent scan doesn't
 * open a connection per price (shared hosting caps connections per account).
 */
function save_price_batch(): array
{
    $b = read_json();
    $prices = $b['Prices'] ?? null;
    if (!is_array($prices)) throw new HttpError(422, 'Prices must be an array');
    if (count($prices) > 200) throw new HttpError(413, 'Send at most 200 prices per request');
    $source = str_val($b['Source'] ?? 'Desktop Agent', 64) ?: 'Desktop Agent';

    $known = q('SELECT ProductPlatformID FROM product_platforms')->fetchAll(PDO::FETCH_COLUMN);
    $known = array_flip(array_map('intval', $known));
    $saved = 0;
    $errors = [];
    foreach ($prices as $i => $p) {
        $ppId = (int) ($p['ProductPlatformID'] ?? 0);
        $price = num_or_null($p['Price'] ?? null);
        if (!isset($known[$ppId]) || $price === null) {
            if (count($errors) < 20) $errors[] = "#$i: " . (isset($known[$ppId]) ? 'Price must be positive' : 'unknown ProductPlatformID');
            continue;
        }
        record_price(
            $ppId,
            $price,
            num_or_null($p['MRP'] ?? null),
            isset($p['Discount']) && $p['Discount'] !== null ? (float) $p['Discount'] : null,
            $source
        );
        $saved++;
    }
    return ['success' => true, 'saved' => $saved, 'skipped' => count($prices) - $saved, 'errors' => $errors];
}

/**
 * GET /price-comparison/ — one row per active product with at least one
 * active URL, and <ColumnKey>Price / <ColumnKey>URL for every platform.
 */
function price_comparison(): array
{
    $platforms = platforms_by_id();
    $rows = q(
        'SELECT p.ProductID, p.ItemCode, p.ItemName, p.Brand, p.CurrentPrice,
                pp.PlatformID, pp.ProductURL, pp.LastPrice
           FROM products p
           JOIN product_platforms pp ON pp.ProductID = p.ProductID AND pp.IsActive = 1
          WHERE p.IsActive = 1
          ORDER BY p.ProductID'
    )->fetchAll();

    $blank = [];
    foreach ($platforms as $pl) {
        $blank[$pl['ColumnKey'] . 'Price'] = null;
        $blank[$pl['ColumnKey'] . 'URL'] = null;
    }

    $out = [];
    foreach ($rows as $r) {
        $id = (int) $r['ProductID'];
        $out[$id] ??= [
            'ProductID'    => $id,
            'ItemCode'     => $r['ItemCode'],
            'ItemName'     => $r['ItemName'],
            'Brand'        => $r['Brand'],
            'CurrentPrice' => money($r['CurrentPrice']),
        ] + $blank;
        $key = $platforms[(int) $r['PlatformID']]['ColumnKey'] ?? null;
        if ($key === null) continue;
        $out[$id][$key . 'Price'] = money($r['LastPrice']);
        $out[$id][$key . 'URL'] = $r['ProductURL'];
    }

    return ['success' => true, 'count' => count($out), 'data' => array_values($out)];
}

/** GET /platform-price-history/product/{id} — latest price per mapped platform. */
function latest_prices_for_product(int $productId): array
{
    $rows = q(
        'SELECT p.ProductID, pp.ProductPlatformID, p.ItemName, pp.PlatformID, pl.PlatformName, pp.ProductURL, pp.LastPrice
           FROM product_platforms pp
           JOIN products p   ON p.ProductID = pp.ProductID
           JOIN platforms pl ON pl.PlatformID = pp.PlatformID
          WHERE pp.ProductID = ? AND pp.IsActive = 1
          ORDER BY pl.PlatformID',
        [$productId]
    )->fetchAll();

    return array_map(fn($r) => [
        'ProductID'         => (int) $r['ProductID'],
        'ProductPlatformID' => (int) $r['ProductPlatformID'],
        'ItemName'          => $r['ItemName'],
        'PlatformID'        => (int) $r['PlatformID'],
        'PlatformName'      => $r['PlatformName'],
        'ProductURL'        => $r['ProductURL'],
        'Price'             => money($r['LastPrice']),
    ], $rows);
}

/** GET /price-history/product/{id}?days=180 — history grouped by platform name. */
function price_history_for_product(int $productId): array
{
    $p = q('SELECT ProductID, ItemCode, ItemName FROM products WHERE ProductID = ?', [$productId])->fetch();
    if (!$p) throw new HttpError(404, 'Product not found');
    $days = min(730, max(1, (int) ($_GET['days'] ?? 180)));

    $rows = q(
        'SELECT pl.PlatformName, pp.ProductURL, ph.PriceID, ph.Price, ph.MRP, ph.Discount, ph.CaptureTime
           FROM product_platforms pp
           JOIN platforms pl ON pl.PlatformID = pp.PlatformID
           LEFT JOIN price_history ph ON ph.ProductPlatformID = pp.ProductPlatformID
                AND ph.IsActive = 1 AND ph.CaptureTime >= NOW() - INTERVAL ? DAY
          WHERE pp.ProductID = ? AND pp.IsActive = 1
          ORDER BY pl.PlatformID, ph.CaptureTime',
        [$days, $productId]
    )->fetchAll();

    $platforms = [];
    foreach ($rows as $r) {
        $name = $r['PlatformName'];
        $platforms[$name] ??= ['PlatformName' => $name, 'ProductURL' => $r['ProductURL'], 'PriceHistory' => []];
        if ($r['PriceID'] === null) continue;
        $platforms[$name]['PriceHistory'][] = [
            'PriceID'     => (int) $r['PriceID'],
            'Price'       => (float) $r['Price'],
            'MRP'         => money($r['MRP']),
            'Discount'    => money($r['Discount']),
            'CaptureTime' => iso($r['CaptureTime']),
        ];
    }

    return [
        'ProductID' => (int) $p['ProductID'],
        'ItemCode'  => $p['ItemCode'],
        'ItemName'  => $p['ItemName'],
        // An empty PHP array encodes as [], but the dashboard expects an object.
        'Platforms' => (object) $platforms,
    ];
}
