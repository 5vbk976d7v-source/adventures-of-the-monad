import { readdir, readFile, lstat, open } from 'node:fs/promises';
import path from 'node:path';

const IMAGE = /\.(png|jpe?g|webp)$/i;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const compareNatural = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';
const encodePath = value => value.split(path.sep).map(encodeURIComponent).join('/');

function titleFromFile(filename) {
  const stem = path.basename(filename, path.extname(filename)).replace(/^\d+[_-]?/, '').replace(/[-_]+/g, ' ').trim();
  return stem.replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase()) || 'Diagram';
}

function defaultOrder(folder, fallback) {
  const prefix = folder.match(/^(\d+)/)?.[1];
  return prefix ? Number(prefix) : fallback;
}

function getId(image, folder, used) {
  const explicit = typeof image?.id === 'string' && ID.test(image.id) ? image.id : '';
  const filename = path.basename(image?.file || '', path.extname(image?.file || '')).replace(/^\d+[_-]?/, '');
  const base = explicit || slug(filename);
  let id = base, suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

export function sourceVersion(stat) {
  return [Math.trunc(stat.mtimeMs * 1000), Math.trunc(stat.ctimeMs * 1000), stat.size, stat.ino]
    .map(value => Math.trunc(value).toString(36)).join('-');
}

async function readMetadata(file) {
  try {
    const stat = await lstat(file);
    if (!stat.isFile() || stat.size > 65536) return {};
    const value = JSON.parse(await readFile(file, 'utf8'));
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}

export async function imageHeaderIsComplete(filename) {
  let handle;
  try {
    handle = await open(filename, 'r');
    const header = Buffer.alloc(24);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const ext = path.extname(filename).toLowerCase();
    if (ext === '.png') return bytesRead >= 24 && header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      && header.toString('ascii', 12, 16) === 'IHDR';
    if (ext === '.jpg' || ext === '.jpeg') return bytesRead >= 4 && header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff;
    if (ext === '.webp') return bytesRead >= 12 && header.toString('ascii', 0, 4) === 'RIFF' && header.toString('ascii', 8, 12) === 'WEBP';
  } catch { return false; }
  finally { await handle?.close(); }
  return false;
}

export async function buildDevelopmentCatalog(diagramsRoot, basePath = '', options = {}) {
  const root = await import('node:fs/promises').then(fs => fs.realpath(diagramsRoot));
  const folders = (await readdir(root, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .map(entry => entry.name).sort(compareNatural);
  const collections = [];
  const prefix = `/${basePath.split('/').filter(Boolean).join('/')}`.replace(/^\/$/, '');
  for (const folder of folders) {
    const directory = path.join(root, folder);
    const metadata = await readMetadata(path.join(directory, 'folder.json'));
    const folderSlug = slug(folder.replace(/^\d+[_-]?/, ''));
    const candidateId = typeof metadata.id === 'string' && ID.test(metadata.id) ? metadata.id : folderSlug;
    const categoryId = candidateId;
    const order = Number.isFinite(Number(metadata.order)) ? Number(metadata.order) : defaultOrder(folder, collections.length + 1);
    const candidates = await readdir(directory, { withFileTypes: true });
    const files = [];
    for (const entry of candidates) {
      if (entry.isFile() && !entry.name.startsWith('.') && IMAGE.test(entry.name)
          && await imageHeaderIsComplete(path.join(directory, entry.name))) files.push(entry.name);
    }
    files.sort(compareNatural);
    if (!files.length) continue;

    const listed = Array.isArray(metadata.images) ? metadata.images : [];
    const listedByFile = new Map(listed.filter(item => item && typeof item.file === 'string').map(item => [item.file, item]));
    const ordered = [];
    for (const item of listed) if (item && files.includes(item.file) && !ordered.includes(item.file)) ordered.push(item.file);
    for (const file of files) if (!ordered.includes(file)) ordered.push(file);

    const usedIds = new Set();
    const records = new Map();
    for (const file of ordered) {
      const item = listedByFile.get(file) || {};
      const id = getId({ ...item, file }, folder, usedIds);
      const localUrl = `${prefix}/diagrams/${encodePath(path.join(folder, file))}`;
      let urls = Object.fromEntries(['original', 'micro', 'thumb', 'medium', 'large'].map(preset => [preset, localUrl]));
      if (options.mediaBaseUrl) {
        const source = `diagrams/${folder}/${file}`;
        const version = sourceVersion(await lstat(path.join(directory, file)));
        urls = Object.fromEntries(['original', 'micro', 'thumb', 'medium', 'large'].map(preset => {
          const query = new URLSearchParams({ file: source, preset, v: version });
          return [preset, `${options.mediaBaseUrl.replace(/\/$/, '')}/image.php?${query}`];
        }));
      }
      records.set(file, { id,
        title: typeof item.title === 'string' && item.title.trim() ? item.title.trim() : titleFromFile(file),
        caption: typeof item.caption === 'string' ? item.caption : '',
        ...urls, width: 0, height: 0 });
    }
    let coverFile = typeof metadata.cover === 'string' && files.includes(path.basename(metadata.cover)) ? path.basename(metadata.cover) : '';
    if (!coverFile) coverFile = files.find(file => /^00[_-].+\.(png|jpe?g|webp)$/i.test(file)) || ordered[0];
    const cover = records.get(coverFile) || records.get(ordered[0]);
    const title = typeof metadata.title === 'string' && metadata.title.trim()
      ? metadata.title.trim() : titleFromFile(folder);
    collections.push({ id: categoryId, title, description: typeof metadata.description === 'string' ? metadata.description : '',
      order, cover, images: ordered.map(file => records.get(file)) });
  }
  collections.sort((a, b) => a.order - b.order || compareNatural(a.title, b.title));
  return { version: 1, provider: options.provider || 'node-development', collections };
}
