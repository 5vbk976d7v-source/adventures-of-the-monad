import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, readdir, access, copyFile, rename, stat } from 'node:fs/promises';
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
  const metadata = { id: 'sample', title: 'Sample', order: 1, cover: '01_sample image.png',
    images: [{ id: 'first', title: 'First diagram', file: '01_sample image.png' }] };
  const save = () => writeFile(path.join(category, 'folder.json'), JSON.stringify(metadata));
  await save();
  await sharp({ create: { width: 1800, height: 900, channels: 3, background: '#ade' } }).png().toFile(path.join(category, '01_sample image.png'));
  for (const name of ['css', 'js', 'artwork']) await mkdir(path.join(root, 'assets', name), { recursive: true });
  await writeFile(path.join(root, 'index.html'), '<html></html>');
  return { root, category, metadata, save };
}

test('build generates bounded derivatives, stable URLs and deterministic catalog', async t => {
  const { root } = await fixture(t);
  const catalog = await buildAtlas(root);
  const image = catalog.collections[0].images[0];
  assert.equal(image.original, 'diagrams/sample%20category/01_sample%20image.png');
  assert.equal(image.id, 'first');
  assert.deepEqual(catalog.collections[0].cover, image);
  for (const [preset, size] of [['micro', 320], ['thumb', 640], ['medium', 960], ['large', 1600]]) {
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
  metadata.images[0].file = '01_../escape.png';
  await save();
  await assert.rejects(buildAtlas(root), /file must start/);
  metadata.images[0].file = '01_sample image.png';
  metadata.images.push({ ...metadata.images[0] });
  await save();
  await assert.rejects(buildAtlas(root), /Duplicate diagram/);
  metadata.images.pop();
  await save();
  await symlink('01_sample image.png', path.join(category, '01_linked.png'));
  metadata.images[0].file = '01_linked.png';
  await save();
  await assert.rejects(buildAtlas(root), /no symlinks/);
});

test('small portrait derivatives honor EXIF orientation without upscaling or changing originals', async t => {
  const { root, category, metadata, save } = await fixture(t);
  const filename = path.join(category, '01_portrait.jpg');
  await sharp({ create: { width: 200, height: 100, channels: 3, background: '#abc' } })
    .withMetadata({ orientation: 6 }).jpeg().toFile(filename);
  const original = await readFile(filename);
  metadata.cover = metadata.images[0].file = '01_portrait.jpg';
  await rm(path.join(category, '01_sample image.png'));
  await save();
  const catalog = await buildAtlas(root);
  const image = catalog.collections[0].images[0];
  assert.equal(image.width, 100);
  assert.equal(image.height, 200);
  for (const preset of ['micro', 'thumb', 'medium', 'large']) {
    const info = await sharp(path.join(root, image[preset])).metadata();
    assert.equal(info.width, 100);
    assert.equal(info.height, 200);
  }
  assert.deepEqual(await readFile(filename), original);
});

test('discovers numbered and unnumbered uploads, preserves authored fields and is idempotent', async t => {
  const { root, category, metadata, save } = await fixture(t);
  metadata.images[0].caption = 'Authored caption';
  metadata.images[0].custom = 'preserved';
  await save();
  const source = path.join(category, metadata.cover);
  for (const name of ['05_Existing number.png', 'New diagram.png', 'first.png']) await copyFile(source, path.join(category, name));
  const catalog = await buildAtlas(root);
  const synced = JSON.parse(await readFile(path.join(category, 'folder.json')));
  assert.deepEqual(synced.images[0], metadata.images[0]);
  assert.deepEqual(synced.images.map(image => image.file), ['01_sample image.png', '05_Existing number.png', '06_New diagram.png', '07_first.png']);
  assert.deepEqual(synced.images.map(image => image.id), ['first', 'existing-number', 'new-diagram', 'first-2']);
  assert.equal(synced.images[2].title, 'New diagram');
  assert.equal(synced.images[2].caption, '');
  assert.equal(catalog.collections[0].images.length, 4);
  await assert.rejects(access(path.join(category, 'New diagram.png')), { code: 'ENOENT' });
  const before = await readFile(path.join(category, 'folder.json'), 'utf8');
  await buildAtlas(root);
  assert.equal(await readFile(path.join(category, 'folder.json'), 'utf8'), before);
});

test('numbers existing unprefixed references including cover and supports numbers above 99', async t => {
  const { root, category, metadata, save } = await fixture(t);
  await rename(path.join(category, metadata.cover), path.join(category, 'original.png'));
  metadata.cover = metadata.images[0].file = 'original.png';
  await save();
  await copyFile(path.join(category, 'original.png'), path.join(category, '99_last.png'));
  const catalog = await buildAtlas(root);
  const synced = JSON.parse(await readFile(path.join(category, 'folder.json')));
  assert.equal(synced.cover, '100_original.png');
  assert.equal(synced.images[0].file, '100_original.png');
  assert.equal(synced.images[0].id, 'first');
  assert.equal(catalog.collections[0].cover.id, 'first');
});

test('separate cover is not auto-imported and missing references fail without changing metadata', async t => {
  const { root, category, metadata, save } = await fixture(t);
  await copyFile(path.join(category, metadata.cover), path.join(category, 'cover.png'));
  metadata.cover = 'cover.png';
  await save();
  assert.equal((await buildAtlas(root)).collections[0].images.length, 1);
  await rm(path.join(category, metadata.images[0].file));
  const before = await readFile(path.join(category, 'folder.json'));
  await assert.rejects(buildAtlas(root), { code: 'ENOENT' });
  assert.deepEqual(await readFile(path.join(category, 'folder.json')), before);
});

test('duplicate prefixes and invalid uploads fail before numbering or metadata writes', async t => {
  const { root, category, metadata } = await fixture(t);
  const before = await readFile(path.join(category, 'folder.json'));
  await copyFile(path.join(category, metadata.cover), path.join(category, '01_duplicate.png'));
  await assert.rejects(buildAtlas(root), /duplicate number prefix/);
  await rm(path.join(category, '01_duplicate.png'));
  await writeFile(path.join(category, 'bad.png'), 'not an image');
  await assert.rejects(buildAtlas(root), /unsupported image format/i);
  await access(path.join(category, 'bad.png'));
  assert.deepEqual(await readFile(path.join(category, 'folder.json')), before);
});

test('asset cache reuses unchanged files, repairs missing/corrupt assets and replaces stale derivatives', async t => {
  const { root, category, metadata } = await fixture(t);
  const image = (await buildAtlas(root)).collections[0].images[0];
  const micro = path.join(root, image.micro), thumb = path.join(root, image.thumb), large = path.join(root, image.large);
  const oldMicro = await readFile(micro);
  const first = await stat(micro, { bigint: true });
  await buildAtlas(root);
  assert.equal((await stat(micro, { bigint: true })).mtimeNs, first.mtimeNs);
  await rm(thumb);
  await writeFile(large, 'broken');
  await buildAtlas(root);
  assert.equal((await stat(micro, { bigint: true })).mtimeNs, first.mtimeNs);
  assert.equal((await sharp(thumb).metadata()).width, 640);
  assert.equal((await sharp(large).metadata()).width, 1600);
  await sharp({ create: { width: 100, height: 100, channels: 3, background: '#f00' } }).png().toFile(path.join(category, metadata.cover));
  await buildAtlas(root);
  assert.notDeepEqual(await readFile(micro), oldMicro);
  assert.equal((await sharp(micro).metadata()).width, 100);
});

test('obsolete owned derivatives are removed and output symlinks rejected', async t => {
  const { root, category, metadata, save } = await fixture(t);
  await copyFile(path.join(category, metadata.cover), path.join(category, 'second.png'));
  const catalog = await buildAtlas(root);
  const second = catalog.collections[0].images[1];
  await rm(path.join(category, '02_second.png'));
  await save();
  await buildAtlas(root);
  await assert.rejects(access(path.join(root, second.micro)), { code: 'ENOENT' });
  const micro = path.join(root, catalog.collections[0].images[0].micro);
  await rm(micro);
  const original = await readFile(path.join(category, metadata.cover));
  await symlink(path.join(category, metadata.cover), micro);
  await assert.rejects(buildAtlas(root), /no symlinks/);
  assert.deepEqual(await readFile(path.join(category, metadata.cover)), original);
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
  assert.deepEqual(await readdir(path.join(site, 'diagrams', 'sample category')), ['01_sample image.png']);
  await access(path.join(site, 'assets', 'diagrams', 'sample', 'first-large.webp'));
});
