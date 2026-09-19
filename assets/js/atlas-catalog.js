export function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function diagramTitle(item, index = 0) {
  return safeText(item?.title, `Diagram ${String(index + 1).padStart(2, '0')}`);
}

function demoCatalog() {
  return {
    demo: true,
    collections: Array.from({ length: 16 }, (_, i) => ({
      id: String(i + 1).padStart(2, '0'),
      title: `Consciousness Field ${String(i + 1).padStart(2, '0')}`,
      description: '',
      cover: null,
      images: Array.from({ length: 18 }, (__, j) => ({
        id: `${String(i + 1).padStart(2, '0')}.${String(j + 1).padStart(2, '0')}`,
        title: `Diagram ${String(j + 1).padStart(2, '0')}`,
        caption: '', original: null, micro: null, thumb: null, large: null,
        width: 1600, height: 1000
      }))
    }))
  };
}

async function fetchCatalog(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const data = await res.json();
  if (!data || !Array.isArray(data.collections) || data.collections.length === 0) {
    throw new Error(`${url}: empty catalog`);
  }
  return data;
}

export async function loadCatalog(emptyEl) {
  for (const source of ['catalog.php', 'catalog.json']) {
    try {
      const catalog = await fetchCatalog(source);
      emptyEl.hidden = true;
      return catalog;
    } catch (_) {
      // Try the next independent catalog provider.
    }
  }
  emptyEl.hidden = false;
  return demoCatalog();
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
