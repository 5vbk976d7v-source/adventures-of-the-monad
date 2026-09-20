# Consciousness Atlas — Static deployment

The atlas runs on GitHub Pages without a backend. Node.js 22+ and Sharp are needed only before publication. The browser reads `atlas.json` and prebuilt image assets.

## Local preview

```bash
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:8080`. The server serves `_site/`, the same directory uploaded to Pages. Rebuild after changing application files, source images or metadata. `npm run build:atlas` regenerates only the catalog and image derivatives; `npm run build` also assembles the published site. To test a repository prefix, start with `BASE_PATH=/aom-atlas npm start` and open `/aom-atlas/`.

## GitHub Pages setup

1. In the repository's **Settings → Pages**, choose **GitHub Actions** as the build/deployment source.
2. Review `.github/workflows/pages.yml`. It publishes on pushes to `main`, or a manual dispatch on `main`. For another publishing branch, change the trigger and deployment condition together.
3. Ensure the `github-pages` environment permits that branch; keep any desired reviewer protection.
4. Merge the reviewed changes. The workflow installs lockfile dependencies, tests, builds `_site/`, uploads that artifact and deploys it.
5. Open the URL reported by the deployment job. Check a category, title search, detail link, fullscreen and representative images.

Repository settings must be applied by an administrator; adding workflow files alone does not enable Pages. This follows GitHub's [custom Pages workflow guidance](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Paths and permanent links

The same output supports `https://owner.github.io/repository/` and a custom domain root. Asset paths are relative; no hard-coded repository name or rewrite rule is required. A detail URL uses the current page path and `?diagram=<category-id>/<diagram-id>`; query strings require no SPA routing fallback.

IDs are permanent identifiers. Changing them breaks shared links. Titles, filenames and display order may change without changing IDs.

## Publication boundary

Only `_site/` is published: the browser entrypoint, assets, catalog and referenced originals. Never upload the repository root, which contains documentation, metadata, tooling and historical backups.

PR checks use a read-only token and cannot deploy. Only the deployment job has `pages: write` and `id-token: write`. No personal access token, processing server or writable cache is needed.

The old backend/specification is retained in `backups/pre-github-pages-2026-09-20.tar.gz`, excluded from publication. The active project has no PHP or Apache configuration. For content changes, follow [IMAGE_WORKFLOW.md](IMAGE_WORKFLOW.md).
