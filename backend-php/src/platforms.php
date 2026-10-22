<?php
declare(strict_types=1);

function platform_row(array $r): array
{
    return [
        'PlatformID'    => (int) $r['PlatformID'],
        'PlatformCode'  => $r['PlatformCode'],
        'PlatformName'  => $r['PlatformName'],
        'BaseURL'       => $r['BaseURL'],
        'CollectorType' => $r['CollectorType'],
        'IsEnabled'     => (bool) $r['IsEnabled'],
    ];
}

/** GET /platforms/ — a bare array, like the old API. */
function list_platforms(): array
{
    return array_map('platform_row', q('SELECT * FROM platforms ORDER BY PlatformID')->fetchAll());
}

function get_platform(int $id): array
{
    $row = q('SELECT * FROM platforms WHERE PlatformID = ?', [$id])->fetch();
    if (!$row) throw new HttpError(404, 'Platform not found');
    return platform_row($row);
}

/** All platforms keyed by id, with ColumnKey — used by comparison and scrape code. */
function platforms_by_id(): array
{
    $out = [];
    foreach (q('SELECT * FROM platforms ORDER BY PlatformID')->fetchAll() as $r) {
        $out[(int) $r['PlatformID']] = $r;
    }
    return $out;
}

/** POST /platforms/save — PlatformID 0 creates. */
function save_platform(): array
{
    $b = read_json();
    $id = (int) ($b['PlatformID'] ?? 0);
    $name = str_val($b['PlatformName'] ?? '', 100);
    if ($name === '') throw new HttpError(422, 'PlatformName is required');
    $code = strtoupper(str_val($b['PlatformCode'] ?? '', 32));
    if ($code === '') $code = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', $name));

    $fields = [
        'PlatformCode'  => $code,
        'PlatformName'  => $name,
        'BaseURL'       => str_val($b['BaseURL'] ?? ''),
        'CollectorType' => str_val($b['CollectorType'] ?? 'http', 32) ?: 'http',
        'IsEnabled'     => bool_val($b['IsEnabled'] ?? null) ? 1 : 0,
    ];

    try {
        if ($id > 0) {
            if (!q('SELECT 1 FROM platforms WHERE PlatformID = ?', [$id])->fetchColumn()) {
                throw new HttpError(404, 'Platform not found');
            }
            // ColumnKey is left alone on update: the dashboard's comparison
            // columns are keyed on it.
            $set = implode(', ', array_map(fn($k) => "$k = :$k", array_keys($fields)));
            q("UPDATE platforms SET $set WHERE PlatformID = :id", $fields + ['id' => $id]);
        } else {
            $fields['ColumnKey'] = preg_replace('/[^A-Za-z0-9]/', '', $name);
            $cols = implode(', ', array_keys($fields));
            $vals = implode(', ', array_map(fn($k) => ":$k", array_keys($fields)));
            q("INSERT INTO platforms ($cols) VALUES ($vals)", $fields);
            $id = (int) db()->lastInsertId();
        }
    } catch (PDOException $e) {
        if ($e->getCode() === '23000') throw new HttpError(409, "Platform code $code is already used");
        throw $e;
    }
    return get_platform($id);
}
