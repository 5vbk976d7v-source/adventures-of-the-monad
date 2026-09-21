import { readdir, readFile, writeFile, mkdir, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { syncDiagrams, regularFile } from './sync-diagrams.mjs';
import { imageAssets, PRESETS } from './image-assets.mjs';

const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const IMAGE = /\.(png|jpe?g|webp)$/i;
const NUMBERED_IMAGE = /^(\d+)_[^/\\]+\.(png|jpe?g|webp)$/i;
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const urlPath = (...parts) => parts.map(encodeURIComponent).join('/');
function requiredText(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} must be nonempty text`);
  return value.trim();
}
function stableId(value, label) {
  if (typeof value !== 'string' || !ID.test(value)) throw new Error(`${label} must be a lowercase slug`);
  return value;
}
// Discover new originals first; existing stable IDs and authored metadata are preserved.
export async function buildAtlas(root = ROOT) {
  await syncDiagrams(root);
  const source = path.join(root, 'diagrams');
  if (!(await lstat(source)).isDirectory()) throw new Error('diagrams must be a real directory');
  const entries = (await readdir(source, { withFileTypes: true }))
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const categories = [];
  const categoryIds = new Set();
  for (const entry of entries) {
    const directory = path.join(source, entry.name);
    const metadataPath = path.join(directory, 'folder.json');
    await regularFile(metadataPath);
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const id = stableId(metadata.id, `${entry.name} id`);
    if (categoryIds.has(id)) throw new Error(`Duplicate category id: ${id}`);
    categoryIds.add(id);
    requiredText(metadata.title, `${id} title`);
    if (!Number.isFinite(metadata.order)) throw new Error(`${id} order must be a finite number`);
    if (!Array.isArray(metadata.images) || !metadata.images.length) throw new Error(`${id} requires images`);
    const ids = new Set();
    for (const image of metadata.images) {
      stableId(image.id, `${id} diagram id`);
      if (ids.has(image.id)) throw new Error(`Duplicate diagram id: ${id}/${image.id}`);
      ids.add(image.id);
      requiredText(image.title, `${id}/${image.id} title`);
      const numbered = typeof image.file === 'string' && image.file.match(NUMBERED_IMAGE);
      if (!numbered) {
        throw new Error(`${id}/${image.id}: file must start with a numeric prefix`);
      }
    }
    const files = new Set([...metadata.images.map(image => image.file), metadata.cover]);
    for (const file of files) {
      if (typeof file !== 'string' || file.startsWith('.') || /[/\\]/.test(file) || !IMAGE.test(file)) {
        throw new Error(`${id}: image and cover files must be same-folder PNG/JPEG/WebP filenames`);
      }
      await regularFile(path.join(directory, file));
    }
    categories.push({ directory, folder: entry.name, metadata });
  }
  if (!categories.length) throw new Error('No diagram categories found');
  categories.sort((a, b) => a.metadata.order - b.metadata.order || a.metadata.id.localeCompare(b.metadata.id, 'en'));
  const output = path.join(root, 'assets', 'diagrams');
  if (!(await lstat(path.join(root, 'assets'))).isDirectory()) throw new Error('assets must be a real directory');
  await mkdir(output, { recursive: true });
  // Never traverse a substituted output symlink.
  if (!(await lstat(output)).isDirectory()) throw new Error('assets/diagrams must be a real directory');
  const assets = await imageAssets(output);
  const collections = [];
  for (const { directory, folder, metadata } of categories) {
    const categoryOutput = path.join(output, metadata.id);
    await mkdir(categoryOutput, { recursive: true });
    if (!(await lstat(categoryOutput)).isDirectory()) throw new Error('Derivative directory cannot be a symlink');
    const recordsByFile = new Map();
    async function processImage(image) {
      const input = path.join(directory, image.file);
      const options = { limitInputPixels: 100_000_000 };
      const info = await sharp(input, options).metadata();
      if (!['png', 'jpeg', 'webp'].includes(info.format) || (info.pages || 1) > 1) {
        throw new Error(`Unsupported/animated source image: ${input}`);
      }
      const swapped = info.orientation >= 5 && info.orientation <= 8;
      const record = {
        id: image.id, title: image.title.trim(), caption: typeof image.caption === 'string' ? image.caption.trim() : '',
        original: urlPath('diagrams', folder, image.file),
        width: swapped ? info.height : info.width, height: swapped ? info.width : info.height
      };
      await assets.generate(input, categoryOutput, image.id);
      for (const preset of Object.keys(PRESETS)) {
        const filename = `${image.id}-${preset}.webp`;
        record[preset] = urlPath('assets', 'diagrams', metadata.id, filename);
      }
      recordsByFile.set(image.file, record);
      return record;
    }
    const images = [];
    for (const image of metadata.images) images.push(await processImage(image));
    let cover = recordsByFile.get(metadata.cover);
    if (!cover) {
      let coverId = 'category-cover';
      while (metadata.images.some(image => image.id === coverId)) coverId += '-cover';
      cover = await processImage({ id: coverId, title: metadata.title, file: metadata.cover });
    }
    collections.push({ id: metadata.id, title: metadata.title.trim(),
      description: typeof metadata.description === 'string' ? metadata.description.trim() : '',
      cover, images });
  }
  const catalog = { version: 1, collections };
  await assets.finish();
  await writeFile(path.join(root, 'atlas.json'), `${JSON.stringify(catalog, null, 2)}\n`);
  return catalog;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildAtlas().then(catalog => console.log(`Built ${catalog.collections.length} categories / ${catalog.collections.reduce((sum, c) => sum + c.images.length, 0)} diagrams`))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
