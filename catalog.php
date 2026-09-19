<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=30, must-revalidate');
header('X-Content-Type-Options: nosniff');

const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

$imagesRoot = realpath(__DIR__ . '/images');
if ($imagesRoot === false || !is_dir($imagesRoot)) {
    http_response_code(500);
    echo json_encode(['error' => 'Image directory unavailable', 'collections' => []], JSON_UNESCAPED_SLASHES);
    exit;
}

function urlPath(string $relative): string {
    $parts = array_filter(explode('/', str_replace('\\', '/', $relative)), static fn($p) => $p !== '');
    return implode('/', array_map('rawurlencode', $parts));
}

function titleCase(string $value): string {
    return function_exists('mb_convert_case')
        ? mb_convert_case($value, MB_CASE_TITLE, 'UTF-8')
        : ucwords($value);
}

function safeJsonFile(string $file): array {
    if (!is_file($file) || is_link($file) || filesize($file) > 65536) return [];
    $raw = file_get_contents($file);
    if ($raw === false) return [];
    $data = json_decode($raw, true, 32, JSON_INVALID_UTF8_SUBSTITUTE);
    return is_array($data) ? $data : [];
}

function imageRecord(string $root, string $collectionDir, string $filename, string $collectionId, int $index): ?array {
    $source = realpath($collectionDir . DIRECTORY_SEPARATOR . $filename);
    if ($source === false || !is_file($source) || is_link($source)) return null;
    if (!str_starts_with($source, $root . DIRECTORY_SEPARATOR)) return null;

    $ext = strtolower(pathinfo($source, PATHINFO_EXTENSION));
    if (!in_array($ext, ALLOWED_EXTENSIONS, true)) return null;

    $relative = ltrim(str_replace('\\', '/', substr($source, strlen($root))), '/');
    $relativeEncoded = urlPath($relative);
    $base = pathinfo($filename, PATHINFO_FILENAME);
    $display = preg_replace('/^DALL.{0,16}\s+\d{4}-\d{2}-\d{2}\s+\d{2}[.:]\d{2}[.:]\d{2}\s*-\s*/iu', '', $base) ?: $base;
    $patterns = [
        '/(?:concept(?:\s+of)?|statement)\s*[_:]*\s*[\'"_]+([^\'"_]{3,90})/iu',
        '/represent(?:ing|s)?\s+[\'"_]+([^\'"_]{3,90})/iu',
    ];
    foreach ($patterns as $pattern) {
        if (preg_match($pattern, $display, $m) === 1 && isset($m[1])) {
            $display = trim($m[1]);
            break;
        }
    }
    $display = preg_replace('/^[0-9]+[-_. ]*/', '', $display) ?: $display;
    $display = trim(str_replace(['-', '_'], ' ', $display));
    if (function_exists('mb_strlen') && mb_strlen($display, 'UTF-8') > 92) {
        $display = rtrim(mb_substr($display, 0, 89, 'UTF-8')) . '…';
    } elseif (strlen($display) > 92) {
        $display = rtrim(substr($display, 0, 89)) . '...';
    }
    $display = titleCase($display);

    $dimensions = @getimagesize($source);
    $width = is_array($dimensions) ? (int)$dimensions[0] : 0;
    $height = is_array($dimensions) ? (int)$dimensions[1] : 0;

    return [
        'id' => $collectionId . '.' . str_pad((string)($index + 1), 2, '0', STR_PAD_LEFT),
        'title' => $display,
        'caption' => '',
        'width' => $width,
        'height' => $height,
        'original' => 'images/' . $relativeEncoded,
        'micro' => 'cache/micro/' . $relativeEncoded . '.webp',
        'thumb' => 'cache/thumb/' . $relativeEncoded . '.webp',
        'large' => 'cache/large/' . $relativeEncoded . '.webp',
        '_filename' => $filename,
    ];
}

$collections = [];
$entries = scandir($imagesRoot);
if ($entries === false) $entries = [];

foreach ($entries as $folder) {
    if ($folder === '.' || $folder === '..' || str_starts_with($folder, '.')) continue;
    $dir = $imagesRoot . DIRECTORY_SEPARATOR . $folder;
    if (!is_dir($dir) || is_link($dir)) continue;

    $meta = safeJsonFile($dir . DIRECTORY_SEPARATOR . 'folder.json');
    $numericPrefix = null;
    if (preg_match('/^(\d{1,3})/', $folder, $m)) $numericPrefix = (int)$m[1];
    $order = isset($meta['order']) && is_numeric($meta['order']) ? (int)$meta['order'] : ($numericPrefix ?? 9999);
    $metaId = isset($meta['id']) && (is_string($meta['id']) || is_numeric($meta['id'])) ? trim((string)$meta['id']) : '';
    $idValue = $metaId !== '' ? $metaId : (string)($numericPrefix ?? (count($collections) + 1));
    $id = preg_match('/^\d+$/', $idValue) === 1 ? str_pad($idValue, 2, '0', STR_PAD_LEFT) : $idValue;

    $rawTitle = isset($meta['title']) && is_string($meta['title']) ? trim($meta['title']) : '';
    if ($rawTitle === '') {
        $rawTitle = preg_replace('/^\d+[-_. ]*/', '', $folder) ?: $folder;
        $rawTitle = trim(str_replace(['-', '_'], ' ', $rawTitle));
        $rawTitle = titleCase($rawTitle);
    }

    $files = array_values(array_filter(scandir($dir) ?: [], static function(string $file) use ($dir): bool {
        if ($file === '.' || $file === '..' || str_starts_with($file, '.')) return false;
        $path = $dir . DIRECTORY_SEPARATOR . $file;
        if (!is_file($path) || is_link($path)) return false;
        $ext = strtolower(pathinfo($file, PATHINFO_EXTENSION));
        return in_array($ext, ALLOWED_EXTENSIONS, true);
    }));
    natcasesort($files);
    $files = array_values($files);

    $images = [];
    foreach ($files as $i => $file) {
        $record = imageRecord($imagesRoot, $dir, $file, $id, $i);
        if ($record !== null) $images[] = $record;
    }

    if ($images === []) continue;

    $coverFilename = isset($meta['cover']) && is_string($meta['cover']) ? basename($meta['cover']) : '';
    $cover = $images[0];
    $coverMatched = false;
    if ($coverFilename !== '') {
        foreach ($images as $image) {
            if (($image['_filename'] ?? '') === $coverFilename) { $cover = $image; $coverMatched = true; break; }
        }
    }
    if (!$coverMatched) {
        foreach ($images as $image) {
            if (preg_match('/^00[-_. ]*cover\.(png|jpe?g|webp)$/i', (string)($image['_filename'] ?? '')) === 1) {
                $cover = $image;
                break;
            }
        }
    }

    foreach ($images as &$image) unset($image['_filename']);
    unset($image);
    unset($cover['_filename']);

    $collections[] = [
        'id' => $id,
        'title' => $rawTitle,
        'description' => isset($meta['description']) && is_string($meta['description']) ? trim($meta['description']) : '',
        'order' => $order,
        'cover' => $cover,
        'images' => $images,
    ];
}

usort($collections, static fn(array $a, array $b): int => ($a['order'] <=> $b['order']) ?: strnatcasecmp($a['title'], $b['title']));
$collections = array_slice($collections, 0, 16);

echo json_encode([
    'generatedAt' => gmdate(DATE_ATOM),
    'collections' => $collections,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
