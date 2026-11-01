// Search, filter and sort, shared by the index and map pages. The first half is pure logic
// over plain items; connectControls below binds it to a form and the URL.
//
// A field is { key, itemKeys, options } or { key, itemKeys, categories }, where categories
// maps each category name to its specific values. An item is
// { title, city, year, search, values }, where values is keyed by itemKeys.

const DEFAULT_SORT = 'title';
const URL_UPDATE_DELAY = 250;

// Without this, typing "Merida" wouldn't find "Mérida".
export const normaliseText = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

export const emptyState = (fields) => ({
  q: '',
  sort: DEFAULT_SORT,
  selected: Object.fromEntries(fields.map((field) => [field.key, new Set()])),
});

const fieldValues = (field) =>
  field.categories ? Object.values(field.categories).flat() : (field.options ?? []);

export function parseQuery(search, fields, sortKeys = [DEFAULT_SORT]) {
  const params = new URLSearchParams(search);
  const state = emptyState(fields);
  state.q = params.get('q') ?? '';
  if (sortKeys.includes(params.get('sort'))) state.sort = params.get('sort');

  // A shared link can outlive a taxonomy change, so unknown values are dropped.
  for (const field of fields) {
    const known = new Set(fieldValues(field));
    for (const value of params.getAll(field.key)) {
      const members = field.categories?.[value] ?? (known.has(value) ? [value] : []);
      members.forEach((member) => state.selected[field.key].add(member));
    }
  }
  return state;
}

export function serialiseQuery(state, fields) {
  const params = new URLSearchParams();
  if (state.q.trim()) params.set('q', state.q.trim());

  for (const field of fields) {
    const remaining = new Set(state.selected[field.key]);
    // A whole category is written as its name, which keeps shared links short and readable.
    for (const [category, members] of Object.entries(field.categories ?? {})) {
      if (members.every((member) => remaining.has(member))) {
        params.append(field.key, category);
        members.forEach((member) => remaining.delete(member));
      }
    }
    remaining.forEach((value) => params.append(field.key, value));
  }

  if (state.sort !== DEFAULT_SORT) params.set('sort', state.sort);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function matchesItem(item, state, fields) {
  const terms = normaliseText(state.q).split(/\s+/).filter(Boolean);
  const haystack = normaliseText(item.search);
  if (!terms.every((term) => haystack.includes(term))) return false;

  // OR within a field, AND across fields.
  return fields.every((field) => {
    const selected = state.selected[field.key];
    if (selected.size === 0) return true;
    return field.itemKeys.some((key) => [item.values[key]].flat().some((value) => selected.has(value)));
  });
}

const compareText = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true });

const SORTERS = {
  title: (a, b) => compareText(a.title, b.title),
  city: (a, b) => compareText(a.city, b.city) || compareText(a.title, b.title),
  // Oldest first, and undated cases last rather than sorted as year 0.
  year: (a, b) => {
    if (a.year === null && b.year === null) return compareText(a.title, b.title);
    if (a.year === null) return 1;
    if (b.year === null) return -1;
    return a.year - b.year || compareText(a.title, b.title);
  },
};

export const sortItems = (items, sort) => [...items].sort(SORTERS[sort] ?? SORTERS[DEFAULT_SORT]);

export const SORT_KEYS = Object.keys(SORTERS);

export const activeFilterCount = (state) =>
  Object.values(state.selected).reduce((total, selected) => total + selected.size, 0);

// ── Binding to a form ──────────────────────────────────────

function syncCategory(categoryBox, leafBoxes) {
  const checked = leafBoxes.filter((box) => box.checked).length;
  categoryBox.checked = checked === leafBoxes.length;
  categoryBox.indeterminate = checked > 0 && checked < leafBoxes.length;
}

/**
 * Expects: an input[name="q"], an optional select[name="sort"], and a checkbox per value named
 * after its field key. A category checkbox carries data-category and sits in the same
 * [data-filter-category] element as its members. onChange receives the state on every change.
 */
export function connectControls({ form, fields, onChange }) {
  const search = form.elements.q;
  const sort = form.elements.sort;
  const clear = form.querySelector('[data-clear]');
  const fieldKeys = new Set(fields.map((field) => field.key));
  const categories = [...form.querySelectorAll('[data-filter-category]')].map((element) => ({
    box: element.querySelector('[data-category]'),
    leaves: [...element.querySelectorAll('input[type="checkbox"]:not([data-category])')],
  }));
  const leafBoxes = [...form.querySelectorAll('input[type="checkbox"]:not([data-category])')].filter(
    (box) => fieldKeys.has(box.name),
  );

  let urlTimer;

  const readState = () => {
    const state = emptyState(fields);
    state.q = search.value;
    if (sort) state.sort = sort.value;
    leafBoxes.filter((box) => box.checked).forEach((box) => state.selected[box.name].add(box.value));
    return state;
  };

  const writeState = (state) => {
    search.value = state.q;
    if (sort) sort.value = state.sort;
    leafBoxes.forEach((box) => {
      box.checked = state.selected[box.name].has(box.value);
    });
    categories.forEach(({ box, leaves }) => syncCategory(box, leaves));
    // A shared link can select part of a category, which must be visible when the menu opens.
    categories
      .filter(({ box }) => box.indeterminate)
      .forEach(({ box }) => {
        const button = box.closest('[data-filter-category]').querySelector('[data-expand]');
        document.getElementById(button.getAttribute('aria-controls')).hidden = false;
        button.setAttribute('aria-expanded', 'true');
      });
  };

  const publish = () => {
    const state = readState();
    onChange(state);
    // Debounced because browsers throttle history updates, which typing would otherwise hit.
    clearTimeout(urlTimer);
    urlTimer = setTimeout(() => {
      history.replaceState(null, '', `${location.pathname}${serialiseQuery(state, fields)}${location.hash}`);
    }, URL_UPDATE_DELAY);
  };

  form.addEventListener('submit', (event) => event.preventDefault());
  form.addEventListener('input', (event) => {
    if (event.target.type !== 'checkbox') publish();
  });
  form.addEventListener('change', (event) => {
    if (event.target.type !== 'checkbox') return;
    const category = categories.find(({ box, leaves }) => box === event.target || leaves.includes(event.target));
    if (event.target === category?.box) {
      category.leaves.forEach((leaf) => {
        leaf.checked = category.box.checked;
      });
    }
    if (category) syncCategory(category.box, category.leaves);
    publish();
  });

  form.querySelectorAll('[data-expand]').forEach((button) => {
    button.addEventListener('click', () => {
      const members = document.getElementById(button.getAttribute('aria-controls'));
      members.hidden = !members.hidden;
      button.setAttribute('aria-expanded', String(!members.hidden));
    });
  });

  clear?.addEventListener('click', () => {
    const state = emptyState(fields);
    // Sort isn't a filter: clearing shouldn't reorder what's left on screen.
    if (sort) state.sort = sort.value;
    writeState(state);
    publish();
    search.focus();
  });

  const initial = parseQuery(location.search, fields, SORT_KEYS);
  writeState(initial);
  onChange(initial);
  return initial;
}

/** Closes a <details> menu on Escape or an outside click, as a native menu would. */
export function connectDropdown(details) {
  document.addEventListener('click', (event) => {
    if (details.open && !details.contains(event.target)) details.open = false;
  });
  details.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !details.open) return;
    details.open = false;
    details.querySelector('summary').focus();
  });
}
