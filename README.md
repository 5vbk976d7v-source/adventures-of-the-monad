# Atlas media service

This branch contains the small PHP service and diagram files for
`https://adventuresofthemonad.com/atlas-media/`. It is uploaded to
`public_html/atlas-media/`; the atlas UI is hosted separately on GitHub Pages.
WordPress is not part of this service.

## Runtime files

- `catalog.php` scans category folders, validates image files, applies optional
  `folder.json` metadata, assigns stable category and diagram IDs, chooses each
  cover image, and returns the catalog JSON. It caches the response for the
  configured TTL and serves the last cached catalog if a refresh fails.
- `image.php` serves an original image or creates and serves a WebP derivative
  on first request. It accepts only the named `original`, `micro`, `thumb`,
  `medium`, and `large` presets; later requests use the cached derivative.
- `lib/AtlasMedia.php` contains shared configuration, CORS and method handling,
  safe source-path checks, catalog discovery and metadata handling, persistent
  ID registry updates, image validation, derivative generation and cache
  cleanup.
- `media-config.php` contains deployment defaults: the public media URL, source
  and state locations, allowed browser origins, catalog cache TTL, and maximum
  image pixel count. Host-specific overrides belong in the untracked
  `media-config.local.php` file.
- `.htaccess` disables directory listings and blocks public access to state,
  metadata and configuration files. `diagrams/.htaccess` blocks script
  execution and access to `folder.json` inside uploaded category folders.
- `mu-plugins/atlas-media-sync.php` is an optional WordPress MU-plugin for the
  Adventures of the Monad site. Copy it to `wp-content/mu-plugins/`, define
  `ATLAS_MEDIA_SYNC_TOKEN` in `wp-config.php`, and administrators with the
  `manage_options` capability can run the protected resync from Tools → Atlas
  Media Sync. The plugin sends the canonical website origin with the request.

## Diagram layout and metadata

Each immediate subfolder of `diagrams/` is a category. Put its original images
and optional `folder.json` in that folder. The scanner discovers supported PNG,
JPEG and WebP files automatically; it ignores hidden, incomplete, invalid and
symlinked files. Numeric filename prefixes sort naturally and are also suitable
for consistent upload ordering.

`folder.json` may provide `id`, `title`, `order`, `cover`, `description`, and an
`images` array. Image entries may provide `id`, `file`, `title`, and `caption`.
Unlisted images are still discovered and receive a title from their filename.
Cover selection uses the configured cover when valid, then a `00_`/`00-` image,
then the first naturally sorted image.

The service writes `state/ids.json` to keep generated IDs stable across scans.
The `state/` directory also stores the cached catalog, lock files, and generated
WebP derivatives. Preserve `state/ids.json` when updating service code; it is
not part of the source image upload.

## Resync `folder.json` image lists

Resync is separate from normal catalog requests. It accepts browser requests
only from the configured canonical website origin, and also requires a long
random `sync_token` in the private Hostinger `media-config.local.php`. Open
the endpoint from that website and submit the token. The one-off script removes metadata entries for missing files,
appends new files, preserves existing entries and category settings, then
clears the catalog cache. It reports how many category files changed. The
endpoint is disabled while `sync_token` is empty; do not place the token in a
URL or commit it.

## YouTube video map

Edit `atlas-youtube-map.ini` alongside `catalog.php`. Each heading begins with
the two-digit category prefix from its folder, followed by the diagram ID from
`folder.json`. Paste one link per line:

```ini
[01-metaverse-antverse-and-universes]
video[] = "https://youtu.be/o0B57aJn7CM"

[01-the-cube]
video[] = "https://youtu.be/o0B57aJn7CM"

[01-the-icosahedron]
video[] = ""
```

For another video, copy a `video[] = "..."` line below the same heading and
replace the link between the quotes. Keep the headings unchanged. The category
prefix prevents diagrams with the same ID in different folders sharing links.
Empty quotes
show no video section. Older comma-separated entries remain supported before
the first heading. Sync generates the new section format. The same diagram ID in
multiple categories shares its video links. For files without authored IDs,
the sync uses the catalog's persistent IDs.

In **Tools → Atlas Media Sync**, click **Sync YouTube map** to append missing IDs.
This preserves existing entries, URLs, comments and entries for removed diagrams.
It uses the same token, origin check and catalog lock as folder sync, and clears
the catalog cache. Run it again after manually editing links to clear that cache,
or wait for the configured catalog TTL. Invalid INI or non-YouTube URLs reject sync.

Upload updated `lib/AtlasMedia.php`, `media-config.php`, `sync-folder-json.php`
and `.htaccess` to `public_html/atlas-media/`. Upload the INI file there on first
installation; preserve the server's edited copy during subsequent deployments.
Replace the plugin in `wp-content/mu-plugins/atlas-media-sync.php`. Deploy the
updated UI as usual. No new token or configuration is needed.

Run `php tests/youtube-map.php` to verify map synchronization using temporary fixtures.

## Image presets

The generated WebP presets use these maximum dimensions: `micro` 320 px,
`thumb` 640 px, `medium` 960 px, and `large` 1600 px. They preserve aspect ratio
and do not upscale smaller sources. `original` serves the uploaded source as-is.
The service limits decoded sources to the configured maximum pixel count and
requires PHP GD with WebP support for derivative requests.

## Local test

From the repository root, build the UI and start the independent Node simulator:

```sh
npm run build
PORT=7070 npm start
```

Open `http://127.0.0.1:7070/?media=simulator` to test the app against the
Hostinger-shaped Node endpoints. The simulator serves originals for every
preset; it does not test WebP generation.

To test these PHP files directly, run PHP's built-in server from this folder
using a temporary local config and state directory. For example, copy
`media-config.php` to `media-config.local.php`, set `public_base_url` to
`http://127.0.0.1:7071`, set `state_dir` to a writable temporary directory, and
add `http://127.0.0.1:7070` to `allowed_origins`. Then run:

```sh
php -S 127.0.0.1:7071 -t .
```

Request `http://127.0.0.1:7071/catalog.php` and fetch an image URL from its
JSON. Remove the local override when finished. PHP's built-in server does not
apply Apache `.htaccess` rules, so validate those rules on the target Apache
host as well. Never upload `media-config.local.php` or expose the `state/`
directory.

### UI on 7070, PHP media on 7071

This split-port mode tests the app against the actual PHP endpoints rather than
the Node simulator. In one terminal, from the repository root, run:

```sh
npm run build
PORT=7070 npm start
```

In another terminal, create `media-config.local.php` in this folder:

```php
<?php
return [
    'public_base_url' => 'http://127.0.0.1:7071',
    'diagram_dir' => __DIR__ . '/diagrams',
    'state_dir' => '/tmp/atlas-media-local-state',
    'allowed_origins' => ['http://127.0.0.1:7070'],
    'catalog_ttl' => 1,
];
```

Then start the PHP server from this folder:

```sh
php -S 127.0.0.1:7071 -t .
```

Open `http://127.0.0.1:7070/?media=php`. The local PHP diagram folder must have
at least one valid image for the atlas to show content. Remove the local config
and state directory after testing; never upload the local config.
