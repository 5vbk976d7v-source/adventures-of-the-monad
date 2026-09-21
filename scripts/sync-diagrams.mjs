import { readdir, readFile, writeFile, lstat, rename } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const IMAGE = /\.(png|jpe?g|webp)$/i;
const PREFIX = /^(\d+)_/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const stem = file => file.replace(PREFIX, '').replace(IMAGE, '');
const slug = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'diagram';

export async function regularFile(filename) {
  if (!(await lstat(filename)).isFile()) throw new Error(`Expected regular file (no symlinks): ${filename}`);
}

// Plan every category before mutating sources. Existing IDs, metadata and array order win.
export async function syncDiagrams(root) {
  const source = path.join(root, 'diagrams');
  if (!(await lstat(source)).isDirectory()) throw new Error('diagrams must be a real directory');
  const entries = (await readdir(source, { withFileTypes: true })).filter(e => !e.name.startsWith('.'));
  if (entries.some(e => e.isSymbolicLink())) throw new Error('Category symlinks are not allowed');
  const plans = [];
  const categoryIds = new Set();
  for (const entry of entries.filter(e => e.isDirectory()).sort((a, b) => compare(a.name, b.name))) {
    const directory = path.join(source, entry.name);
    const metadataPath = path.join(directory, 'folder.json');
    await regularFile(metadataPath);
    const original = await readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(original);
    if (typeof metadata.id !== 'string' || !ID.test(metadata.id) || categoryIds.has(metadata.id)) throw new Error(`Invalid or duplicate category id: ${metadata.id}`);
    categoryIds.add(metadata.id);
    if (typeof metadata.title !== 'string' || !metadata.title.trim() || !Number.isFinite(metadata.order)) {
      throw new Error(`${entry.name}: requires title and numeric order`);
    }
    if (!Array.isArray(metadata.images)) throw new Error(`${entry.name}: requires an images array`);
    const safeFile = file => typeof file === 'string' && !file.startsWith('.') && !/[/\\]/.test(file) && IMAGE.test(file);
    const files = (await readdir(directory)).filter(file => !file.startsWith('.') && IMAGE.test(file)).sort(compare);
    const numbers = new Set();
    let maximum = 0;
    for (const file of files) {
      await regularFile(path.join(directory, file));
      const prefix = file.match(PREFIX);
      if (prefix) {
        const number = Number(prefix[1]);
        if (!Number.isSafeInteger(number) || number < 1 || numbers.has(number)) throw new Error(`${entry.name}: invalid or duplicate number prefix ${prefix[1]}`);
        numbers.add(number);
        maximum = Math.max(maximum, number);
      }
    }
    const ids = new Set(), listed = new Set();
    for (const image of metadata.images) {
      if (typeof image.id !== 'string' || !ID.test(image.id) || ids.has(image.id)) throw new Error(`Duplicate diagram or invalid id: ${image.id}`);
      ids.add(image.id);
      if (typeof image.title !== 'string' || !image.title.trim()) throw new Error(`${image.id}: title is required`);
      if (!safeFile(image.file)) throw new Error(`${image.id}: file must start with a safe same-folder filename`);
      if (listed.has(image.file)) throw new Error(`Duplicate image file: ${image.file}`);
      listed.add(image.file);
      await regularFile(path.join(directory, image.file));
    }
    if (!safeFile(metadata.cover)) throw new Error(`${entry.name}: cover must be a same-folder image filename`);
    await regularFile(path.join(directory, metadata.cover));
    // A separate cover stays a cover, rather than becoming an extra diagram.
    const added = files.filter(file => !listed.has(file) && file !== metadata.cover)
      .sort((a, b) => (Number(a.match(PREFIX)?.[1]) || Infinity) - (Number(b.match(PREFIX)?.[1]) || Infinity) || compare(a, b));
    for (const file of added) {
      const base = slug(stem(file));
      let id = base, suffix = 2;
      while (ids.has(id)) id = `${base}-${suffix++}`;
      ids.add(id);
      const title = stem(file).replace(/[-_]+/g, ' ').trim() || 'Diagram';
      metadata.images.push({ id, title: title.charAt(0).toUpperCase() + title.slice(1), file, caption: '' });
    }
    if (!metadata.images.length) throw new Error(`${entry.name}: requires images`);
    const renames = [];
    for (const image of metadata.images) {
      if (PREFIX.test(image.file)) continue;
      if (!Number.isSafeInteger(maximum + 1)) throw new Error('Image sequence exhausted');
      const from = image.file;
      image.file = `${String(++maximum).padStart(2, '0')}_${from}`;
      renames.push([from, image.file]);
      if (metadata.cover === from) metadata.cover = image.file;
    }
    // Reject unreadable/animated sources before renaming or changing any metadata.
    for (const file of files) {
      const info = await sharp(path.join(directory, file), { limitInputPixels: 100_000_000 }).metadata();
      if (!['png', 'jpeg', 'webp'].includes(info.format) || (info.pages || 1) > 1) throw new Error(`Unsupported/animated source image: ${file}`);
    }
    plans.push({ directory, metadataPath, original, metadata, renames });
  }
  if (!plans.length) throw new Error('No diagram categories found');
  for (const plan of plans) {
    for (const [from, to] of plan.renames) await rename(path.join(plan.directory, from), path.join(plan.directory, to));
    if (JSON.stringify(JSON.parse(plan.original)) !== JSON.stringify(plan.metadata)) {
      await writeFile(plan.metadataPath, `${JSON.stringify(plan.metadata, null, 2)}\n`);
    }
  }
}
