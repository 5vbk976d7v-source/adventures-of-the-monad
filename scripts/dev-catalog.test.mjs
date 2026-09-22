import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildDevelopmentCatalog } from './dev-catalog.mjs';

test('Node development catalog discovers uploads, honors metadata and does not mutate sources', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-node-catalog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const diagrams = path.join(root, 'diagrams');
  const category = path.join(diagrams, '01_sample-category');
  await mkdir(category, { recursive: true });
  const metadataPath = path.join(category, 'folder.json');
  const metadata = { id: 'sample-category', title: 'Sample Category', order: 4, cover: '02_second.png', images: [
    { id: 'authored-id', title: 'Authored Diagram', file: '01_first.png', caption: 'A caption' }
  ] };
  await writeFile(metadataPath, JSON.stringify(metadata));
  const pngHeader = Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001', 'hex');
  await writeFile(path.join(category, '01_first.png'), pngHeader);
  await writeFile(path.join(category, '02_second.png'), pngHeader);
  await writeFile(path.join(category, '10_last.webp'), Buffer.from('RIFF0000WEBPVP8 '));
  await writeFile(path.join(category, '.hidden.png'), pngHeader);
  await writeFile(path.join(category, '11_in-progress.png'), 'partial');
  await symlink(path.join(category, '01_first.png'), path.join(category, '03_symlink.png'));

  const before = await readFile(metadataPath, 'utf8');
  const catalog = await buildDevelopmentCatalog(diagrams, 'aom-atlas');
  assert.equal(catalog.provider, 'node-development');
  assert.equal(catalog.collections.length, 1);
  const collection = catalog.collections[0];
  assert.equal(collection.id, 'sample-category');
  assert.equal(collection.title, 'Sample Category');
  assert.equal(collection.order, 4);
  assert.deepEqual(collection.images.map(image => image.id), ['authored-id', 'second', 'last']);
  assert.equal(collection.images[0].title, 'Authored Diagram');
  assert.equal(collection.images[0].caption, 'A caption');
  assert.equal(collection.cover.id, 'second');
  assert.match(collection.images[1].original, /^\/aom-atlas\/diagrams\//);
  assert.equal(collection.images[1].micro, collection.images[1].original);
  assert.equal(await readFile(metadataPath, 'utf8'), before);
  assert.deepEqual((await readdir(category)).includes('folder.json'), true);
});

test('Hostinger simulator catalog publishes same-origin PHP-shaped image URLs', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-node-simulator-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const category = path.join(root, 'diagrams', '01_sample-category');
  await mkdir(category, { recursive: true });
  await writeFile(path.join(category, '01_sample.png'), Buffer.from('89504e470d0a1a0a0000000d494844520000000100000001', 'hex'));

  const catalog = await buildDevelopmentCatalog(path.join(root, 'diagrams'), 'aom-atlas', {
    mediaBaseUrl: 'http://127.0.0.1:8080/aom-atlas/atlas-media', provider: 'node-hostinger-simulator'
  });
  const image = catalog.collections[0].images[0];
  assert.equal(catalog.provider, 'node-hostinger-simulator');
  for (const preset of ['original', 'micro', 'thumb', 'medium', 'large']) {
    const url = new URL(image[preset]);
    assert.equal(url.pathname, '/aom-atlas/atlas-media/image.php');
    assert.equal(url.searchParams.get('file'), 'diagrams/01_sample-category/01_sample.png');
    assert.equal(url.searchParams.get('preset'), preset);
    assert.ok(url.searchParams.get('v'));
  }
});
