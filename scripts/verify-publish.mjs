import { readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = path.join(ROOT, 'diagrams');
const catalogPath = path.join(ROOT, 'atlas.json');
const localPath = value => path.join(ROOT, decodeURIComponent(value).split('/').join(path.sep));

async function regularFile(file, label) {
  try {
    if (!(await lstat(file)).isFile()) throw new Error(`${label} is not a regular file`);
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`${label} is missing: ${path.relative(ROOT, file)}`);
    throw error;
  }
}

const sourceEntries = await (await import('node:fs/promises')).readdir(sourceRoot, { withFileTypes: true });
for (const entry of sourceEntries.filter(item => item.isDirectory() && !item.name.startsWith('.'))) {
  const directory = path.join(sourceRoot, entry.name);
  const metadataPath = path.join(directory, 'folder.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  await regularFile(metadataPath, `${entry.name}/folder.json`);
  await regularFile(path.join(directory, metadata.cover), `${metadata.id} cover`);
  for (const image of metadata.images) await regularFile(path.join(directory, image.file), `${metadata.id}/${image.id}`);
}

const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
for (const category of catalog.collections) {
  for (const image of [category.cover, ...category.images]) {
    for (const key of ['original', 'micro', 'thumb', 'medium', 'large']) {
      await regularFile(localPath(image[key]), `${category.id}/${image.id || 'cover'} ${key}`);
    }
  }
}
console.log('Publish consistency check passed: source references and generated catalog assets are complete.');
