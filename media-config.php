<?php
declare(strict_types=1);

// Copy to media-config.local.php for host-specific settings. Do not commit secrets.
return [
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
    ],
    'catalog_ttl' => 60,
    'max_pixels' => 40000000,
];
