<?php
declare(strict_types=1);

const PRODUCT_COLUMNS = 'ProductID, ItemCode, Brand, ModelName, RAM, StorageSize, ColorName, VariantName,
    ItemName, Category, SubCategory, IsActive, CreatedOn, CurrentPrice, LastUpdated';

function product_row(array $r): array
{
    return [
        'ProductID'    => (int) $r['ProductID'],
        'ItemCode'     => $r['ItemCode'],
        'Brand'        => $r['Brand'],
        'ModelName'    => $r['ModelName'],
        'RAM'          => $r['RAM'],
        'StorageSize'  => $r['StorageSize'],
        'ColorName'    => $r['ColorName'],
        'VariantName'  => $r['VariantName'],
        'ItemName'     => $r['ItemName'],
        'Category'     => $r['Category'],
        'SubCategory'  => $r['SubCategory'],
        'IsActive'     => (bool) $r['IsActive'],
        'CreatedOn'    => iso($r['CreatedOn']),
        'CurrentPrice' => money($r['CurrentPrice']),
        'LastUpdated'  => iso($r['LastUpdated']),
    ];
}

/** GET /products/?page=1&page_size=100 — page_size is capped at 100 like the old API. */
function list_products(): array
{
    $page = max(1, (int) ($_GET['page'] ?? 1));
    $size = min(100, max(1, (int) ($_GET['page_size'] ?? 20)));
    $total = (int) q('SELECT COUNT(*) FROM products')->fetchColumn();

    $rows = q(
        'SELECT ' . PRODUCT_COLUMNS . ' FROM products ORDER BY ProductID LIMIT ' . $size . ' OFFSET ' . (($page - 1) * $size)
    )->fetchAll();

    return [
        'page'          => $page,
        'page_size'     => $size,
        'total_records' => $total,
        'total_pages'   => max(1, (int) ceil($total / $size)),
        'data'          => array_map('product_row', $rows),
    ];
}

function get_product(int $id): array
{
    $row = q('SELECT ' . PRODUCT_COLUMNS . ' FROM products WHERE ProductID = ?', [$id])->fetch();
    if (!$row) throw new HttpError(404, 'Product not found');
    return product_row($row);
}

/** POST /products/save — ProductID 0 creates; anything else updates (IsActive=false is the "delete"). */
function save_product(): array
{
    $b = read_json();
    $id = (int) ($b['ProductID'] ?? 0);
    $itemName = str_val($b['ItemName'] ?? '');
    if ($itemName === '') throw new HttpError(422, 'ItemName is required');

    $fields = [
        'ItemCode'    => str_val($b['ItemCode'] ?? '', 64),
        'Brand'       => str_val($b['Brand'] ?? '', 100),
        'ModelName'   => str_val($b['ModelName'] ?? ''),
        'RAM'         => str_val($b['RAM'] ?? '', 32),
        'StorageSize' => str_val($b['StorageSize'] ?? '', 32),
        'ColorName'   => str_val($b['ColorName'] ?? '', 64),
        'VariantName' => str_val($b['VariantName'] ?? '', 128),
        'ItemName'    => $itemName,
        'Category'    => str_val($b['Category'] ?? '', 100),
        'SubCategory' => str_val($b['SubCategory'] ?? '', 100),
        'IsActive'    => bool_val($b['IsActive'] ?? null) ? 1 : 0,
    ];
    // CurrentPrice is optional so the existing form (which doesn't send it)
    // can't wipe our own price.
    if (array_key_exists('CurrentPrice', $b)) {
        $fields['CurrentPrice'] = num_or_null($b['CurrentPrice']);
        $fields['LastUpdated'] = date('Y-m-d H:i:s');
    }

    if ($id > 0) {
        if (!q('SELECT 1 FROM products WHERE ProductID = ?', [$id])->fetchColumn()) {
            throw new HttpError(404, 'Product not found');
        }
        $set = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($fields)));
        q("UPDATE products SET $set WHERE ProductID = :id", $fields + ['id' => $id]);
    } else {
        $cols = implode(', ', array_keys($fields));
        $vals = implode(', ', array_map(fn($k) => ":$k", array_keys($fields)));
        q("INSERT INTO products ($cols) VALUES ($vals)", $fields);
        $id = (int) db()->lastInsertId();
    }
    return get_product($id);
}
