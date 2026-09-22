import test from 'node:test';
import assert from 'node:assert/strict';
import { catalogEndpoint } from '../assets/js/atlas-catalog.js';

const config = { development: 'catalog.json', production: 'https://example.test/catalog.php' };

test('local PHP mode points the UI at the separate media server', () => {
  const location = new URL('http://127.0.0.1:7070/?media=php');
  assert.equal(catalogEndpoint(config, location), 'http://127.0.0.1:7071/catalog.php');
});

test('local production mode points at the configured production media server', () => {
  const location = new URL('http://127.0.0.1:7070/?media=production');
  assert.equal(catalogEndpoint(config, location), 'https://example.test/catalog.php');
});

test('local simulator mode stays same-origin', () => {
  const location = new URL('http://127.0.0.1:7070/?media=simulator');
  assert.equal(catalogEndpoint(config, location), 'http://127.0.0.1:7070/atlas-media/catalog.php');
});
