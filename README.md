# Consciousness Atlas

Independent Scientific / Holographic Atlas for technical diagrams about human consciousness.

The atlas is intentionally decoupled from WordPress. Production uses static HTML/CSS/JS plus two narrow PHP services (`catalog.php` and `image.php`). Local development can run entirely with Node.js.

## Run locally

```bash
npm start
```

Then open `http://127.0.0.1:8080`.

## Production

Upload this directory as `/atlas/` beside the existing WordPress site.

## Main documentation

- `docs/ATLAS_SPEC.md` — agreed design, interaction, performance and security specification
- `docs/DEPLOYMENT.md` — local and production deployment

## Content

Add category folders under `images/`. Optional `folder.json` controls title, order and cover. Production derivatives are generated lazily into `cache/`.
