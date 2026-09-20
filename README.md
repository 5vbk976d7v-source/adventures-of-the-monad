# Consciousness Atlas

A static holographic atlas of consciousness diagrams, deployed on GitHub Pages.

## Local preview

```bash
npm ci
npm run build
npm start
```

Open `http://127.0.0.1:8080/`. The local server serves the same `_site/` artifact as production. To test a GitHub project URL, use `BASE_PATH=/aom-atlas npm start` and open `http://127.0.0.1:8080/aom-atlas/`.

## Content

Original images and explicit metadata live in `diagrams/<category>/`. The build generates the micro, thumb and large WebP sizes and `atlas.json`. Visitors fetch static files only.

- [Image and agent workflow](docs/IMAGE_WORKFLOW.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Product specification](docs/ATLAS_SPEC.md)
- [Imported document content](docs/CONTENT_IMPORT.md)

The previous technical specifications and backend are preserved in `backups/pre-github-pages-2026-09-20.tar.gz`; they are excluded from deployment.
