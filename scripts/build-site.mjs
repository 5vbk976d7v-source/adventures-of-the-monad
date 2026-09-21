import { cp, mkdir, readdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAtlas } from './build-atlas.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const PUBLIC_ASSET = /\.(css|js|json|png|jpe?g|webp|svg|woff2?|ico)$/i;

async function copyAssets(source, destination) {
  if (!(await lstat(source)).isDirectory()) throw new Error(`Asset root must be a real directory: ${source}`);
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isDirectory()) await copyAssets(from, to);
    else if (entry.isFile() && PUBLIC_ASSET.test(entry.name)) await cp(from, to);
  }
}

export async function buildSite(root = ROOT) {
  const catalog = await buildAtlas(root);
  const destination = path.join(root, '_site');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination);
  for (const file of ['index.html', 'atlas.json']) await cp(path.join(root, file), path.join(destination, file));
  // Only app assets and catalog-referenced diagrams are published.
  for (const directory of ['css', 'js', 'artwork']) {
    await copyAssets(path.join(root, 'assets', directory), path.join(destination, 'assets', directory));
  }
  const urls = new Set();
  for (const category of catalog.collections) for (const image of [category.cover, ...category.images]) {
    for (const key of ['original', 'micro', 'thumb', 'medium', 'large']) urls.add(image[key]);
  }
  for (const url of urls) {
    const relative = url.split('/').map(decodeURIComponent).join(path.sep);
    await mkdir(path.dirname(path.join(destination, relative)), { recursive: true });
    await cp(path.join(root, relative), path.join(destination, relative));
  }
  await writeFile(path.join(destination, '.nojekyll'), '');
  // A custom domain is opt-in, never inferred from local preview URLs.
  try {
    const domain = (await readFile(path.join(root, 'CNAME'), 'utf8')).trim();
    if (!/^[a-z0-9.-]+$/i.test(domain)) throw new Error('Invalid CNAME');
    await writeFile(path.join(destination, 'CNAME'), `${domain}\n`);
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  return destination;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildSite().then(destination => console.log(`Static site ready: ${destination}`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
