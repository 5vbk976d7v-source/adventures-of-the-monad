const PRESETS = [['micro', 320], ['thumb', 640], ['medium', 960], ['large', 1600]];

// Account for both displayed axes, source proportions and high-density screens.
export function imagePreset(record, width, height, pixelRatio = 1) {
  const density = Math.min(2, Math.max(1, pixelRatio || 1));
  const longest = Math.max(record?.width || width, record?.height || height, 1);
  const needed = Math.max(width / (record?.width || longest), height / (record?.height || longest)) * longest * density;
  return (PRESETS.find(([, size]) => size >= needed) || PRESETS.at(-1))[0];
}

export function loadSizedImage(image, record, width, height, pixelRatio = 1) {
  if (!record) return;
  const preset = imagePreset(record, width, height, pixelRatio);
  const rank = PRESETS.findIndex(([name]) => name === preset);
  const identity = record.original || record.large || record.thumb || record.micro;
  // Shrinking a node should reuse an already loaded larger image, not fetch again.
  if (image.dataset.record === identity && Number(image.dataset.resolution) >= rank) return;
  const src = record[preset] || record.large || record.thumb || record.micro || record.original;
  if (!src) return;
  image.dataset.record = identity;
  image.dataset.resolution = String(rank);
  image.decoding = 'async';
  if (image.getAttribute('src') !== src) image.src = src;
}
