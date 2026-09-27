<?php
declare(strict_types=1);
require dirname(__DIR__) . '/lib/AtlasMedia.php';

function check(bool $condition, string $message): void {
    if (!$condition) throw new RuntimeException($message);
}

$root = sys_get_temp_dir() . '/atlas-git-sync-' . bin2hex(random_bytes(6));
$live = $root . '/atlas-media';
$git = $root . '/atlas-media-git';
mkdir($live . '/diagrams/01_existing', 0750, true);
mkdir($git . '/diagrams/01_existing', 0750, true);
mkdir($git . '/diagrams/02_new-category', 0750, true);
$config = require dirname(__DIR__) . '/media-config.php';
$config['diagram_dir'] = $live . '/diagrams';
$config['state_dir'] = $live . '/state';
$config['youtube_map'] = $live . '/atlas-youtube-map.ini';
$config['git_source_dir'] = $git;
try {
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=');
    file_put_contents($live . '/diagrams/01_existing/01_keep.png', 'live-file-must-not-change');
    file_put_contents($git . '/diagrams/01_existing/01_keep.png', $png);
    file_put_contents($git . '/diagrams/01_existing/01_import.png', $png);
    file_put_contents($git . '/diagrams/01_existing/folder.json', '{"title":"Ignored source metadata"}');
    file_put_contents($git . '/diagrams/02_new-category/01_new.png', $png);
    $imported = AtlasMedia::importGitDiagrams($config);
    check($imported['categories'] === 1 && $imported['images'] === 2, 'Imports only new images and categories');
    check($imported['files'] === ['diagrams/01_existing/02_import.png', 'diagrams/02_new-category/01_new.png'], 'Reports imported paths, including renamed images');
    check(file_get_contents($live . '/diagrams/01_existing/01_keep.png') === 'live-file-must-not-change', 'Never replaces live images');
    check(is_file($live . '/diagrams/01_existing/02_import.png'), 'Renumbers only an imported image with a conflicting prefix');
    check(!file_exists($live . '/diagrams/01_existing/folder.json'), 'Never copies Git folder metadata');
    check(is_file($live . '/diagrams/02_new-category/01_new.png'), 'Imports new category images');
    $repeatedImport = AtlasMedia::importGitDiagrams($config);
    check($repeatedImport === ['categories' => 0, 'images' => 0, 'files' => []], 'Does not re-import images that were renamed during a previous sync');

    file_put_contents($config['youtube_map'], "[01-existing]\nvideo[] = \"https://youtu.be/live\"\n");
    file_put_contents($git . '/atlas-youtube-map.ini', "[01-existing]\nvideo[] = \"https://youtu.be/live\"\nvideo[] = \"https://youtu.be/new\"\n\n[02-new]\nvideo[] = \"https://youtu.be/category\"\n");
    $merged = AtlasMedia::mergeGitYoutubeMap($config);
    check($merged['sections'] === 1 && $merged['links'] === 2, 'Adds only missing map sections and links');
    check(count($merged['updates']) === 3, 'Reports each map section and link added');
    $map = AtlasMedia::youtubeMap($config);
    check($map['01-existing'] === ['https://youtu.be/live', 'https://youtu.be/new'], 'Merges links into an existing section');
    check($map['02-new'] === ['https://youtu.be/category'], 'Imports missing map section');
    $repeated = AtlasMedia::mergeGitYoutubeMap($config);
    check($repeated['sections'] === 0 && $repeated['links'] === 0 && $repeated['updates'] === [], 'Map merge is idempotent');
    echo "Git source sync checks passed\n";
} finally {
    $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS), RecursiveIteratorIterator::CHILD_FIRST);
    foreach ($files as $file) $file->isDir() ? rmdir($file->getPathname()) : unlink($file->getPathname());
    rmdir($root);
}
