<?php
declare(strict_types=1);

final class AtlasMedia
{
    private static function titleCase(string $value): string
    {
        return function_exists('mb_convert_case')
            ? mb_convert_case($value, MB_CASE_TITLE, 'UTF-8') : ucwords(strtolower($value));
    }

    public static function config(): array
    {
        $defaults = require dirname(__DIR__) . '/media-config.php';
        $local = dirname(__DIR__) . '/media-config.local.php';
        $overrides = is_file($local) ? require $local : [];
        $config = array_replace($defaults, is_array($overrides) ? $overrides : []);
        $config['diagram_dir'] = rtrim((string)$config['diagram_dir'], DIRECTORY_SEPARATOR);
        $config['state_dir'] = rtrim((string)$config['state_dir'], DIRECTORY_SEPARATOR);
        $config['public_base_url'] = rtrim((string)$config['public_base_url'], '/');
        return $config;
    }

    public static function ensureState(array $config): void
    {
        if (!is_dir($config['state_dir']) && !mkdir($config['state_dir'], 0750, true) && !is_dir($config['state_dir'])) {
            throw new RuntimeException('Atlas media state directory is not writable');
        }
        if (!is_writable($config['state_dir'])) throw new RuntimeException('Atlas media state directory is not writable');
    }

    public static function cors(array $config): void
    {
        header('Vary: Origin');
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        if ($origin !== '' && in_array($origin, $config['allowed_origins'], true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Access-Control-Allow-Methods: GET, HEAD, OPTIONS');
            header('Access-Control-Allow-Headers: Accept, Content-Type');
            header('Access-Control-Max-Age: 600');
        }
    }

    public static function method(): void
    {
        if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') { http_response_code(204); exit; }
        if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
            header('Allow: GET, HEAD, OPTIONS');
            http_response_code(405);
            exit;
        }
    }

    public static function error(int $status, string $message): never
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo json_encode(['error' => $message], JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function safeId(string $value): bool
    {
        return (bool)preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $value);
    }

    public static function titleFromFilename(string $filename): string
    {
        $stem = pathinfo($filename, PATHINFO_FILENAME);
        $stem = preg_replace('/^\d+[_-]?/', '', $stem) ?? $stem;
        $stem = preg_replace('/[_-]+/', ' ', $stem) ?? $stem;
        return trim(self::titleCase($stem)) ?: 'Diagram';
    }

    public static function sourceVersion(string $path, int $mtime, int $size): string
    {
        return dechex($mtime) . '-' . dechex($size) . '-' . dechex((int)filectime($path)) . '-' . dechex((int)fileinode($path));
    }

    private static function natural(string $left, string $right): int
    {
        return strnatcasecmp($left, $right);
    }

    private static function folderTitle(string $folder): string
    {
        $title = preg_replace('/^\d+[_-]?/', '', $folder) ?? $folder;
        return trim(self::titleCase(str_replace(['-', '_'], ' ', $title))) ?: 'Category';
    }

    private static function validImageName(string $name): bool
    {
        return $name !== '' && $name[0] !== '.' && (bool)preg_match('/\.(png|jpe?g|webp)$/i', $name)
            && !preg_match('/\.(part|tmp|upload|crdownload)$/i', $name);
    }

