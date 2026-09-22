<?php
declare(strict_types=1);
require_once __DIR__ . '/lib/AtlasMedia.php';

$config = AtlasMedia::config();
AtlasMedia::cors($config);
AtlasMedia::method();
$relative = isset($_GET['file']) && is_string($_GET['file']) ? $_GET['file'] : '';
$preset = isset($_GET['preset']) && is_string($_GET['preset']) ? $_GET['preset'] : '';
$version = isset($_GET['v']) && is_string($_GET['v']) ? $_GET['v'] : '';

try {
    if (!in_array($preset, ['original', 'micro', 'thumb', 'medium', 'large'], true)) throw new InvalidArgumentException('Invalid image size');
    [$source, $width, $height, $mtime, $size, $type] = AtlasMedia::sourceFor($config, $relative);
    $currentVersion = AtlasMedia::sourceVersion($source, $mtime, $size);
    if (!hash_equals($currentVersion, $version)) throw new OutOfBoundsException('Image version has changed');
    if ($preset === 'original') {
        $path = $source;
        $mime = match ($type) { IMAGETYPE_JPEG => 'image/jpeg', IMAGETYPE_PNG => 'image/png', IMAGETYPE_WEBP => 'image/webp' };
        $etag = '"' . hash('sha256', $relative . '|' . $currentVersion . '|original') . '"';
    } else {
        $path = AtlasMedia::generateDerivative($config, $relative, $version, $preset);
        $mime = 'image/webp';
        $etag = '"' . hash('sha256', $relative . '|' . $currentVersion . '|' . $preset) . '"';
    }
    header('Content-Type: ' . $mime);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('ETag: ' . $etag);
    header('X-Content-Type-Options: nosniff');
    if (trim($_SERVER['HTTP_IF_NONE_MATCH'] ?? '') === $etag) { http_response_code(304); exit; }
    header('Content-Length: ' . filesize($path));
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') readfile($path);
} catch (OutOfBoundsException $error) {
    AtlasMedia::error(404, 'Image not found');
} catch (InvalidArgumentException $error) {
    AtlasMedia::error(400, 'Invalid image request');
} catch (Throwable $error) {
    AtlasMedia::error(500, 'Unable to process image');
}
