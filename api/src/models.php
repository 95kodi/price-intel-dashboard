<?php
declare(strict_types=1);

/** GET a JSON document from the GoFix API. */
function gofix_get(string $path): array
{
    $url = rtrim(config()['model_api']['base_url'], '/') . $path;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 60,
        CURLOPT_HTTPHEADER     => ['Accept: application/json'],
    ]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $err = curl_error($ch);
    curl_close($ch);
    if ($body === false || $status !== 200) {
        throw new HttpError(502, "Model API $path failed: " . ($err ?: "HTTP $status"));
    }
    $data = json_decode($body, true);
    if (!is_array($data)) throw new HttpError(502, "Model API $path returned invalid JSON");
    return $data;
}

/** "Samsung Galaxy S26" + brand "Samsung" → "samsung galaxy s26"; used to spot duplicate models. */
function model_key(string $brand, string $model): string
{
    $m = strtolower(trim($model));
    $b = strtolower(trim($brand));
    if ($b !== '' && !str_starts_with($m, $b)) $m = "$b $m";
    return preg_replace('/\s+/', ' ', preg_replace('/[^a-z0-9+]+/', ' ', $m));
}

/**
 * Pulls GetModelList for the configured device types and upserts each model
 * as a product keyed on ExternalModelID. The model list repeats some models
 * under two ids (e.g. "Vivo X200 Pro"); only the lowest id is imported so
 * the scraper doesn't search the same phone twice.
 *
 * ItemName is only set on insert, and IsActive/CurrentPrice are never
 * touched, so edits made in the dashboard survive a re-sync.
 */
function run_model_sync(array $deviceIds): array
{
    $deviceIds = array_values(array_unique(array_map('intval', $deviceIds)));
    if (!$deviceIds) throw new HttpError(422, 'No device ids to sync');

    $devices = [];
    foreach (gofix_get('/GetDeviceList')['devices'] ?? [] as $d) {
        $devices[(int) $d['deviceId']] = $d['deviceName'];
    }
    $brands = [];
    foreach (gofix_get('/GetBrandList')['brands'] ?? [] as $b) {
        $brands[(int) $b['brandId']] = trim((string) $b['brandName']);
    }

    // The API currently ignores deviceId and returns every model, so filter
    // here as well rather than trusting the query string.
    $models = [];
    foreach ($deviceIds as $deviceId) {
        foreach (gofix_get('/GetModelList?deviceId=' . $deviceId)['models'] ?? [] as $m) {
            if ((int) $m['deviceId'] !== $deviceId) continue;
            $models[(int) $m['modelId']] = $m;
        }
    }
    ksort($models);

    $seen = [];
    $stats = ['fetched' => count($models), 'inserted' => 0, 'updated' => 0, 'unchanged' => 0, 'duplicates' => 0, 'not_in_catalogue' => 0];

    // Compare against what's stored and only write differences. (INSERT ...
    // ON DUPLICATE KEY UPDATE would burn an AUTO_INCREMENT id per existing
    // model on every sync.)
    $existing = [];
    foreach (q('SELECT ExternalModelID, Brand, ModelName, Category, LaunchDate FROM products WHERE ExternalModelID IS NOT NULL')->fetchAll() as $r) {
        $existing[(int) $r['ExternalModelID']] = $r;
    }
    // Off by default: the catalogue is a chosen list of models (the 317 phones
    // from wb_models), so the sync only refreshes those and never adds more.
    $importNew = !empty(config()['model_api']['import_new_models']);
    $insert = db()->prepare(
        'INSERT INTO products (ExternalModelID, ItemCode, Brand, ModelName, ItemName, Category, LaunchDate)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $update = db()->prepare(
        'UPDATE products SET Brand = ?, ModelName = ?, Category = ?, LaunchDate = ? WHERE ExternalModelID = ?'
    );

    db()->beginTransaction();
    try {
        foreach ($models as $id => $m) {
            $brand = mb_substr($brands[(int) $m['brandId']] ?? '', 0, 100);
            $name = mb_substr(trim((string) $m['modelName']), 0, 255);
            if ($name === '') continue;

            $key = model_key($brand, $name);
            if (isset($seen[$key])) {
                $stats['duplicates']++;
                continue;
            }
            $seen[$key] = true;

            $category = mb_substr($devices[(int) $m['deviceId']] ?? '', 0, 100);
            $launch = isset($m['launchDate']) ? substr((string) $m['launchDate'], 0, 10) : null;
            $old = $existing[$id] ?? null;

            if ($old === null) {
                if (!$importNew) {
                    $stats['not_in_catalogue']++;
                    continue;
                }
                $insert->execute([$id, 'GF-' . $id, $brand, $name, $name, $category, $launch]);
                $stats['inserted']++;
            } elseif ([$old['Brand'], $old['ModelName'], $old['Category'], $old['LaunchDate']] !== [$brand, $name, $category, $launch]) {
                $update->execute([$brand, $name, $category, $launch, $id]);
                $stats['updated']++;
            } else {
                $stats['unchanged']++;
            }
        }
        db()->commit();
    } catch (Throwable $e) {
        db()->rollBack();
        throw $e;
    }

    return ['success' => true, 'deviceIds' => $deviceIds] + $stats;
}

/** POST /models/sync  {"deviceIds":[1]} — token protected; body optional. */
function sync_models(): array
{
    require_scrape_token();
    $b = read_json();
    return run_model_sync($b['deviceIds'] ?? config()['model_api']['device_ids'] ?? [1]);
}
