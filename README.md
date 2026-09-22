# Consciousness Atlas

A static holographic atlas UI deployed on GitHub Pages, with diagram originals
and image delivery hosted separately at `adventuresofthemonad.com/atlas-media/`.
The app is independent of WordPress.

## Local preview

Requirements: Node.js 22+.

```bash
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:8080/`. The Node server scans local `diagrams/` content
through `/catalog.json`, and serves originals for development. The production
build does not scan or include the diagram library.

To exercise the Hostinger-style catalog and image endpoints locally, open
`http://127.0.0.1:8080/?media=simulator`. This routes the app through Node's
`/atlas-media/catalog.php` and `/atlas-media/image.php` compatibility endpoints.
It checks discovery, metadata, image URLs, missing files and loading behavior;
all requested image sizes are served as originals, so it does not test WebP
generation or production image performance.

For a split-port test of the real PHP service, run the UI on port 7070 and PHP
on port 7071, then open `http://127.0.0.1:7070/?media=php`. This mode fetches
the catalog and images from the separate PHP server and requires its CORS allow
list to include `http://127.0.0.1:7070`.

## Image storage and delivery

Category originals and `folder.json` metadata remain in `diagrams/` on `main`
during migration. They will be bulk-uploaded to Hostinger under
`public_html/atlas-media/diagrams/`. After the live catalog and image URLs are
verified, the local Git copy can be removed. Routine additions, replacements
and removals will happen through Hostinger File Manager.

The PHP service and Hostinger instructions are maintained on the `media`
branch. See [Deployment](docs/DEPLOYMENT.md), [Image workflow](docs/IMAGE_WORKFLOW.md),
and [Product specification](docs/ATLAS_SPEC.md). The old backend is preserved
in `backups/pre-github-pages-2026-09-20.tar.gz` for reference.
