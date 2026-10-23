<?php
declare(strict_types=1);

date_default_timezone_set('Asia/Kolkata');

final class HttpError extends RuntimeException
{
    public function __construct(public readonly int $status, string $message)
    {
        parent::__construct($message);
    }
}

function config(): array
{
    static $config = null;
    if ($config === null) {
        $candidates = [
            getenv('PRICE_INTEL_CONFIG') ?: null,
            // Next to public_html (…/domains/<domain>/price-intel-config.php):
            // outside the web root, and Git deploys into public_html never touch it.
            dirname(__DIR__, 3) . '/price-intel-config.php',
            dirname(__DIR__) . '/config.php',
        ];
        foreach ($candidates as $file) {
            if ($file && is_file($file)) {
                $config = require $file;
                break;
            }
        }
        if ($config === null) {
            throw new HttpError(500, 'No config found — copy config.sample.php to price-intel-config.php next to public_html');
        }
    }
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $c = config()['db'];
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $c['host'], $c['port'] ?? 3306, $c['name']);
        $pdo = new PDO($dsn, $c['user'], $c['password'], [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
        // Keep NOW()/CURRENT_TIMESTAMP in IST to match PHP's clock.
        $pdo->exec("SET time_zone = '+05:30'");
    }
    return $pdo;
}

/** Runs a prepared statement and returns it. */
function q(string $sql, array $params = []): PDOStatement
{
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt;
}

function send_json(mixed $data, int $status = 200): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRESERVE_ZERO_FRACTION);
    exit;
}

function read_json(): array
{
    $raw = file_get_contents('php://input') ?: '';
    if ($raw === '') return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) throw new HttpError(400, 'Request body must be a JSON object');
    return $data;
}

function cors(): void
{
    $origin = config()['cors_origin'] ?? '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Scrape-Token');
    header('Access-Control-Max-Age: 86400');
}

/** Scraper endpoints write in bulk, so they need the shared token. */
function require_scrape_token(): void
{
    $expected = (string) (config()['scrape_token'] ?? '');
    if ($expected === '' || str_starts_with($expected, 'change-me')) {
        throw new HttpError(503, 'scrape_token is not configured in config.php');
    }
    $given = $_SERVER['HTTP_X_SCRAPE_TOKEN'] ?? '';
    if ($given === '' && preg_match('/^Bearer\s+(.+)$/i', $_SERVER['HTTP_AUTHORIZATION'] ?? '', $m)) {
        $given = $m[1];
    }
    if (!hash_equals($expected, $given)) throw new HttpError(401, 'Invalid scrape token');
}

// ---- value helpers -------------------------------------------------------

function int_or_null(mixed $v): ?int
{
    return $v === null || $v === '' ? null : (int) $v;
}

function num_or_null(mixed $v): ?float
{
    if ($v === null || $v === '') return null;
    $f = (float) $v;
    return $f > 0 ? $f : null;
}

function str_val(mixed $v, int $max = 255): string
{
    return mb_substr(trim((string) ($v ?? '')), 0, $max);
}

function bool_val(mixed $v, bool $default = true): bool
{
    if ($v === null) return $default;
    if (is_bool($v)) return $v;
    return in_array(strtolower((string) $v), ['1', 'true', 'yes'], true);
}

/** DATETIME → "2026-10-22T14:05:00" (IST, no offset — what the old API returned). */
function iso(?string $dt): ?string
{
    return $dt === null ? null : str_replace(' ', 'T', $dt);
}

function valid_url(string $url): bool
{
    return (bool) filter_var($url, FILTER_VALIDATE_URL) && preg_match('#^https?://#i', $url);
}

/** MySQL DECIMAL arrives as a string; the dashboard wants numbers. */
function money(mixed $v): ?float
{
    return $v === null ? null : (float) $v;
}
