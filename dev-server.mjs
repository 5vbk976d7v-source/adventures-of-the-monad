import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const imagesRoot = path.join(here, 'images');
const port = Number(process.env.PORT || 8080);
const allowedImages = new Set(['.png', '.jpg', '.jpeg', '.webp']);

function encodePath(relative) {
  return relative.split(path.sep).map(encodeURIComponent).join('/');
}

function titleCase(value) {
  return value.replace(/\b\w/g, c => c.toUpperCase());
}

function displayTitle(filename) {
  const base = path.basename(filename, path.extname(filename));
  const withoutDate = base.replace(/^DALL[^-]{0,16}\s+\d{4}-\d{2}-\d{2}\s+\d{2}[.:]\d{2}[.:]\d{2}\s*-\s*/i, '');
  const quoted = withoutDate.match(/(?:concept(?:\s+of)?|statement)[\s_:]*['“‘_]+([^'”’_]{3,90})/i)
    || withoutDate.match(/represent(?:ing|s)?\s+['“‘_]+([^'”’_]{3,90})/i);
  if (quoted?.[1]) return quoted[1].trim();
  const cleaned = withoutDate.replace(/^\d+[-_. ]*/, '').replace(/[-_]+/g, ' ').trim();
  return cleaned.length > 92 ? `${cleaned.slice(0, 89).trim()}…` : titleCase(cleaned);
}

async function readJson(file) {
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile() || stat.size > 65536) return {};
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch {
    return {};
  }
}

async function imageRecord(folder, filename, collectionId, index) {
  const relative = path.join(folder, filename);
  const encoded = encodePath(relative);
  // Node development mode intentionally reuses originals for all sizes.
  // Production PHP will point these fields at lazily generated WebP derivatives.
  const original = `images/${encoded}`;
  return {
    id: `${collectionId}.${String(index + 1).padStart(2, '0')}`,
    title: displayTitle(filename),
    caption: '',
    width: 0,
    height: 0,
    original,
    micro: original,
    thumb: original,
    large: original,
    _filename: filename
  };
}

async function scanCatalog() {
  const entries = await fs.readdir(imagesRoot, { withFileTypes: true });
  const collections = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
    const folder = entry.name;
    const dir = path.join(imagesRoot, folder);
    const meta = await readJson(path.join(dir, 'folder.json'));
    const prefix = folder.match(/^(\d{1,3})/);
    const numericPrefix = prefix ? Number(prefix[1]) : null;
    const rawId = meta.id !== undefined && String(meta.id).trim() ? String(meta.id).trim() : String(numericPrefix ?? collections.length + 1);
    const id = /^\d+$/.test(rawId) ? rawId.padStart(2, '0') : rawId;
    const order = Number.isFinite(Number(meta.order)) ? Number(meta.order) : (numericPrefix ?? 9999);
    const fallbackTitle = titleCase(folder.replace(/^\d+[-_. ]*/, '').replace(/[-_]+/g, ' '));
    const title = typeof meta.title === 'string' && meta.title.trim() ? meta.title.trim() : fallbackTitle;

    const dirEntries = await fs.readdir(dir, { withFileTypes: true });
    const files = dirEntries
      .filter(f => f.isFile() && !f.name.startsWith('.') && allowedImages.has(path.extname(f.name).toLowerCase()))
      .map(f => f.name)
      .sort((a,b) => a.localeCompare(b, undefined, { numeric:true, sensitivity:'base' }));

    const images = [];
    for (let i = 0; i < files.length; i++) images.push(await imageRecord(folder, files[i], id, i));
    if (!images.length) continue;

    const requestedCover = typeof meta.cover === 'string' ? path.basename(meta.cover) : '';
    const cover = images.find(img => img._filename === requestedCover)
      || images.find(img => /^00[-_. ]*cover\.(png|jpe?g|webp)$/i.test(img._filename))
      || images[0];
    const cleanImages = images.map(({_filename, ...img}) => img);
    const {_filename, ...cleanCover} = cover;

    collections.push({
      id,
      title,
      description: typeof meta.description === 'string' ? meta.description.trim() : '',
      order,
      cover: cleanCover,
      images: cleanImages
    });
  }

  collections.sort((a,b) => a.order - b.order || a.title.localeCompare(b.title));
  return { generatedAt: new Date().toISOString(), provider: 'node-dev', collections: collections.slice(0,16) };
}

function mimeType(file) {
  const ext = path.extname(file).toLowerCase();
  return ({
    '.html':'text/html; charset=utf-8',
    '.css':'text/css; charset=utf-8',
    '.js':'text/javascript; charset=utf-8',
    '.mjs':'text/javascript; charset=utf-8',
    '.json':'application/json; charset=utf-8',
    '.svg':'image/svg+xml',
    '.png':'image/png',
    '.jpg':'image/jpeg',
    '.jpeg':'image/jpeg',
    '.webp':'image/webp'
  })[ext] || 'application/octet-stream';
}

function safeStaticPath(urlPathname) {
  let decoded;
  try { decoded = decodeURIComponent(urlPathname); }
  catch { return null; }
  if (decoded.includes('\0')) return null;
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const candidate = path.resolve(here, relative);
  if (candidate !== here && !candidate.startsWith(`${here}${path.sep}`)) return null;
  return candidate;
}

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    if (requestUrl.pathname === '/catalog.json') {
      const catalog = await scanCatalog();
      const body = JSON.stringify(catalog, null, 2);
      res.writeHead(200, {
        'Content-Type':'application/json; charset=utf-8',
        'Cache-Control':'no-store',
        'X-Content-Type-Options':'nosniff'
      });
      res.end(body);
      return;
    }

    // PHP is production-only. Returning 404 makes atlas.js fall back to /catalog.json.
    if (requestUrl.pathname === '/catalog.php' || requestUrl.pathname === '/image.php') {
      res.writeHead(404, { 'Content-Type':'text/plain; charset=utf-8' });
      res.end('PHP endpoint unavailable in Node development mode');
      return;
    }

    const file = safeStaticPath(requestUrl.pathname);
    if (!file || path.basename(file).startsWith('.') || file.endsWith('.php')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const stat = await fs.stat(file).catch(() => null);
    if (!stat?.isFile()) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const body = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': mimeType(file),
      'Cache-Control': requestUrl.pathname.startsWith('/images/') ? 'public, max-age=60' : 'no-cache',
      'X-Content-Type-Options':'nosniff'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'Content-Type':'text/plain; charset=utf-8' });
    res.end(`Development server error: ${error.message}`);
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Consciousness Atlas: http://127.0.0.1:${port}`);
  console.log('Catalog provider: Node /catalog.json (production remains catalog.php)');
});
