export function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function diagramTitle(item, index = 0) {
  return safeText(item?.title, `Diagram ${String(index + 1).padStart(2, '0')}`);
}

export function catalogEndpoint(config, location = window.location) {
  const url = new URL(location.href);
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if (isLocal && url.searchParams.get('media') === 'php') {
    return 'http://127.0.0.1:7071/catalog.php';
  }
  if (isLocal && url.searchParams.get('media') === 'simulator') {
    return new URL('atlas-media/catalog.php', location.href).href;
  }
  const host = location.hostname.toLowerCase();
  const key = host === 'localhost' || host === '127.0.0.1' ? 'development'
    : host === 'jder7.github.io' ? 'testing' : 'production';
  const endpoint = config?.[key];
  if (typeof endpoint !== 'string' || !endpoint.trim()) throw new Error(`Atlas ${key} catalog endpoint is not configured`);
  return new URL(endpoint, location.href).href;
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Atlas request: ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timeout); }
}

export async function loadCatalog(emptyEl) {
  const config = await fetchJson(new URL('assets/config/media-endpoints.json', document.baseURI), { cache: 'no-cache' });
  const endpoint = catalogEndpoint(config);
  const local = new URL(endpoint).origin === window.location.origin;
  const catalog = await fetchJson(endpoint, { cache: 'no-cache', credentials: local ? 'same-origin' : 'omit' });
  const validImage = image => image && typeof image.id === 'string'
    && ['original', 'micro', 'thumb', 'medium', 'large'].every(key => typeof image[key] === 'string' && image[key]);
  if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.collections)
      || catalog.collections.some(category => !category || typeof category.id !== 'string'
        || typeof category.title !== 'string' || !validImage(category.cover)
        || !Array.isArray(category.images) || category.images.some(image => !validImage(image)))) {
    throw new Error('Invalid Atlas catalog');
  }
  emptyEl.hidden = true;
  return catalog;
}

export function readDiagramLink(location = window.location) {
  const value = new URL(location.href).searchParams.get('diagram');
  if (!value) return null;
  const separator = value.indexOf('/');
  if (separator < 1 || separator === value.length - 1) return null;
  return { categoryId: value.slice(0, separator), diagramId: value.slice(separator + 1) };
}

export function buildDiagramLink(category, diagram, location = window.location) {
  if (!category || !diagram) return '';
  const url = new URL(location.href);
  url.searchParams.set('diagram', `${category.id}/${diagram.id}`);
  url.hash = '';
  return url.href;
}

export function clearDiagramLink(location = window.location) {
  const url = new URL(location.href);
  if (!url.searchParams.has('diagram')) return;
  url.searchParams.delete('diagram');
  window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
}

export function findDiagramFromLink(catalog, link) {
  if (!catalog || !link) return null;
  const category = catalog.collections.find(item => String(item.id) === link.categoryId);
  if (!category || !Array.isArray(category.images)) return null;
  const index = category.images.findIndex(item => String(item.id) === link.diagramId);
  return index < 0 ? null : { category, diagram: category.images[index], index };
}
