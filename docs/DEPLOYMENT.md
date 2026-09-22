# Deployment

The application and image service deploy independently:

- `main` builds the small static UI artifact for GitHub Pages.
- `media` contains the PHP catalog and image service for
  `https://adventuresofthemonad.com/atlas-media/`.

The Pages artifact does not include originals, generated derivatives, PHP,
metadata files, or the local ID registry. WordPress is not modified.

## Local UI development

Requirements: Node.js 22+.

```bash
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:8080/`. The Node server dynamically scans the repository's
`diagrams/` folders at `/catalog.json` and serves the local original images. This
is the PHP catalog equivalent for development; it does not resize images. It
uses the same catalog fields, folder metadata, ordering, cover fallback and
automatic discovery rules as the Hostinger service. Restarting is not needed
after adding an image; reload the Atlas to rescan. To test a GitHub project path,
set `BASE_PATH=/aom-atlas` and open `http://127.0.0.1:8080/aom-atlas/`.

For an end-to-end local test of the Hostinger URL contract, open
`http://127.0.0.1:8080/?media=simulator` (or append that query to the project
path). Node then exposes `/atlas-media/catalog.php` and `/atlas-media/image.php`
and the app uses those endpoints instead of `/catalog.json` and direct image
files. The simulator checks supported presets, safe paths, missing/changed
images, and catalog discovery. It serves the original bytes for every preset,
so use Hostinger or PHP with GD WebP to verify derivative generation and its
performance.

### Split-port test with the actual PHP service

This runs the UI and media service independently, as they are deployed. Use
two terminals from the repository checkout:

1. Build and start the UI from the repository root:

   ```sh
   npm run build
   PORT=7070 npm start
   ```

2. Create `.worktrees/media/media-config.local.php` with local URLs, source
   directory, writable state and the UI origin in CORS:

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

   Start PHP from the media worktree:

   ```sh
   cd .worktrees/media
   php -S 127.0.0.1:7071 -t .
   ```

3. Open `http://127.0.0.1:7070/?media=php`. The UI requests
   `http://127.0.0.1:7071/catalog.php`; returned image URLs also point to port
   7071. Confirm the browser console has no CORS errors and open a diagram to
exercise the original and WebP preset endpoints.

To test the local UI against the deployed production media service instead,
open `http://127.0.0.1:7070/?media=production`. The production media service
must allow `http://127.0.0.1:7070` in its CORS origin list.

The PHP service scans the folder configured by `diagram_dir`; it must contain
category folders with valid image files. Keep `media-config.local.php` local and
remove it and `/tmp/atlas-media-local-state` when finished. This mode requires
PHP GD with WebP support. Use `127.0.0.1` consistently so the CORS origin
matches; `localhost` is a different origin.

`npm run build` only assembles UI files under `_site/`; it does not scan images,
generate derivatives or require access to Hostinger. It deliberately excludes
`diagrams/`, `assets/diagrams/` and the old root `atlas.json` even while those
legacy assets remain in the main branch during migration.

## GitHub Pages

The `.github/workflows/pages.yml` workflow runs tests, builds `_site/` and
publishes it on pushes to `main`. It only needs read access to the repository;
it does not write generated files or commit bot changes. The repository owner
must have configured GitHub Pages to use GitHub Actions and permitted the
`github-pages` deployment environment.

The catalog endpoint mapping is in
`assets/config/media-endpoints.json`. Production and testing currently point to
the agreed Hostinger domain; local development uses Node's `/catalog.json`.
If a temporary test service is used before cutover, change only the `testing`
URL and restore it after QA. The service must allow CORS from
`https://atlas.adventuresofthemonad.com` and the testing Pages origin
`https://jder7.github.io`.

## Hostinger media service

The `media` branch is trimmed to the Hostinger runtime files only: root
`.htaccess`, `catalog.php`, `image.php`, `media-config.php`,
`lib/AtlasMedia.php`, and `diagrams/.htaccess`. Upload these to
`public_html/atlas-media/`, then bulk-upload the cleaned category folders into
its `diagrams/` directory. Keep category `folder.json` files and the service's
`state/ids.json` with the originals. Do not overwrite or clear data/state when
updating code. Verify PHP 8.1+, GD WebP, writable state storage, catalog CORS and
image responses in a temporary location before the app switches to it.

After the real catalog and image endpoints are tested, the Pages UI can switch
to the Hostinger source without rebuilding or committing any images. Preserve a
backup of originals, metadata and ID registry. The user removes `diagrams/`
from `main` only after verifying the Hostinger migration; no history rewrite is
part of this deployment.
