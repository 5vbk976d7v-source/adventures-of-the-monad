# Deployment and local testing

The app and its image service deploy separately:

- `main` publishes the static UI to GitHub Pages. The Pages workflow runs `npm test`, builds `_site/`, and deploys it.
- `media` contains the PHP catalog and image service for `https://adventuresofthemonad.com/atlas-media/`.
- The diagram originals and private service state live on Hostinger, outside the Pages artifact.

The production catalog URL is configured in `assets/config/media-endpoints.json`. The Hostinger CORS allowlist in `media-config.php` must include each UI origin that will request it. Keep `media-config.local.php` and the Hostinger `state/` directory private; preserve `state/ids.json` when updating the service.

## Local UI

Requires Node.js 22 or newer.

```sh
npm ci
npm test
npm run build
npm start
```

Open `http://127.0.0.1:8080/`. The local catalog scans repository `diagrams/` and serves originals. To use the Node media-endpoint simulator instead, open `http://127.0.0.1:8080/?media=simulator`. It returns original bytes for every image preset, so it does not test WebP generation or production performance.

To check the live Hostinger service from a local UI, use `http://127.0.0.1:8080/?media=production`. This tests the deployed catalog and image endpoints and requires `http://127.0.0.1:8080` in the service CORS allowlist. The separate PHP test mode (`?media=php`) uses UI port 7070 and PHP port 7071; configure its local PHP settings as described in the media branch README.

`npm run build` creates a UI-only `_site/`. It does not scan, copy, or process diagram originals and does not contact Hostinger.
