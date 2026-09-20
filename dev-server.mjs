import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Serve only the same build artifact that GitHub Pages receives.
const siteRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '_site');
const port = Number(process.env.PORT || 8080);
const basePath = `/${(process.env.BASE_PATH || '').split('/').filter(Boolean).join('/')}`;
const prefix = basePath === '/' ? '' : basePath;
const mime = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

try { await fs.access(path.join(siteRoot, 'index.html')); }
catch { console.error('Build the static atlas first: npm run build'); process.exit(1); }

const server = http.createServer(async (req, res) => {
  const notFound = () => { res.writeHead(404); res.end('Not found'); };
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
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const candidate = path.resolve(siteRoot, relative);
    if (!candidate.startsWith(`${siteRoot}${path.sep}`)) { notFound(); return; }
    const realFile = await fs.realpath(candidate).catch(() => null);
    if (!realFile?.startsWith(`${siteRoot}${path.sep}`)) { notFound(); return; }
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
