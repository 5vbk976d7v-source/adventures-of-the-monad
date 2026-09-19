<?php
declare(strict_types=1);

header('X-Content-Type-Options: nosniff');

const PRESETS = [
    'micro' => ['max' => 320,  'quality' => 68],
    'thumb' => ['max' => 640,  'quality' => 74],
    'large' => ['max' => 1600, 'quality' => 82],
];
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
const MAX_PIXELS = 40000000;

$sourceRoot = realpath(__DIR__ . '/images');
$cacheRoot = __DIR__ . '/cache';
$presetName = isset($_GET['size']) && is_string($_GET['size']) ? $_GET['size'] : '';
$file = isset($_GET['file']) && is_string($_GET['file']) ? $_GET['file'] : '';

if ($sourceRoot === false || !isset(PRESETS[$presetName])) {
    http_response_code(400);
    exit('Invalid request');
}
if ($file === '' || str_contains($file, "\0") || str_starts_with($file, '/') || str_contains($file, '\\')) {
    http_response_code(400);
    exit('Invalid file');
}

$source = realpath($sourceRoot . DIRECTORY_SEPARATOR . $file);
if ($source === false || !is_file($source) || is_link($source) || !str_starts_with($source, $sourceRoot . DIRECTORY_SEPARATOR)) {
    http_response_code(404);
    exit('Not found');
}

$extension = strtolower(pathinfo($source, PATHINFO_EXTENSION));
if (!in_array($extension, ALLOWED_EXTENSIONS, true)) {
    http_response_code(415);
    exit('Unsupported image');
}

$info = @getimagesize($source);
if (!is_array($info) || $info[0] <= 0 || $info[1] <= 0 || ((int)$info[0] * (int)$info[1]) > MAX_PIXELS) {
    http_response_code(415);
    exit('Image rejected');
}

$relative = ltrim(str_replace('\\', '/', substr($source, strlen($sourceRoot))), '/');
$destination = $cacheRoot . '/' . $presetName . '/' . $relative . '.webp';
$destinationDir = dirname($destination);
if (!is_dir($destinationDir) && !mkdir($destinationDir, 0755, true) && !is_dir($destinationDir)) {
    http_response_code(500);
    exit('Cache unavailable');
}

function serve(string $path): never {
    header('Content-Type: image/webp');
    header('Content-Length: ' . filesize($path));
    header('Cache-Control: public, max-age=31536000, immutable');
    readfile($path);
    exit;
}

if (is_file($destination) && filemtime($destination) >= filemtime($source)) serve($destination);

$lockPath = $destination . '.lock';
$lock = fopen($lockPath, 'c');
if ($lock === false || !flock($lock, LOCK_EX)) {
    http_response_code(503);
    exit('Image service busy');
}

clearstatcache(true, $destination);
if (is_file($destination) && filemtime($destination) >= filemtime($source)) {
    flock($lock, LOCK_UN); fclose($lock); @unlink($lockPath); serve($destination);
}

$preset = PRESETS[$presetName];
$max = $preset['max'];
$quality = $preset['quality'];
$temp = $destination . '.tmp-' . getmypid();
$ok = false;

try {
    if (class_exists('Imagick')) {
        $image = new Imagick();
        $image->setResourceLimit(Imagick::RESOURCETYPE_MEMORY, 128);
        $image->setResourceLimit(Imagick::RESOURCETYPE_MAP, 256);
        $image->readImage($source);
        if (method_exists($image, 'autoOrient')) $image->autoOrient();
        $image->stripImage();
        $image->thumbnailImage($max, $max, true, true);
        $image->setImageFormat('webp');
        $image->setImageCompressionQuality($quality);
        $ok = $image->writeImage($temp);
        $image->clear();
        $image->destroy();
    } elseif (function_exists('imagewebp')) {
        [$width, $height] = [(int)$info[0], (int)$info[1]];
        $ratio = min(1, $max / max($width, $height));
        $newW = max(1, (int)round($width * $ratio));
        $newH = max(1, (int)round($height * $ratio));

        $src = match ($extension) {
            'png' => function_exists('imagecreatefrompng') ? @imagecreatefrompng($source) : false,
            'jpg', 'jpeg' => function_exists('imagecreatefromjpeg') ? @imagecreatefromjpeg($source) : false,
            'webp' => function_exists('imagecreatefromwebp') ? @imagecreatefromwebp($source) : false,
            default => false,
        };
        if ($src !== false) {
            $dst = imagecreatetruecolor($newW, $newH);
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $newW, $newH, $transparent);
            $resampled = imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $width, $height);
            $ok = $resampled && imagewebp($dst, $temp, $quality);
            imagedestroy($dst);
            imagedestroy($src);
        }
    } else {
        http_response_code(503);
        echo 'Server requires Imagick or GD with WebP support';
    }

    if ($ok && is_file($temp)) {
        chmod($temp, 0644);
        if (!rename($temp, $destination)) $ok = false;
    }
} finally {
    if (is_file($temp)) @unlink($temp);
    flock($lock, LOCK_UN);
    fclose($lock);
    @unlink($lockPath);
}

if (!$ok || !is_file($destination)) {
    http_response_code(503);
    exit('Derivative generation failed');
}
serve($destination);
