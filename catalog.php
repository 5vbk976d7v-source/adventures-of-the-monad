<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/AtlasMedia.php';

$config = AtlasMedia::config();
AtlasMedia::cors($config);
AtlasMedia::method();
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=60, stale-while-revalidate=120');

try {
    AtlasMedia::ensureState($config);
    $cacheFile = $config['state_dir'] . '/catalog.json';
    $lock = fopen($config['state_dir'] . '/catalog.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Unable to refresh catalog');
    try {
        clearstatcache(true, $cacheFile);
        if (is_file($cacheFile) && time() - (int)filemtime($cacheFile) < (int)$config['catalog_ttl']) {
            $json = file_get_contents($cacheFile);
        } else {
            try {
                $catalog = AtlasMedia::buildCatalog($config);
                AtlasMedia::cleanupCache($config);
                $json = json_encode($catalog, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR) . "\n";
                $tmp = $cacheFile . '.' . bin2hex(random_bytes(5)) . '.tmp';
                if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $cacheFile)) {
                    @unlink($tmp);
                    throw new RuntimeException('Unable to save catalog cache');
                }
                @chmod($cacheFile, 0640);
            } catch (Throwable $refreshError) {
                if (!is_file($cacheFile)) throw $refreshError;
                $json = file_get_contents($cacheFile);
                header('Warning: 110 - "Serving stale Atlas catalog"');
            }
        }
        if (!is_string($json)) throw new RuntimeException('Unable to read catalog cache');
    } finally { flock($lock, LOCK_UN); fclose($lock); }
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') echo $json;
} catch (Throwable $error) {
    AtlasMedia::error(503, 'The Atlas catalog is temporarily unavailable');
}
