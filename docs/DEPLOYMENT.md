# Consciousness Atlas — Deployment

## Local development with Node.js

PHP is not required locally.

Requirements: Node.js 18+.

```bash
cd consciousness-atlas
npm start
```

Open:

```text
http://127.0.0.1:8080
```

The development server exposes `/catalog.json` by scanning `/images/`. `atlas.js` first tries `catalog.php`; when that endpoint is unavailable under Node it automatically falls back to `catalog.json`.

In Node development mode all `micro`, `thumb`, and `large` URLs point to the original image. This keeps local setup dependency-free. Production PHP uses optimized WebP derivatives.

## Production deployment beside WordPress

Upload the entire `consciousness-atlas/` directory next to the WordPress installation, for example:

```text
public_html/
  wp-admin/
  wp-content/
  wp-includes/
  ...
  atlas/
```

The atlas is then available at:

```text
https://example.com/atlas/
```

No WordPress plugin or theme edit is required.

## Required PHP/server capabilities

- PHP 8+
- Apache rewrite support / `.htaccess` support
- Imagick recommended, or GD compiled with WebP support
- write permission for PHP only under `/atlas/cache/`

The `/images/` folder only needs to be readable by the web server.

## Adding content

Upload original images into category folders under `/atlas/images/`.

Optional `folder.json`:

```json
{
  "title": "Trust in Self",
  "order": 1,
  "cover": "00-cover.webp"
}
```

After upload:

- `catalog.php` discovers the file automatically;
- the first request for a missing derivative creates it lazily;
- later requests are served directly from `/cache/`;
- replacing an original with a newer file invalidates older derivatives by modification time.

## Permissions

Typical permissions:

```text
directories  755
files        644
cache/       writable by PHP/web-server user
```

Do not make the full atlas directory globally writable.

## Security notes

The PHP catalog accepts no path/query input. `image.php` accepts only a preset and a source path that resolves beneath `/images/`; it does not accept remote URLs or arbitrary dimensions.

Both `/images/.htaccess` and `/cache/.htaccess` disable indexes and deny executable script extensions.
