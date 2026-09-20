import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { buildAtlas } from './build-atlas.mjs';
import { buildSite } from './build-site.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const category = path.join(root, 'diagrams', 'sample category');
  await mkdir(category, { recursive: true });
  const metadata = { id: 'sample', title: 'Sample', order: 1, cover: 'sample image.png',
    images: [{ id: 'first', title: 'First diagram', file: 'sample image.png' }] };
  const save = () => writeFile(path.join(category, 'folder.json'), JSON.stringify(metadata));
  await save();
  await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#ade' } }).png().toFile(path.join(category, 'sample image.png'));
  for (const name of ['css', 'js', 'artwork']) await mkdir(path.join(root, 'assets', name), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<html></html>');
  return { root, category, metadata, save };
}

test('build generates bounded derivatives, stable URLs and deterministic catalog', async t => {
  const { root } = await fixture(t);
  const catalog = await buildAtlas(root);
  const image = catalog.collections[0].images[0];
  assert.equal(image.original, 'diagrams/sample%20category/sample%20image.png');
  assert.equal(image.id, 'first');
  assert.deepEqual(catalog.collections[0].cover, image);
  for (const [preset, size] of [['micro', 320], ['thumb', 640], ['large', 1600]]) {
    const info = await sharp(path.join(root, image[preset])).metadata();
    assert.equal(info.width, size);
    assert.equal(info.height, size / 2);
    assert.equal(info.format, 'webp');
  }
  const first = await readFile(path.join(root, 'atlas.json'), 'utf8');
  await buildAtlas(root);
  assert.equal(await readFile(path.join(root, 'atlas.json'), 'utf8'), first);
});

test('rejects traversal, duplicate IDs and symlinked source images', async t => {
  const { root, category, metadata, save } = await fixture(t);
  metadata.images[0].file = '../escape.png';
  await save();
  await assert.rejects(buildAtlas(root), /same-folder/);
  metadata.images[0].file = 'sample image.png';
  metadata.images.push({ ...metadata.images[0] });
  await save();
  await assert.rejects(buildAtlas(root), /Duplicate diagram/);
  metadata.images.pop();
  await save();
  await symlink('sample image.png', path.join(category, 'linked.png'));
  metadata.images[0].file = 'linked.png';
  await save();
  await assert.rejects(buildAtlas(root), /no symlinks/);
});

test('small portrait derivatives honor EXIF orientation without upscaling or changing originals', async t => {
  const { root, category, metadata, save } = await fixture(t);
  const filename = path.join(category, 'portrait.jpg');
  await sharp({ create: { width: 200, height: 100, channels: 3, background: '#abc' } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(filename);
  const original = await readFile(filename);
  metadata.cover = metadata.images[0].file = 'portrait.jpg';
  await save();
  const catalog = await buildAtlas(root);
  const image = catalog.collections[0].images[0];
  assert.equal(image.width, 100);
  assert.equal(image.height, 200);
  for (const preset of ['micro', 'thumb', 'large']) {
    const info = await sharp(path.join(root, image[preset])).metadata();
    assert.equal(info.width, 100);
    assert.equal(info.height, 200);
  }
  assert.deepEqual(await readFile(filename), original);
});

test('deployment includes only app assets and referenced originals, excludes metadata and backups', async t => {
  const { root, category } = await fixture(t);
  await writeFile(path.join(category, 'private.txt'), 'not public');
  await mkdir(path.join(root, 'backups'));
  await writeFile(path.join(root, 'backups', 'legacy.php'), 'private');
  await writeFile(path.join(root, 'assets', 'js', 'atlas.js'), 'export {};');
  await writeFile(path.join(root, 'assets', 'js', 'unexpected.php'), 'private');
  await symlink(path.join(root, 'backups', 'legacy.php'), path.join(root, 'assets', 'js', 'linked.js'));
  const site = await buildSite(root);
  assert.deepEqual((await readdir(site)).sort(), ['.nojekyll', 'assets', 'atlas.json', 'diagrams', 'index.html']);
  assert.deepEqual(await readdir(path.join(site, 'assets', 'js')), ['atlas.js']);
  assert.deepEqual(await readdir(path.join(site, 'diagrams', 'sample category')), ['sample image.png']);
  await access(path.join(site, 'assets', 'diagrams', 'sample', 'first-large.webp'));
});
