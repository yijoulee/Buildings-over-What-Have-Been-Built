import { escapeHtml } from './template.js';

// One row per case study, so the section text stays in cases.json: multi-paragraph
// Markdown in a cell is awkward in every spreadsheet.
const CSV_COLUMNS = [
  ['slug', (r) => r.slug],
  ['title', (r) => r.title],
  ['architect', (r) => r.architect],
  ['area_m2', (r) => r.area_m2],
  ['year_completed', (r) => r.year_completed],
  ['year_sort', (r) => r.year_sort],
  ['city', (r) => r.city],
  ['country', (r) => r.country],
  ['latitude', (r) => r.coordinates[0]],
  ['longitude', (r) => r.coordinates[1]],
  ['location_note', (r) => r.location_note],
  ['original_function', (r) => r.original_function],
  ['original_function_category', (r) => r.original_function_category],
  ['original_form_geometry', (r) => r.original_form_geometry],
  ['original_form_organisation', (r) => r.original_form_organisation],
  ['new_function', (r) => r.new_function],
  ['new_function_category', (r) => r.new_function_category],
  ['new_form_geometry', (r) => r.new_form_geometry],
  ['new_form_organisation', (r) => r.new_form_organisation],
  ['strategy', (r) => r.strategy.join('; ')],
  ['url', (r) => r.url],
];

function csvCell(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'number') return String(value);
  // Spreadsheets run a cell starting with one of these as a formula, and this is a
  // public download built from untrusted content.
  const text = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(records) {
  const rows = [
    CSV_COLUMNS.map(([name]) => name).join(','),
    ...records.map((record) => CSV_COLUMNS.map(([, get]) => csvCell(get(record))).join(',')),
  ];
  // The BOM is what makes Excel read this as UTF-8; without it "Musée" comes out garbled.
  return `﻿${rows.join('\r\n')}\r\n`;
}

export function toSitemap(records, siteUrl) {
  const urls = ['/', '/case-studies/', '/map/', '/approach/', '/about/', ...records.map((record) => record.url)]
    .map((path) => `  <url><loc>${escapeHtml(`${siteUrl}${path}`)}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
