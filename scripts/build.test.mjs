import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir, access } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite } from './build-site.mjs';

test('Pages build packages only the UI and public media endpoint config', async t => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'atlas-pages-build-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(path.join(root, 'index.html'), '<!doctype html><title>Atlas</title>');
  await writeFile(path.join(root, 'favicon.ico'), 'icon');
  await writeFile(path.join(root, 'CNAME'), 'atlas.example.test');
  for (const directory of ['css', 'js', 'artwork', 'config', 'diagrams', 'fixtures', 'php']) {
    await mkdir(path.join(root, 'assets', directory), { recursive: true });
  }
  await writeFile(path.join(root, 'assets/css/atlas.css'), 'body{}');
  await writeFile(path.join(root, 'assets/js/atlas.js'), '');
  await writeFile(path.join(root, 'assets/artwork/mark.webp'), 'image');
  await writeFile(path.join(root, 'assets/config/media-endpoints.json'), '{"production":"https://example.test/catalog.php"}');
  await writeFile(path.join(root, 'assets/fixtures/catalog.json'), '{"collections":[]}');
  await writeFile(path.join(root, 'assets/php/catalog.php'), '<?php');
  await writeFile(path.join(root, 'atlas.json'), '{"old":"catalog"}');
  await writeFile(path.join(root, 'diagrams/category/image.png'), 'original', { flag: 'w' }).catch(async () => {
    await mkdir(path.join(root, 'diagrams/category'), { recursive: true });
    await writeFile(path.join(root, 'diagrams/category/image.png'), 'original');
  });

  const site = await buildSite(root);
  assert.deepEqual((await readdir(site)).sort(), ['.nojekyll', 'CNAME', 'assets', 'favicon.ico', 'index.html']);
  assert.equal(await readFile(path.join(site, 'favicon.ico'), 'utf8'), 'icon');
  assert.deepEqual((await readdir(path.join(site, 'assets'))).sort(), ['artwork', 'config', 'css', 'js']);
  assert.equal(JSON.parse(await readFile(path.join(site, 'assets/config/media-endpoints.json'), 'utf8')).production,
    'https://example.test/catalog.php');
  await assert.rejects(access(path.join(site, 'diagrams')));
  await assert.rejects(access(path.join(site, 'atlas.json')));
  await assert.rejects(access(path.join(site, 'assets/fixtures')));
  await assert.rejects(access(path.join(site, 'assets/php')));
});
