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