    private static function sourceInfo(string $path, int $maxPixels): array
    {
        $real = realpath($path);
        if ($real === false || !is_file($real)) throw new RuntimeException('Image source is unavailable');
        $info = @getimagesize($real);
        if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) {
            throw new RuntimeException('Unsupported image source');
        }
        $width = (int)$info[0]; $height = (int)$info[1];
        if ($width < 1 || $height < 1 || $width * $height > $maxPixels) throw new RuntimeException('Image exceeds the pixel limit');
        $stat = stat($real);
        return [$real, $width, $height, (int)$stat['mtime'], (int)$stat['size'], (int)$info[2]];
    }

    private static function imageUrl(array $config, string $relative, string $version, string $preset): string
    {
        return $config['public_base_url'] . '/image.php?file=' . rawurlencode($relative)
            . '&preset=' . rawurlencode($preset) . '&v=' . rawurlencode($version);
    }

    private static function registry(string $filename): array
    {
        if (!is_file($filename)) return ['categories' => [], 'images' => []];
        $decoded = json_decode((string)file_get_contents($filename), true);
        if (!is_array($decoded)) throw new RuntimeException('The image ID registry is invalid');
        return ['categories' => is_array($decoded['categories'] ?? null) ? $decoded['categories'] : [],
            'images' => is_array($decoded['images'] ?? null) ? $decoded['images'] : []];
    }

    private static function persistRegistry(string $filename, array $registry): void
    {
        $tmp = $filename . '.' . bin2hex(random_bytes(5)) . '.tmp';
        $json = json_encode($registry, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR) . "\n";
        if (file_put_contents($tmp, $json, LOCK_EX) === false || !rename($tmp, $filename)) {
            @unlink($tmp);
            throw new RuntimeException('Unable to update image ID registry');
        }
        @chmod($filename, 0640);
    }

    public static function cleanupCache(array $config): void
    {
        $marker = $config['state_dir'] . '/cache-cleanup';
        if (is_file($marker) && time() - (int)filemtime($marker) < 86400) return;
        $removed = 0;
        foreach (['micro', 'thumb', 'medium', 'large'] as $preset) {
            $directory = $config['state_dir'] . '/cache/' . $preset;
            if (!is_dir($directory)) continue;
            foreach (@scandir($directory) ?: [] as $file) {
                if ($removed >= 200) break 2;
                if (!preg_match('/^[a-f0-9]{64}\.webp$/', $file)) continue;
                $path = $directory . '/' . $file;
                if (!is_link($path) && is_file($path) && time() - (int)filemtime($path) > 30 * 86400 && @unlink($path)) $removed++;
            }
        }
        @touch($marker);
    }

    private static function uniqueId(string $candidate, array $used): string
    {
        $candidate = preg_replace('/^\d+[_-]?/', '', $candidate) ?? $candidate;
        $base = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $candidate) ?? '', '-')) ?: 'diagram';
        if (!self::safeId($base)) $base = 'diagram';
        $id = $base; $suffix = 2;
        while (isset($used[$id])) $id = $base . '-' . $suffix++;
        return $id;
    }

    private static function imageRecord(array $config, string $folder, string $file, string $id, string $title,
        string $caption, int $maxPixels): array
    {
        $relative = 'diagrams/' . $folder . '/' . $file;
        [$real, $width, $height, $mtime, $size, $type] = self::sourceInfo($config['diagram_dir'] . '/' . $folder . '/' . $file, $maxPixels);
        if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
            $orientation = (int)((@exif_read_data($real)['Orientation'] ?? 1));
            if (in_array($orientation, [5, 6, 7, 8], true)) [$width, $height] = [$height, $width];
        }
        $version = self::sourceVersion($real, $mtime, $size);
        $record = ['id' => $id, 'title' => $title, 'caption' => $caption,
            'original' => self::imageUrl($config, $relative, $version, 'original'), 'width' => $width, 'height' => $height];
        foreach (['micro', 'thumb', 'medium', 'large'] as $preset) {
            $record[$preset] = self::imageUrl($config, $relative, $version, $preset);
        }
        return $record;
    }

    public static function buildCatalog(array $config): array
    {
        self::ensureState($config);
        $registryPath = $config['state_dir'] . '/ids.json';
        $registryLock = fopen($config['state_dir'] . '/ids.lock', 'c');
        if (!$registryLock || !flock($registryLock, LOCK_EX)) throw new RuntimeException('Unable to lock image ID registry');
        try {
            $registry = self::registry($registryPath);
            $root = realpath($config['diagram_dir']);
            if ($root === false || !is_dir($root)) throw new RuntimeException('Diagram directory is unavailable');
            $folders = [];
            foreach (scandir($root) ?: [] as $folder) {
                if ($folder === '.' || $folder === '..' || $folder[0] === '.') continue;
                $path = $root . DIRECTORY_SEPARATOR . $folder;
                if (is_link($path) || !is_dir($path)) continue;
                $folders[] = $folder;
            }
            usort($folders, [self::class, 'natural']);
            $collections = [];
            $usedCategoryIds = [];
            foreach ($folders as $folder) {
                $directory = $root . DIRECTORY_SEPARATOR . $folder;
                $metadataPath = $directory . '/folder.json';
                $metadata = [];
                if (is_file($metadataPath) && !is_link($metadataPath)) {
                    $metadata = json_decode((string)file_get_contents($metadataPath), true);
                    if (!is_array($metadata)) $metadata = [];
                }
                $oldCategoryId = (string)($registry['categories'][$folder] ?? '');
                $categoryId = self::safeId((string)($metadata['id'] ?? '')) ? (string)$metadata['id']
                    : (self::safeId($oldCategoryId) ? $oldCategoryId : self::uniqueId($folder, $usedCategoryIds));
                if (isset($usedCategoryIds[$categoryId])) throw new RuntimeException('Duplicate category ID in folder metadata');
                $usedCategoryIds[$categoryId] = true;
                $registry['categories'][$folder] = $categoryId;

                $files = [];
                foreach (scandir($directory) ?: [] as $file) {
                    if (!self::validImageName($file)) continue;
                    $source = $directory . DIRECTORY_SEPARATOR . $file;
                    if (is_link($source) || !is_file($source)) continue;
                    try { self::sourceInfo($source, (int)$config['max_pixels']); }
                    catch (RuntimeException) { continue; }
                    $files[] = $file;
                }
                usort($files, [self::class, 'natural']);
                if (!$files) continue;

                $listed = is_array($metadata['images'] ?? null) ? $metadata['images'] : [];
                $byFile = [];
                foreach ($listed as $item) {
                    if (!is_array($item) || !isset($item['file']) || !is_string($item['file'])) continue;
                    $byFile[$item['file']] = $item;
                }
                $ordered = [];
                foreach ($listed as $item) {
                    $file = is_array($item) ? ($item['file'] ?? '') : '';
                    if (is_string($file) && in_array($file, $files, true) && !in_array($file, $ordered, true)) $ordered[] = $file;
                }
                foreach ($files as $file) if (!in_array($file, $ordered, true)) $ordered[] = $file;

                $images = [];
                $imagesByFile = [];
                $usedImageIds = [];
                foreach ($ordered as $file) {
                    $key = $folder . '/' . $file;
                    $item = $byFile[$file] ?? [];
                    $registered = (string)($registry['images'][$key] ?? '');
                    $id = self::safeId((string)($item['id'] ?? '')) ? (string)$item['id']
                        : (self::safeId($registered) ? $registered : self::uniqueId(pathinfo($file, PATHINFO_FILENAME), $usedImageIds));
                    if (isset($usedImageIds[$id])) throw new RuntimeException('Duplicate diagram ID in folder metadata');
                    $usedImageIds[$id] = true;
                    $registry['images'][$key] = $id;
                    $title = is_string($item['title'] ?? null) && trim($item['title']) !== '' ? trim($item['title']) : self::titleFromFilename($file);
                    $caption = is_string($item['caption'] ?? null) ? trim($item['caption']) : '';
                    $record = self::imageRecord($config, $folder, $file, $id, $title, $caption, (int)$config['max_pixels']);
                    $images[] = $record;
                    $imagesByFile[$file] = $record;
                }
                $validFiles = array_keys($imagesByFile);
                if (!$validFiles) continue;
                $coverFile = is_string($metadata['cover'] ?? null) && in_array($metadata['cover'], $validFiles, true)
                    ? $metadata['cover'] : null;
                if ($coverFile === null) foreach ($validFiles as $file) {
                    if (preg_match('/^00[_-].+\.(png|jpe?g|webp)$/i', $file)) { $coverFile = $file; break; }
                }
                if ($coverFile === null) $coverFile = $validFiles[0];
                $cover = $imagesByFile[$coverFile] ?? null;
                $order = is_numeric($metadata['order'] ?? null) ? (float)$metadata['order'] : (float)(count($collections) + 1);
                $collections[] = ['id' => $categoryId,
                    'title' => is_string($metadata['title'] ?? null) && trim($metadata['title']) !== '' ? trim($metadata['title']) : self::folderTitle($folder),
                    'description' => is_string($metadata['description'] ?? null) ? trim($metadata['description']) : '',
                    'order' => $order, 'cover' => $cover, 'images' => $images];
            }
            usort($collections, static fn(array $a, array $b): int => $a['order'] <=> $b['order'] ?: strnatcasecmp($a['id'], $b['id']));
            self::persistRegistry($registryPath, $registry);
            return ['version' => 1, 'collections' => $collections];
        } finally {
            flock($registryLock, LOCK_UN);
            fclose($registryLock);
        }
    }

    public static function sourceFor(array $config, string $relative): array
    {
        if (str_contains($relative, "\0") || str_contains($relative, '\\')) throw new InvalidArgumentException('Invalid image path');
        $parts = explode('/', $relative);
        if (count($parts) < 3 || $parts[0] !== 'diagrams' || in_array('', $parts, true) || in_array('.', $parts, true) || in_array('..', $parts, true)) {
            throw new InvalidArgumentException('Invalid image path');
        }
        $candidate = $config['diagram_dir'] . '/' . implode('/', array_slice($parts, 1));
        $real = realpath($candidate); $root = realpath($config['diagram_dir']);
        if ($real === false || $root === false || !str_starts_with($real, $root . DIRECTORY_SEPARATOR) || !is_file($real)) {
            throw new OutOfBoundsException('Image not found');
        }
        $cursor = $root;
        foreach (array_slice($parts, 1) as $part) {
            $cursor .= DIRECTORY_SEPARATOR . $part;
            if (is_link($cursor)) throw new OutOfBoundsException('Image not found');
        }
        [$real, $width, $height, $mtime, $size, $type] = self::sourceInfo($real, (int)$config['max_pixels']);
        return [$real, $width, $height, $mtime, $size, $type];
    }

    public static function derivativePath(array $config, string $relative, string $version, string $preset): string
    {
        $limits = ['micro' => 320, 'thumb' => 640, 'medium' => 960, 'large' => 1600];
        if (!isset($limits[$preset])) throw new InvalidArgumentException('Invalid image size');
        self::ensureState($config);
        $key = hash('sha256', $relative . '|' . $version);
        return $config['state_dir'] . '/cache/' . $preset . '/' . $key . '.webp';
    }

    public static function generateDerivative(array $config, string $relative, string $version, string $preset): string
    {
        $limits = ['micro' => 320, 'thumb' => 640, 'medium' => 960, 'large' => 1600];
        if (!isset($limits[$preset])) throw new InvalidArgumentException('Invalid image size');
        [$source, $width, $height, $mtime, $size, $type] = self::sourceFor($config, $relative);
        $currentVersion = self::sourceVersion($source, $mtime, $size);
        if (!hash_equals($currentVersion, $version)) throw new OutOfBoundsException('Image version has changed');
        $target = $config['state_dir'] . '/cache/' . $preset;
        if (!is_dir($target) && !mkdir($target, 0750, true) && !is_dir($target)) throw new RuntimeException('Image cache is unavailable');
        $destination = self::derivativePath($config, $relative, $version, $preset);
        $lock = fopen($destination . '.lock', 'c');
        if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('Unable to lock image cache');
        try {
            if (is_file($destination) && filesize($destination) > 0) return $destination;
            if (!function_exists('imagewebp')) throw new RuntimeException('Host PHP must provide GD WebP support');
            $sourceImage = match ($type) {
                IMAGETYPE_JPEG => @imagecreatefromjpeg($source),
                IMAGETYPE_PNG => @imagecreatefrompng($source),
                IMAGETYPE_WEBP => @imagecreatefromwebp($source),
                default => false,
            };
            if (!$sourceImage) throw new RuntimeException('Unable to decode image');
            if ($type === IMAGETYPE_JPEG && function_exists('exif_read_data')) {
                $exif = @exif_read_data($source);
                $orientation = (int)($exif['Orientation'] ?? 1);
                $angle = match ($orientation) { 3 => 180, 4 => 180, 5 => -90, 6 => -90, 7 => 90, 8 => 90, default => 0 };
                if ($angle !== 0) { $rotated = imagerotate($sourceImage, $angle, 0); if ($rotated) { imagedestroy($sourceImage); $sourceImage = $rotated; } }
                if (in_array($orientation, [2, 4, 5, 7], true)) imageflip($sourceImage, IMG_FLIP_HORIZONTAL);
            }
            $srcW = imagesx($sourceImage); $srcH = imagesy($sourceImage);
            $scale = min(1, $limits[$preset] / max($srcW, $srcH));
            $dstW = max(1, (int)round($srcW * $scale)); $dstH = max(1, (int)round($srcH * $scale));
            $output = imagecreatetruecolor($dstW, $dstH);
            imagealphablending($output, false); imagesavealpha($output, true);
            $transparent = imagecolorallocatealpha($output, 0, 0, 0, 127); imagefill($output, 0, 0, $transparent);
            imagecopyresampled($output, $sourceImage, 0, 0, 0, 0, $dstW, $dstH, $srcW, $srcH);
            $tmp = $destination . '.' . bin2hex(random_bytes(5)) . '.tmp';
            $ok = imagewebp($output, $tmp, 82);
            imagedestroy($output); imagedestroy($sourceImage);
            $written = $ok ? @getimagesize($tmp) : false;
            if (!$written || $written[2] !== IMAGETYPE_WEBP || $written[0] !== $dstW || $written[1] !== $dstH
                || !rename($tmp, $destination)) {
                @unlink($tmp);
                throw new RuntimeException('Unable to write image derivative');
            }
            @chmod($destination, 0640);
            return $destination;
        } finally {
            flock($lock, LOCK_UN); fclose($lock);
        }
    }
}
