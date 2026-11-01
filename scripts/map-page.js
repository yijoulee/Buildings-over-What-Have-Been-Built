import { filterFields, filterItem, renderFilterForm, sortByTitle } from './filter-markup.js';
import { renderTemplate } from './template.js';

// In the page rather than in map.js, so the provider can change without touching any code.
// OpenStreetMap needs no key but asks for visible attribution and only light use; see
// https://operations.osmfoundation.org/policies/tiles/
const TILES = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
};

function mapItem(record, fields) {
  const image = record.card_image;
  return {
    ...filterItem(record, fields),
    url: record.url,
    coordinates: record.coordinates,
    architect: record.architect,
    yearCompleted: record.year_completed,
    locationNote: record.location_note,
    image: image && {
      src: image.variants.at(-1).url,
      srcset: image.variants.map(({ url, width }) => `${url} ${width}w`).join(', '),
    },
  };
}

export function renderMapPage(records, taxonomy, templates, chrome) {
  const fields = filterFields(taxonomy);
  return renderTemplate(templates.map, {
    header: chrome.header,
    footer: chrome.footer,
    filter_form: renderFilterForm(fields, templates),
    tile_url: TILES.url,
    tile_attribution: TILES.attribution,
    icon_fullscreen: templates.iconFullscreen,
    icon_locate: templates.iconLocate,
    icon_pin: templates.iconPin,
    items: sortByTitle(records)
      .map((record) =>
        renderTemplate(templates.mapItem, {
          item: JSON.stringify(mapItem(record, fields)),
          url: record.url,
          title: record.title,
          city: record.city,
        }),
      )
      .join(''),
  });
}
