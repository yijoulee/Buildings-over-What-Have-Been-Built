import {
  activeFilterCount,
  connectControls,
  connectDropdown,
  matchesItem,
  sortItems,
} from './shared/filters.js';

const form = document.querySelector('[data-filter-form]');
const list = document.querySelector('[data-case-list]');
const count = form.querySelector('[data-count]');
const filterCount = form.querySelector('[data-filter-count]');
const empty = document.querySelector('[data-empty]');

const fields = JSON.parse(form.dataset.fields);
const items = [...list.children].map((element) => ({ element, ...JSON.parse(element.dataset.item) }));
let order = items;

function render(state) {
  const sorted = sortItems(items, state.sort);
  // Moved rather than ordered with CSS, so keyboard order follows what's on screen.
  if (sorted.some((item, index) => item !== order[index])) {
    list.append(...sorted.map((item) => item.element));
    order = sorted;
  }

  let visible = 0;
  items.forEach((item) => {
    const matches = matchesItem(item, state, fields);
    item.element.hidden = !matches;
    if (matches) visible += 1;
  });

  count.textContent = `${visible} of ${items.length} case ${items.length === 1 ? 'study' : 'studies'}`;
  empty.hidden = visible > 0;
  const active = activeFilterCount(state);
  filterCount.textContent = active > 0 ? `(${active})` : '';
}

connectControls({ form, fields, onChange: render });
connectDropdown(form.querySelector('[data-filter-menu]'));
