import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDevelopmentCatalog, imageHeaderIsComplete, sourceVersion } from './scripts/dev-catalog.mjs';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.join(projectRoot, '_site');
const diagramsRoot = path.join(projectRoot, 'diagrams');
const port = Number(process.env.PORT || 8080);
const basePath = `/${(process.env.BASE_PATH || '').split('/').filter(Boolean).join('/')}`;
const prefix = basePath === '/' ? '' : basePath;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};
const presets = new Set(['original', 'micro', 'thumb', 'medium', 'large']);
const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.webp']);

try { await fs.access(path.join(siteRoot, 'index.html')); }
catch { console.error('Build the static atlas first: npm run build'); process.exit(1); }

const server = http.createServer(async (req, res) => {
  const notFound = () => { res.writeHead(404); res.end('Not found'); };
  const jsonResponse = (status, value, headers = {}) => {
    const body = JSON.stringify(value);
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body), 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  try {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return;
    }
    const url = new URL(req.url || '/', 'http://localhost');
    if (prefix && url.pathname === prefix) {
      res.writeHead(302, { Location: `${prefix}/${url.search}` }); res.end(); return;
    }
    if (!url.pathname.startsWith(`${prefix}/`)) { notFound(); return; }
    let relative;
    try { relative = decodeURIComponent(url.pathname.slice(prefix.length + 1)); }
    catch { notFound(); return; }
    const parts = relative.split('/');
    if (relative.includes('\0') || parts.some(part => part.startsWith('.'))) { notFound(); return; }

    // Hostinger-compatible local simulator. It exercises the same catalog and image URL
    // contract while serving originals for every preset (no image library required).
    if (relative === 'atlas-media/catalog.php') {
      const host = req.headers.host || `127.0.0.1:${port}`;
      const mediaBaseUrl = `http://${host}${prefix}/atlas-media`;
      const catalog = await buildDevelopmentCatalog(diagramsRoot, basePath, {
        mediaBaseUrl, provider: 'node-hostinger-simulator'
      });
      jsonResponse(200, catalog, { 'Cache-Control': 'no-store' });
      return;
    }

    if (relative === 'atlas-media/image.php') {
      const requestedFile = url.searchParams.get('file') || '';
      const preset = url.searchParams.get('preset') || '';
      const requestedVersion = url.searchParams.get('v') || '';
      const imageParts = requestedFile.split('/');
      if (!presets.has(preset) || imageParts.length !== 3 || imageParts[0] !== 'diagrams'
          || imageParts.some(part => !part || part === '.' || part === '..' || part.startsWith('.') || part.includes('\\'))
          || !imageExtensions.has(path.extname(imageParts[2]).toLowerCase())) {
        jsonResponse(404, { error: 'Image not found' }, { 'Cache-Control': 'no-store' });
        return;
      }
      const imagePath = path.resolve(diagramsRoot, imageParts[1], imageParts[2]);
      if (!imagePath.startsWith(`${diagramsRoot}${path.sep}`)) {
        jsonResponse(404, { error: 'Image not found' }, { 'Cache-Control': 'no-store' });
        return;
      }
      let cursor = diagramsRoot;
      for (const part of imageParts.slice(1)) {
        cursor = path.join(cursor, part);
        const item = await fs.lstat(cursor).catch(() => null);
        if (!item || item.isSymbolicLink()) {
          jsonResponse(404, { error: 'Image not found' }, { 'Cache-Control': 'no-store' });
          return;
        }
      }
      const stat = await fs.stat(imagePath).catch(() => null);
      if (!stat?.isFile() || !await imageHeaderIsComplete(imagePath)) {
        jsonResponse(404, { error: 'Image not found' }, { 'Cache-Control': 'no-store' });
        return;
      }
      const version = sourceVersion(stat);
      if (requestedVersion && requestedVersion !== version) {
        jsonResponse(404, { error: 'Image changed; reload the catalog' }, { 'Cache-Control': 'no-store' });
        return;
      }
      const body = await fs.readFile(imagePath);
      res.writeHead(200, {
        'Content-Type': mime[path.extname(imagePath).toLowerCase()], 'Content-Length': body.length,
        'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
        'X-Atlas-Dev-Simulation': 'original-served-for-all-presets', 'X-Atlas-Requested-Preset': preset
      });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }

    if (relative === 'catalog.json') {
      const catalog = await buildDevelopmentCatalog(diagramsRoot, basePath);
      const body = JSON.stringify(catalog);
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body),
        'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'
      });
      res.end(req.method === 'HEAD' ? undefined : body);
      return;
    }

    // Node preview serves real source images locally; Pages artifacts do not contain them.
    let root = siteRoot;
    if (parts[0] === 'diagrams') {
      if (parts.some(part => part.toLowerCase() === 'folder.json') || parts.at(-1)?.endsWith('.php')) { notFound(); return; }
      root = diagramsRoot;
      relative = parts.slice(1).join('/');
      if (!relative) { notFound(); return; }
    }
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const candidate = path.resolve(root, relative);
    if (!candidate.startsWith(`${root}${path.sep}`)) { notFound(); return; }
    if (root === diagramsRoot) {
      let cursor = root;
      for (const part of relative.split('/')) {
        cursor = path.join(cursor, part);
        const item = await fs.lstat(cursor).catch(() => null);
        if (!item || item.isSymbolicLink()) { notFound(); return; }
      }
    }
    const realFile = await fs.realpath(candidate).catch(() => null);
    if (!realFile?.startsWith(`${root}${path.sep}`)) { notFound(); return; }
    const stat = await fs.stat(realFile);
    if (!stat.isFile()) { notFound(); return; }
    res.writeHead(200, {
      'Content-Type': mime[path.extname(realFile).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'
    });
    res.end(req.method === 'HEAD' ? undefined : await fs.readFile(realFile));
  } catch { if (!res.headersSent) res.writeHead(500); res.end('Unable to serve file'); }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Consciousness Atlas: http://127.0.0.1:${port}${prefix}/ (static _site)`);
});
