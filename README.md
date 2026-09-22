# Consciousness Atlas

Static holographic diagram viewer. The UI is published from `main` to GitHub Pages; diagram originals and the PHP catalog/image service are hosted separately at `https://adventuresofthemonad.com/atlas-media/`. WordPress is not part of the app.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:8080/`. For a local simulation of the hosted media API, use `http://127.0.0.1:8080/?media=simulator`. For an end-to-end check against the deployed Hostinger service, use `http://127.0.0.1:8080/?media=production`.

## Operations

Add and maintain diagram images through Hostinger File Manager. The scanner discovers files and refreshes the catalog automatically. Read [Image workflow](docs/IMAGE_WORKFLOW.md) before changing category metadata or service state.

See [Deployment and local testing](docs/DEPLOYMENT.md) for how the branches and local modes work, and [Atlas product notes](docs/ATLAS_SPEC.md) for the essential design and interaction decisions.
