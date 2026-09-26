import { cp, mkdir, readdir, readFile, writeFile, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  const destination = path.join(root, '_site');
  await rm(destination, { recursive: true, force: true });
  await mkdir(destination);
  await cp(path.join(root, 'index.html'), path.join(destination, 'index.html'));
  await cp(path.join(root, 'favicon.ico'), path.join(destination, 'favicon.ico'));
  await cp(path.join(root, 'atlas.json'), path.join(destination, 'atlas.json'));
  for (const directory of ['css', 'js', 'artwork', 'config']) {
    await copyAssets(path.join(root, 'assets', directory), path.join(destination, 'assets', directory));
  }
  await writeFile(path.join(destination, '.nojekyll'), '');
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
