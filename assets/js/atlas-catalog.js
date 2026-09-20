export function safeText(value, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function diagramTitle(item, index = 0) {
  return safeText(item?.title, `Diagram ${String(index + 1).padStart(2, '0')}`);
}

// The same prebuilt catalog is served locally and on GitHub Pages.
export async function loadCatalog(emptyEl) {
  const res = await fetch('atlas.json', { cache: 'no-cache', credentials: 'same-origin' });
  if (!res.ok) throw new Error(`Atlas catalog: ${res.status}`);
  const catalog = await res.json();
  if (!catalog || !Array.isArray(catalog.collections)
      || catalog.collections.some(category => !category.id || !Array.isArray(category.images))) {
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
