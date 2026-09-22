# Diagram images

## Where content lives

Each directory under `diagrams/` is a category. A category may contain source
images and a `folder.json`. Existing metadata preserves category and diagram
IDs, titles, captions, category order and preferred cover. Keep it with the
originals when uploading the library to Hostinger.

The migration copy on `main` remains intact until the Hostinger upload has been
verified. After cutover, ordinary image maintenance happens in Hostinger File
Manager; it does not require Git, WordPress editing or individual URL entry.

## Add, replace or delete an image after cutover

1. Open the appropriate folder under `public_html/atlas-media/diagrams/`.
2. Bulk-upload, replace or delete image files (`png`, `jpg`, `jpeg`, `webp`).
3. Use a numeric prefix such as `08_` when you want to set its order. Keep
   filenames descriptive; no prefix is required.
4. Reload the Atlas after the catalog cache (initially 60 seconds) expires.

The PHP scanner discovers files directly, so ordinary uploads do not need
changes to `folder.json`. The generated catalog JSON is an API response cached
on Hostinger; it is not a file that you edit. Existing `folder.json` entries
continue to define editorial titles and order for listed files. New files are
appended in natural filename order and receive permanent IDs in the private
Hostinger ID registry. Deleted files disappear from the catalog while their ID
mapping remains available for restoration.

Cover selection uses the configured cover if it still exists, then `00-cover.*`,
then the first available diagram. Empty categories are omitted. Replacing a file
at the same path preserves its identity and refreshes its image URL/cache key.
Renaming a file creates a new identity unless the registry is deliberately
migrated.

## Local development

Run `npm start` and open the local URL. The Node server scans the repository's
`diagrams/` directory at `/catalog.json` and serves local originals at their
normal file paths. It reads the same optional metadata and discovery rules as
the PHP service, but does not generate WebP derivatives or modify
`folder.json`. Add/delete local source files and reload to rescan.

The UI build is independent of the images. `npm test` and `npm run build` do not
contact Hostinger, process images or include `diagrams/`, `assets/diagrams/` or
the legacy `atlas.json` in `_site/`.

## Service and testing

On the `media` branch, `catalog.php` returns category data and `image.php`
returns originals or on-demand WebP derivatives (320, 640, 960 or 1600 pixels
on the long edge). The first request for a preset generates a cached derivative;
later requests return that cached file. Detail and fullscreen use the unchanged
original. The service uses source-versioned URLs, locks, atomic writes, pixel
limits and path validation.

Before cutover, test CORS from production and testing Pages origins; compare
category and image counts, titles, order, covers and IDs; and test new uploads,
replacements, deletion, fallback covers, a first derivative, a cached derivative
and a missing image. Keep a backup of originals, `folder.json` files and
`state/ids.json`. The Hostinger install steps and verification checklist are in
[DEPLOYMENT.md](DEPLOYMENT.md).
