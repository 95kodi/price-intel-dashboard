<?php
/**
 * CLI: import/refresh phone models from GoFix GetModelList.
 *
 * Hostinger hPanel → Advanced → Cron Jobs (e.g. daily at 02:00):
 *   /usr/bin/php /home/<user>/domains/<domain>/public_html/api/cron/sync-models.php
 *
 * The GitHub Actions scraper also calls POST /models/sync before each run,
 * so this cron is optional.
 */
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(403);
    exit;
}

require dirname(__DIR__) . '/src/bootstrap.php';
require dirname(__DIR__) . '/src/models.php';

try {
    $deviceIds = array_slice($argv, 1) ?: (config()['model_api']['device_ids'] ?? [1]);
    echo json_encode(run_model_sync($deviceIds), JSON_PRETTY_PRINT), "\n";
} catch (Throwable $e) {
    fwrite(STDERR, 'Model sync failed: ' . $e->getMessage() . "\n");
    exit(1);
}
