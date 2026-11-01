import { filterFields, filterItem, renderFilterForm, sortByTitle } from './filter-markup.js';
import { renderTemplate } from './template.js';

const CARD_SIZES = '(min-width: 1200px) 30vw, (min-width: 740px) 48vw, 92vw';

function renderCard(record, index, fields, templates) {
  const meta = [
    ['Designed by', record.architect],
    ['Year Completed', record.year_completed],
    ['Location', record.city],
    ['Function', record.new_function],
  ]
    .filter(([, value]) => value !== null)
    .map(([label, value]) => renderTemplate(templates.cardMeta, { label, value }))
    .join('');

  const cardImage = record.card_image;
  const image = cardImage
    ? renderTemplate(templates.cardImage, {
        src: cardImage.variants.at(-1).url,
        srcset: cardImage.variants.map(({ url, width }) => `${url} ${width}w`).join(', '),
        sizes: CARD_SIZES,
        width: cardImage.width,
        height: cardImage.height,
        // Only the first card is prioritised: it's the largest paint on every screen, and a
        // phone shows just one. Lazy images already on screen still load straight away.
        loading: index === 0 ? 'eager' : 'lazy',
        priority: index === 0 ? 'high' : 'auto',
      })
    : '';

  return renderTemplate(templates.card, {
    item: JSON.stringify(filterItem(record, fields)),
    url: record.url,
    title: record.title,
    image,
    meta,
  });
}

export function renderIndexPage(records, taxonomy, templates, chrome) {
  const fields = filterFields(taxonomy);
  // Sorted here to match filters.js's default, so the page doesn't reorder when it loads and
  // the no-script order is the same.
  return renderTemplate(templates.index, {
    header: chrome.header,
    footer: chrome.footer,
    filter_form: renderFilterForm(fields, templates, templates.filterSort),
    cards: sortByTitle(records)
      .map((record, index) => renderCard(record, index, fields, templates))
      .join(''),
  });
}
