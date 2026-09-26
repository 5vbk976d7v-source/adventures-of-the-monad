<?php
declare(strict_types=1);
require dirname(__DIR__) . '/lib/AtlasMedia.php';

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}
$root = sys_get_temp_dir() . '/atlas-youtube-test-' . bin2hex(random_bytes(6));
mkdir($root . '/diagrams/01_category', 0750, true);
$config = require dirname(__DIR__) . '/media-config.php';
$config['diagram_dir'] = $root . '/diagrams';
$config['state_dir'] = $root . '/state';
$config['youtube_map'] = $root . '/atlas-youtube-map.ini';
try {
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
    file_put_contents($root . '/diagrams/01_category/01_example.png', $png);
    file_put_contents($root . '/diagrams/01_category/02_missing.png', $png);
    file_put_contents($root . '/diagrams/01_category/folder.json', json_encode(['images' => [
        ['id' => 'authored-id', 'file' => '01_example.png'], ['id' => 'missing-id', 'file' => '02_missing.png']
    ]]));
    $original = "; Keep this comment\n[01-authored-id]\nvideo[] = \"https://youtu.be/o0B57aJn7CM\"\nvideo[] = \"https://www.youtube.com/watch?v=o0B57aJn7CM&t=10\"\n[retired-id]\nvideo[] = \"\"\n";
    file_put_contents($config['youtube_map'], $original);
    check(AtlasMedia::syncYoutubeMap($config) === 1, 'Adds missing authored IDs');
    $expected = $original . "\n[01-missing-id]\nvideo[] = \"\"\n";
    check(file_get_contents($config['youtube_map']) === $expected, 'Preserves comments, links and old entries');
    check(AtlasMedia::syncYoutubeMap($config) === 0, 'Repeated sync is idempotent');
    $catalog = AtlasMedia::buildCatalog($config);
    check(count($catalog['collections'][0]['images'][0]['videos']) === 2, 'Publishes multiple video links');
    check($catalog['collections'][0]['images'][1]['videos'] === [], 'Empty entries publish no links');
    file_put_contents($config['youtube_map'], "authored-id = \"https://youtu.be/o0B57aJn7CM, https://www.youtube.com/watch?v=o0B57aJn7CM\"\n");
    check(AtlasMedia::syncYoutubeMap($config) === 2, 'Legacy maps accept appended sections');
    check(count(AtlasMedia::youtubeMap($config)['01-authored-id']) === 2, 'Legacy links migrate during sync');
    $exampleConfig = $config;
    $exampleConfig['youtube_map'] = dirname(__DIR__) . '/atlas-youtube-map.ini';
    $examples = AtlasMedia::youtubeMap($exampleConfig);
    check(in_array($examples['01-the-cube'][0], $examples['01-metaverse-antverse-and-universes'], true), 'Example diagrams share a video');
    check($examples['01-the-icosahedron'] === [], 'Example diagram has no videos');
    file_put_contents($config['youtube_map'], "authored-id = \"https://youtube.com.evil.test/watch?v=bad\"\n");
    try { AtlasMedia::syncYoutubeMap($config); throw new LogicException('Unsafe URL accepted'); }
    catch (RuntimeException $e) { check(str_contains($e->getMessage(), 'Invalid YouTube URL'), 'Rejects unsafe hosts'); }
    $invalid = "[unterminated-section\n";
    file_put_contents($config['youtube_map'], $invalid);
    try { AtlasMedia::syncYoutubeMap($config); throw new LogicException('Invalid INI accepted'); }
    catch (RuntimeException $e) { check(str_contains($e->getMessage(), 'Invalid YouTube map'), 'Rejects invalid INI'); }
    check(file_get_contents($config['youtube_map']) === $invalid, 'Invalid map is never overwritten');
    unlink($config['youtube_map']);
    check(AtlasMedia::syncYoutubeMap($config) === 2, 'Creates map when absent');
    echo "YouTube map checks passed\n";
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
    rmdir($root);
}
