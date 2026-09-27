<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/AtlasMedia.php';

$config = AtlasMedia::config();
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'");
header('X-Content-Type-Options: nosniff');
$accept = $_SERVER['HTTP_ACCEPT'] ?? '';
$wantsJson = is_string($accept) && str_contains($accept, 'application/json');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!is_string($origin) || !hash_equals((string)($config['sync_origin'] ?? ''), $origin)) {
    syncPage(403, 'Forbidden');
}

function syncPage(int $status, string $message, array $report = []): never
{
    global $wantsJson;
    http_response_code($status);
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode([
            'ok' => $status >= 200 && $status < 300,
            'message' => $message,
        ] + $report, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        exit;
    }
    header('Content-Type: text/html; charset=utf-8');
    $safeMessage = htmlspecialchars($message, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    echo '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<title>Atlas metadata sync</title><style>body{margin:0;background:#071018;color:#dffaff;font:16px system-ui,sans-serif;display:grid;min-height:100vh;place-items:center}'
        . 'main{width:min(34rem,calc(100% - 3rem));border:1px solid #287382;padding:2rem;background:#0a1821}h1{font-size:1.2rem;letter-spacing:.08em;text-transform:uppercase}'
        . 'p{line-height:1.55;color:#b9ced2}label{display:block;margin:1.5rem 0 .5rem}input,button{box-sizing:border-box;width:100%;padding:.8rem;background:#071018;color:#eaffff;border:1px solid #428996;font:inherit}'
        . 'button{margin-top:1rem;cursor:pointer;background:#12313a}</style><main><h1>Atlas metadata sync</h1><p>' . $safeMessage . '</p>'
        . '<form method="post"><label for="token">Maintenance token</label><input id="token" name="token" type="password" autocomplete="current-password" required>'
        . '<button type="submit">Import Git diagrams and sync Atlas media</button></form></main></html>';
    exit;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    if (!is_string($config['sync_token'] ?? null) || trim($config['sync_token']) === '') {
        syncPage(503, 'Resync is disabled. Configure a private sync_token in media-config.local.php first.');
    }
    syncPage(200, 'Import new Git diagrams, refresh folder metadata, and merge missing YouTube links. Existing live files and links are preserved.');
}
if ($method !== 'POST') {
    header('Allow: GET, POST');
    syncPage(405, 'Use this page in a browser to request a metadata resync.');
}

$expected = is_string($config['sync_token'] ?? null) ? $config['sync_token'] : '';
$provided = is_string($_POST['token'] ?? null) ? $_POST['token'] : '';
if ($expected === '' || !hash_equals($expected, $provided)) syncPage(403, 'The maintenance token is invalid.');

try {
    AtlasMedia::ensureState($config);
    $lock = fopen($config['state_dir'] . '/catalog.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Unable to lock catalog');
    try {
        $imported = AtlasMedia::importGitDiagrams($config);
        $updated = AtlasMedia::syncFolderJson($config);
        $merged = AtlasMedia::mergeGitYoutubeMap($config);
        $videoEntries = AtlasMedia::syncYoutubeMap($config, true);
        $cacheFile = $config['state_dir'] . '/catalog.json';
        clearstatcache(true, $cacheFile);
        if (is_file($cacheFile) && !unlink($cacheFile)) throw new RuntimeException('Unable to invalidate catalog cache');
    } finally {
        flock($lock, LOCK_UN);
        fclose($lock);
    }
    $categoryLabel = $imported['categories'] === 1 ? 'category' : 'categories';
    $mapUpdates = $merged['updates'];
    foreach ($videoEntries['entries'] as $key) $mapUpdates[] = ['type' => 'blank-section', 'key' => $key];
    syncPage(200, "Sync complete. Imported {$imported['images']} new image(s) in {$imported['categories']} new {$categoryLabel}. Updated {$updated} metadata file(s). Added {$merged['links']} YouTube link(s), {$merged['sections']} map section(s), and {$videoEntries['sections']} blank video section(s). The catalog cache was cleared.", [
        'summary' => [
            'images' => $imported['images'],
            'categories' => $imported['categories'],
            'metadata' => $updated,
            'map_links' => $merged['links'],
            'map_sections' => $merged['sections'],
            'blank_map_sections' => $videoEntries['sections'],
        ],
        'imported_files' => $imported['files'],
        'map_updates' => $mapUpdates,
    ]);
} catch (Throwable) {
    syncPage(500, 'Sync failed. Check the Git source folder, YouTube map syntax and URLs, and write permissions, then try again.');
}
