import { renderTemplate } from './template.js';

// Function is two fields rather than one so that AND across fields can express a transition:
// "was Industry & Energy, now Cultural & Civic". Form values match either side of a case.
export function filterFields(taxonomy) {
  return [
    { key: 'original', label: 'Original function', itemKeys: ['original_function'], categories: taxonomy.function },
    { key: 'new', label: 'New function', itemKeys: ['new_function'], categories: taxonomy.function },
    {
      key: 'geometry',
      label: 'Form geometry',
      itemKeys: ['original_form_geometry', 'new_form_geometry'],
      options: taxonomy.form_geometry,
    },
    {
      key: 'organisation',
      label: 'Form organisation',
      itemKeys: ['original_form_organisation', 'new_form_organisation'],
      options: taxonomy.form_organisation,
    },
    { key: 'strategy', label: 'Strategy', itemKeys: ['strategy'], options: taxonomy.strategy },
  ];
}

function renderFilterGroup(field, templates) {
  const option = (value) => renderTemplate(templates.filterOption, { name: field.key, value });
  const options = field.categories
    ? Object.entries(field.categories).map(([value, members], index) =>
        renderTemplate(templates.filterCategory, {
          value,
          id: `${field.key}-category-${index}`,
          members: members.map(option).join(''),
        }),
      )
    : field.options.map(option);
  return renderTemplate(templates.filterGroup, { label: field.label, options: options.join('') });
}

export function renderFilterForm(fields, templates, sortControl = '') {
  return renderTemplate(templates.filterForm, {
    fields: JSON.stringify(fields),
    filter_groups: fields.map((field) => renderFilterGroup(field, templates)).join(''),
    sort: sortControl,
  });
}

// What filters.js needs to know about a case study. It travels with the page, so nothing is
// fetched at runtime.
export function filterItem(record, fields) {
  const keys = [...new Set(fields.flatMap((field) => field.itemKeys))];
  return {
    title: record.title,
    city: record.city,
    year: record.year_sort,
    search: [record.title, record.city, record.original_function, record.new_function].join(' '),
    values: Object.fromEntries(keys.map((key) => [key, record[key]])),
  };
}

export const sortByTitle = (records) =>
  [...records].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base', numeric: true }));
