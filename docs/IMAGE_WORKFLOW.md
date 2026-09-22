# Diagram images

## Add, replace, or remove diagrams

Use Hostinger File Manager in `public_html/atlas-media/diagrams/`. Each immediate subfolder is a category. Upload supported PNG, JPEG, or WebP originals into the category folder; descriptive filenames are recommended. Numeric filename prefixes such as `08_` set display order. Do not upload generated WebP derivatives: `image.php` creates and caches them on demand.

The scanner discovers added and removed images automatically. You do not need to edit `folder.json` for an ordinary upload. Existing metadata remains useful for category titles/order/covers and authored diagram titles/captions. New images without metadata use a title derived from the filename.

The catalog refreshes after its configured cache period (currently 60 seconds). A configured cover is used while it exists; otherwise the service chooses a `00_`/`00-` image, then the first available diagram. Replacing an image at the same path keeps its identity and refreshes its versioned URLs. Renaming it creates a new identity.

## Preserve metadata and service state

Keep each category's `folder.json` with its originals. It may include category `id`, `title`, `order`, `cover`, `description`, and an `images` array with image `id`, `file`, `title`, and `caption` fields. The private Hostinger `state/ids.json` preserves IDs assigned to discovered files. Back up both metadata and the ID registry with the original images. Never delete or overwrite the `state/` directory during a code update.

## Local preview

The main branch retains a local copy under `diagrams/` for development. `npm start` scans it at `/catalog.json`; reload after changing files. The GitHub Pages build excludes this copy.
