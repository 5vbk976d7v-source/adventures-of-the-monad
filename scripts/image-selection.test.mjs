import test from 'node:test';
import assert from 'node:assert/strict';
import { imagePreset, loadSizedImage } from '../assets/js/atlas-images.js';

const record = { width: 1600, height: 1000, micro: 'micro.webp', thumb: 'thumb.webp', medium: 'medium.webp', large: 'large.webp', original: 'original.png' };

test('image selection accounts for pixels, density and portrait source proportions', () => {
  assert.equal(imagePreset(record, 100, 80, 1), 'micro');
  assert.equal(imagePreset(record, 200, 160, 2), 'thumb');
  assert.equal(imagePreset(record, 350, 280, 2), 'medium');
  assert.equal(imagePreset(record, 100, 80, 4), 'micro');
  assert.equal(imagePreset({ ...record, width: 400, height: 1600 }, 150, 120), 'thumb');
});

test('detail uses derivatives, shrinking reuses loaded images and a different diagram resets selection', () => {
  const image = { dataset: {}, getAttribute() { return this.src; } };
  loadSizedImage(image, record, 900, 720, 2);
  assert.equal(image.src, 'large.webp');
  loadSizedImage(image, record, 50, 40, 1);
  assert.equal(image.src, 'large.webp');
  loadSizedImage(image, { ...record, original: 'second.png', micro: 'second-micro.webp' }, 50, 40, 1);
  assert.equal(image.src, 'second-micro.webp');
  loadSizedImage(image, { ...record, original: 'second.png' }, 200, 160, 2);
  assert.equal(image.src, 'thumb.webp');
});
