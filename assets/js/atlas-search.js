import { diagramTitle } from './atlas-catalog.js';

export function createDiagramSearch({ input, results, getCategory, onSelect }) {
  let items = [];
  let highlighted = -1;

  const close = () => {
    results.hidden = true;
    results.replaceChildren();
    highlighted = -1;
  };

  const matchingItems = () => {
    const query = input.value.trim().toLocaleLowerCase();
    if (!query) return [];
    return items
      .map((entry, index) => {
        const diagram = entry.diagram || entry;
        return { entry, index, diagram, title: diagramTitle(diagram, entry.index ?? index), category: entry.category };
      })
      .filter(item => item.title.toLocaleLowerCase().includes(query))
      .slice(0, 8);
  };

  const render = () => {
    const matches = matchingItems();
    results.replaceChildren();
    highlighted = -1;
    if (!matches.length) {
      results.hidden = true;
      return;
    }
    matches.forEach((match, index) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = 'atlas-search__option';
      option.setAttribute('role', 'option');
      option.dataset.index = String(match.index);
      const title = document.createElement('span');
      title.textContent = match.title;
      const category = document.createElement('small');
      category.textContent = match.category?.title || getCategory()?.title || 'DIAGRAM';
      option.append(title, category);
      option.addEventListener('click', () => {
        input.value = match.title;
        close();
        onSelect(match.entry);
      });
      results.appendChild(option);
      if (index === 0) option.setAttribute('aria-selected', 'false');
    });
    results.hidden = false;
  };

  const moveHighlight = direction => {
    const options = [...results.querySelectorAll('.atlas-search__option')];
    if (!options.length) return;
    highlighted = (highlighted + direction + options.length) % options.length;
    options.forEach((option, index) => option.setAttribute('aria-selected', String(index === highlighted)));
  };

  input.addEventListener('input', render);
  input.addEventListener('focus', render);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter') {
      const option = results.querySelectorAll('.atlas-search__option')[highlighted];
      if (option) { event.preventDefault(); option.click(); }
    } else if (event.key === 'Escape') {
      close();
      input.blur();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.atlas-search')) close();
  });

  return {
    setItems(nextItems) {
      items = Array.isArray(nextItems) ? nextItems : [];
      input.disabled = !items.length;
      input.value = '';
      close();
    },
    close
  };
}
