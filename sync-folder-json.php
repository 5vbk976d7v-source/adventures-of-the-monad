<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/AtlasMedia.php';

$config = AtlasMedia::config();
header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!is_string($origin) || !hash_equals((string)($config['sync_origin'] ?? ''), $origin)) {
    http_response_code(403);
    exit('Forbidden');
}

function syncPage(int $status, string $message): never
{
    http_response_code($status);
    $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Atlas metadata sync</title><style>body{margin:0;background:#071018;color:#dffaff;font:16px system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}'
        . 'main{width:min(34rem,calc(100% - 3rem));border:1px solid #287382;padding:2rem;background:#0a1821}h1{font-size:1.2rem;letter-spacing:.08em;text-transform:uppercase}'
        . 'p{line-height:1.55;color:#b9ced2}label{display:block;margin:1.5rem 0 .5rem}input,button{box-sizing:border-box;width:100%;padding:.8rem;background:#071018;color:#eaffff;border:1px solid #428996;font:inherit}'
        . 'button{margin-top:1rem;cursor:pointer;background:#12313a}</style><main><h1>Atlas metadata sync</h1><p>' . $safeMessage . '</p>'
        . '<form method="post"><label for="token">Maintenance token</label><input id="token" name="token" type="password" autocomplete="current-password" required>'
        . '<button type="submit">Sync category image lists</button></form></main></html>';
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    if (!is_string($config['sync_token'] ?? null) || trim($config['sync_token']) === '') {
        syncPage(503, 'Resync is disabled. Configure a private sync_token in media-config.local.php first.');
    }
    syncPage(200, 'Reconcile each folder.json image list with the files currently present. Existing metadata for files that remain is preserved.');
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    syncPage(405, 'Use this page in a browser to request a metadata resync.');
}

$expected = is_string($config['sync_token'] ?? null) ? $config['sync_token'] : '';
$provided = is_string($_POST['token'] ?? null) ? $_POST['token'] : '';
if ($expected === '' || !hash_equals($expected, $provided)) syncPage(403, 'The maintenance token is invalid.');

$operation = $_POST['operation'] ?? 'folders';
if (!in_array($operation, ['folders', 'youtube'], true)) syncPage(400, 'Unknown sync action.');

try {
    AtlasMedia::ensureState($config);
    $lock = fopen($config['state_dir'] . '/catalog.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Unable to lock catalog');
    try {
        $updated = $operation === 'youtube' ? AtlasMedia::syncYoutubeMap($config) : AtlasMedia::syncFolderJson($config);
        $cacheFile = $config['state_dir'] . '/catalog.json';
        clearstatcache(true, $cacheFile);
        if (is_file($cacheFile) && !unlink($cacheFile)) throw new RuntimeException('Unable to invalidate catalog cache');
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    $message = $operation === 'youtube' ? "Added {$updated} missing video map entries." : "Updated {$updated} category metadata file(s).";
    syncPage(200, "Resync complete. {$message} The catalog cache was cleared.");
} catch (Throwable) {
    syncPage(500, 'Resync failed. Check the category metadata, YouTube map syntax and URLs, and write permissions, then try again.');
}
