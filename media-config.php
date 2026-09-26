<?php
declare(strict_types=1);

// Copy to media-config.local.php for host-specific settings. Do not commit secrets.
return [
    'youtube_map' => __DIR__ . '/atlas-youtube-map.ini',
    'public_base_url' => 'https://adventuresofthemonad.com/atlas-media',
    'diagram_dir' => __DIR__ . '/diagrams',
    'state_dir' => __DIR__ . '/state',
    'allowed_origins' => [
        'https://atlas.adventuresofthemonad.com',
        'https://jder7.github.io',
        'https://adventuresofthemonad.com',
        'https://www.adventuresofthemonad.com',
        'http://localhost:8080',
        'http://127.0.0.1:8080',
        'http://localhost:7070',
        'http://127.0.0.1:7070',
    ],
    // The metadata resync endpoint is a maintenance action and accepts browser
    // requests only when they originate from the canonical public website.
    'sync_origin' => 'https://adventuresofthemonad.com',
    'catalog_ttl' => 60,
    'max_pixels' => 40000000,
];
