<?php
/**
 * Price Intel API — PHP front controller for Hostinger.
 *
 * Mirrors the routes the dashboard and desktop agent already call on the old
 * backend (products, platforms, product-platform-url, price-comparison,
 * price history), plus token-protected routes for the GoFix model sync and
 * the GitHub Actions scraper.
 */
declare(strict_types=1);

require __DIR__ . '/src/bootstrap.php';
require __DIR__ . '/src/products.php';
require __DIR__ . '/src/platforms.php';
require __DIR__ . '/src/urls.php';
require __DIR__ . '/src/prices.php';
require __DIR__ . '/src/models.php';
require __DIR__ . '/src/scrape.php';

/** Path relative to wherever this folder is mounted (e.g. /api). */
function request_path(): string
{
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    // Apache rewrites to /api/index.php, so SCRIPT_NAME's folder is the mount
    // point. PHP's built-in server reports the request path instead; ignore it.
    $script = $_SERVER['SCRIPT_NAME'] ?? '';
    $base = str_ends_with($script, '/index.php') ? rtrim(dirname($script), '/\\') : '';
    if ($base !== '' && str_starts_with($path, $base)) $path = substr($path, strlen($base));
    if (str_starts_with($path, '/index.php')) $path = substr($path, strlen('/index.php'));
    return '/' . trim($path, '/');
}

$routes = [
    ['GET',  '#^/$#',                                     fn() => ['success' => true, 'service' => 'price-intel-api']],
    ['GET',  '#^/health$#',                               'health'],

    ['GET',  '#^/products$#',                             'list_products'],
    ['POST', '#^/products/save$#',                        'save_product'],
    ['GET',  '#^/products/(\d+)$#',                       'get_product'],

    ['GET',  '#^/platforms$#',                            'list_platforms'],
    ['POST', '#^/platforms/save$#',                       'save_platform'],
    ['GET',  '#^/platforms/(\d+)$#',                      'get_platform'],

    ['GET',  '#^/product-platform-url/all$#',             'get_all_product_urls'],
    ['GET',  '#^/product-platform-url/product/(\d+)$#',   'get_product_urls'],
    ['POST', '#^/product-platform-url/save$#',            'save_product_url'],
    ['POST', '#^/urlmap/update-url$#',                    'update_url'],

    ['GET',  '#^/price-comparison$#',                     'price_comparison'],
    ['GET',  '#^/platform-price-history/product/(\d+)$#', 'latest_prices_for_product'],
    ['POST', '#^/platform-price-history/save$#',          'save_price'],
    ['POST', '#^/platform-price-history/save-batch$#',    'save_price_batch'],
    ['GET',  '#^/price-history/product/(\d+)$#',          'price_history_for_product'],

    ['POST', '#^/models/sync$#',                          'sync_models'],
    ['GET',  '#^/scrape/jobs$#',                          'scrape_jobs'],
    ['POST', '#^/scrape/results$#',                       'scrape_results'],
];

function health(): array
{
    q('SELECT 1');
    return ['success' => true, 'db' => 'ok', 'time' => date('c')];
}

try {
    cors();
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $path = request_path();
    $pathMatched = false;
    foreach ($routes as [$verb, $pattern, $handler]) {
        if (!preg_match($pattern, $path, $m)) continue;
        $pathMatched = true;
        if ($verb !== $method) continue;
        $args = array_map('intval', array_slice($m, 1));
        send_json($handler(...$args));
    }
    throw new HttpError($pathMatched ? 405 : 404, $pathMatched ? 'Method not allowed' : "No route for $path");
} catch (HttpError $e) {
    send_json(['success' => false, 'message' => $e->getMessage()], $e->status);
} catch (Throwable $e) {
    // Details go to the PHP error log only: DB errors can name users/hosts.
    error_log('[price-intel] ' . $e);
    send_json(['success' => false, 'message' => 'Server error — see the PHP error log'], 500);
}
