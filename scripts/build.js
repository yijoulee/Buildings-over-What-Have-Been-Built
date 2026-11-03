import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { checkCmsConfig } from './cms-config-check.js';
import { toCsv, toSitemap } from './datasets.js';
import { CARD_QUALITY, createImageProcessor } from './images.js';
import { renderAboutPage } from './about-page.js';
import { renderIndexPage } from './index-page.js';
import { renderLandingPage } from './landing-page.js';
import { renderMapPage } from './map-page.js';
import { renderMarkdown } from './markdown.js';
import { sectionHeadings, sectionNames } from './schema.js';
import { renderTemplate } from './template.js';
import { validate } from './validate.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_STUDIES_DIR = join(ROOT, 'content', 'case-studies');
const TEMPLATES_DIR = join(ROOT, 'src', 'templates');
const DIST_DIR = join(ROOT, 'dist');
const DATA_DIR = join(ROOT, 'data');
const IMAGES_DIR = join(ROOT, 'content', 'images');

const MAX_COMPARISON_RATIO_DIFFERENCE = 0.1;

const readText = (path) => readFileSync(path, 'utf8');

function writeOutput(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
}

function functionCategories(taxonomy) {
  const categories = new Map();
  for (const [category, values] of Object.entries(taxonomy.function ?? {})) {
    for (const value of values) categories.set(value, category);
  }
  return categories;
}

async function buildImage(image, slug, images, publishedFolders, quality) {
  const { folder, variants } = await images.process(slug, image.src, { quality });
  publishedFolders.push({ folder, slug, files: variants.map(({ file }) => file) });
  const largest = variants.at(-1);
  return {
    caption: image.caption,
    label: image.label ?? null,
    width: largest.width,
    height: largest.height,
    variants: variants.map(({ file, width, height }) => ({
      url: `/images/${slug}/${file}`,
      width,
      height,
    })),
  };
}

function checkComparisonRatios([first, second], path, warn) {
  const ratios = [first.width / first.height, second.width / second.height];
  const difference = Math.max(...ratios) / Math.min(...ratios) - 1;
  if (difference > MAX_COMPARISON_RATIO_DIFFERENCE) {
    warn(
      `${path} comparison images differ in aspect ratio by ${Math.round(difference * 100)}% ` +
        `(${ratios[0].toFixed(2)} and ${ratios[1].toFixed(2)})`,
    );
  }
}

async function buildSections(data, images, publishedFolders, warn) {
  const sections = [];
  for (const [index, key] of sectionNames.entries()) {
    const section = data.sections[key];
    const figure = section.figure ?? 'separate';
    const builtImages = [];
    for (const image of section.images ?? []) {
      builtImages.push(await buildImage(image, data.slug, images, publishedFolders));
    }
    if (figure === 'comparison') {
      checkComparisonRatios(builtImages, `sections.${key}`, warn);
    }
    sections.push({
      key,
      heading: sectionHeadings[key],
      body_html: renderMarkdown(section.body),
      layout: section.layout ?? (index % 2 === 0 ? 'text-left' : 'image-left'),
      figure,
      images: builtImages,
    });
  }
  return sections;
}

// The last image in the last section that has one: for a reuse project, usually the finished
// building, and the one the Figma frame uses for Orsay.
function cardImageSource(data) {
  return sectionNames.map((key) => data.sections[key].images ?? []).findLast((list) => list.length > 0)?.at(-1) ?? null;
}

async function buildRecord(data, categories, images, publishedFolders, warn) {
  const sections = await buildSections(data, images, publishedFolders, warn);
  const cardSource = cardImageSource(data);
  return {
    slug: data.slug,
    url: `/case-studies/${data.slug}/`,
    title: data.title,
    architect: data.architect,
    area_m2: data.area_m2 ?? null,
    year_completed: data.year_completed ?? null,
    year_sort: data.year_sort ?? null,
    city: data.city,
    country: data.country,
    coordinates: data.coordinates,
    location_note: data.location_note ?? null,
    original_function: data.original_function,
    original_function_category: categories.get(data.original_function),
    original_form_geometry: data.original_form_geometry,
    original_form_organisation: data.original_form_organisation,
    new_function: data.new_function,
    new_function_category: categories.get(data.new_function),
    new_form_geometry: data.new_form_geometry,
    new_form_organisation: data.new_form_organisation,
    strategy: data.strategy,
    card_image: cardSource && (await buildImage(cardSource, data.slug, images, publishedFolders, CARD_QUALITY)),
    sections,
  };
}

// Slightly generous, since these only steer which image width the browser downloads: a
// pair shares a row on wide screens but stacks whenever its panel is narrow.
const IMAGE_SIZES = {
  single: '(min-width: 900px) 45vw, 90vw',
  pair: '(min-width: 1200px) 25vw, (min-width: 900px) 45vw, 90vw',
};

function renderFacts(record, templates) {
  const facts = [
    ['Designed by', record.architect],
    ['Area', record.area_m2 === null ? null : `${record.area_m2}m²`],
    ['Year Completed', record.year_completed],
    ['Location', `${record.city}, ${record.country}`],
    ['Location note', record.location_note],
  ];
  return facts
    .filter(([, value]) => value !== null)
    .map(([label, value]) => renderTemplate(templates.fact, { label, value }))
    .join('');
}

function renderFigure(image, sizes, isFirstOnPage, templates) {
  const largest = image.variants.at(-1);
  return renderTemplate(templates.figure, {
    src: largest.url,
    srcset: image.variants.map(({ url, width }) => `${url} ${width}w`).join(', '),
    sizes,
    width: image.width,
    height: image.height,
    ratio: (image.width / image.height).toFixed(4),
    caption: image.caption,
    label: image.label ?? '',
    // The first image is likely the largest paint on load; lazy-loading it would delay it.
    loading: isFirstOnPage ? 'eager' : 'lazy',
  });
}

function renderCaseStudy(record, templates) {
  let figureCount = 0;
  const renderFigures = (section) => {
    if (section.images.length === 0) return '';
    const sizes = section.images.length > 1 ? IMAGE_SIZES.pair : IMAGE_SIZES.single;
    return renderTemplate(templates.figures, {
      figure: section.figure,
      items: section.images
        .map((image) => renderFigure(image, sizes, figureCount++ === 0, templates))
        .join(''),
    });
  };
  const sections = record.sections
    .map((section) =>
      renderTemplate(templates.section, {
        key: section.key,
        heading: section.heading,
        layout: section.layout,
        body: section.body_html,
        figures: renderFigures(section),
      }),
    )
    .join('');

  return renderTemplate(templates.page, {
    header: renderTemplate(templates.siteHeader, { nav_start: templates.navLogo }),
    footer: templates.siteFooter,
    title: record.title,
    facts: renderFacts(record, templates),
    original_function: record.original_function,
    original_form_geometry: record.original_form_geometry,
    original_form_organisation: record.original_form_organisation,
    new_function: record.new_function,
    new_form_geometry: record.new_form_geometry,
    new_form_organisation: record.new_form_organisation,
    strategies: record.strategy
      .map((value) => renderTemplate(templates.strategy, { value }))
      .join(''),
    sections,
  });
}

function publishImages(publishedFolders) {
  for (const { folder, slug, files } of publishedFolders) {
    const target = join(DIST_DIR, 'images', slug);
    mkdirSync(target, { recursive: true });
    for (const file of files) cpSync(join(folder, file), join(target, file));
  }
}

function copyStaticAssets() {
  // public/landing holds source PNGs; landing-page.js publishes them as WebP instead.
  const landingSources = join(ROOT, 'public', 'landing');
  const skipPlaceholders = (source) => basename(source) !== '.gitkeep' && source !== landingSources;
  for (const [source, target] of [
    [join(ROOT, 'public'), DIST_DIR],
    [join(ROOT, 'src', 'css'), join(DIST_DIR, 'css')],
    [join(ROOT, 'src', 'js'), join(DIST_DIR, 'js')],
  ]) {
    if (existsSync(source)) cpSync(source, target, { recursive: true, filter: skipPlaceholders });
  }
}

function siteUrl() {
  const { homepage } = JSON.parse(readText(join(ROOT, 'package.json')));
  return /^https?:\/\/\S+$/.test(homepage ?? '') ? homepage.replace(/\/+$/, '') : null;
}

async function main() {
  const taxonomy = yaml.load(readText(join(ROOT, 'content', 'taxonomy.yml')));
  const categories = functionCategories(taxonomy);
  const templates = {
    page: readText(join(TEMPLATES_DIR, 'case-study.html')),
    section: readText(join(TEMPLATES_DIR, 'case-study-section.html')),
    figures: readText(join(TEMPLATES_DIR, 'case-study-figures.html')),
    figure: readText(join(TEMPLATES_DIR, 'case-study-figure.html')),
    fact: readText(join(TEMPLATES_DIR, 'case-study-fact.html')),
    strategy: readText(join(TEMPLATES_DIR, 'case-study-strategy.html')),
    siteHeader: readText(join(TEMPLATES_DIR, 'site-header.html')),
    siteFooter: readText(join(TEMPLATES_DIR, 'site-footer.html')),
    navLogo: readText(join(TEMPLATES_DIR, 'nav-logo.html')),
    index: readText(join(TEMPLATES_DIR, 'index.html')),
    about: readText(join(TEMPLATES_DIR, 'about.html')),
    aboutSection: readText(join(TEMPLATES_DIR, 'about-section.html')),
    aboutNote: readText(join(TEMPLATES_DIR, 'about-note.html')),
    landing: readText(join(TEMPLATES_DIR, 'landing.html')),
    landingLayer: readText(join(TEMPLATES_DIR, 'landing-layer.html')),
    landingTraveller: readText(join(TEMPLATES_DIR, 'landing-traveller.html')),
    landingCell: readText(join(TEMPLATES_DIR, 'landing-cell.html')),
    card: readText(join(TEMPLATES_DIR, 'case-card.html')),
    cardImage: readText(join(TEMPLATES_DIR, 'case-card-image.html')),
    cardMeta: readText(join(TEMPLATES_DIR, 'case-card-meta.html')),
    filterGroup: readText(join(TEMPLATES_DIR, 'filter-group.html')),
    filterOption: readText(join(TEMPLATES_DIR, 'filter-option.html')),
    filterCategory: readText(join(TEMPLATES_DIR, 'filter-category.html')),
    filterForm: readText(join(TEMPLATES_DIR, 'filter-form.html')),
    filterSort: readText(join(TEMPLATES_DIR, 'filter-sort.html')),
    map: readText(join(TEMPLATES_DIR, 'map.html')),
    mapItem: readText(join(TEMPLATES_DIR, 'map-item.html')),
    iconPin: readText(join(TEMPLATES_DIR, 'icon-pin.html')),
    iconLocate: readText(join(TEMPLATES_DIR, 'icon-locate.html')),
    iconFullscreen: readText(join(TEMPLATES_DIR, 'icon-fullscreen.html')),
  };
  const images = createImageProcessor({
    sourceRoot: IMAGES_DIR,
    cacheDir: join(ROOT, '.cache', 'images'),
  });

  // Starting clean means a deleted or newly invalid case study can't leave a stale page.
  rmSync(DIST_DIR, { recursive: true, force: true });
  mkdirSync(DIST_DIR, { recursive: true });
  copyStaticAssets();

  const files = readdirSync(CASE_STUDIES_DIR)
    .filter((name) => name.endsWith('.md'))
    .sort();
  const imagesDir = relative(process.cwd(), IMAGES_DIR);
  const records = [];
  const errors = [];
  const warnings = checkCmsConfig(readText(join(ROOT, 'public', 'admin', 'config.yml')), taxonomy);

  for (const filename of files) {
    try {
      const { data } = matter(readText(join(CASE_STUDIES_DIR, filename)));
      const result = validate(data, { filename, taxonomy, imagesDir });
      if (!result.valid) {
        errors.push(...result.errors);
        continue;
      }
      const publishedFolders = [];
      const fileWarnings = [];
      const record = await buildRecord(data, categories, images, publishedFolders, (message) =>
        fileWarnings.push(`${filename}: ${message}`),
      );
      const html = renderCaseStudy(record, templates);
      publishImages(publishedFolders);
      writeOutput(join(DIST_DIR, 'case-studies', record.slug, 'index.html'), html);
      records.push(record);
      warnings.push(...fileWarnings);
    } catch (error) {
      errors.push(`${filename}: could not build: ${error.message}`);
    }
  }
  images.save();

  const chrome = {
    header: renderTemplate(templates.siteHeader, { nav_start: templates.navLogo }),
    footer: templates.siteFooter,
  };
  writeOutput(join(DIST_DIR, 'index.html'), await renderLandingPage(templates, chrome, {
    sourceRoot: join(ROOT, 'public'),
    cacheDir: join(ROOT, '.cache', 'landing'),
    outputDir: join(DIST_DIR, 'landing'),
  }));
  writeOutput(join(DIST_DIR, 'case-studies', 'index.html'), renderIndexPage(records, taxonomy, templates, chrome));
  writeOutput(join(DIST_DIR, 'map', 'index.html'), renderMapPage(records, taxonomy, templates, chrome));
  try {
    const aboutSource = readText(join(ROOT, 'content', 'about.md'));
    writeOutput(join(DIST_DIR, 'about', 'index.html'), renderAboutPage(aboutSource, templates, chrome));
  } catch (error) {
    errors.push(error.code === 'ENOENT' ? 'about.md: content/about.md is missing' : error.message);
  }

  const json =`${JSON.stringify(records, null, 2)}\n`;
  writeOutput(join(DATA_DIR, 'cases.json'), json);
  writeOutput(join(DIST_DIR, 'api', 'cases.json'), json);
  writeOutput(join(DIST_DIR, 'api', 'cases.csv'), toCsv(records));

  const url = siteUrl();
  if (url) writeOutput(join(DIST_DIR, 'sitemap.xml'), toSitemap(records, url));
  else warnings.push('sitemap.xml not written: set "homepage" in package.json to the site URL');

  warnings.forEach((message) => console.warn(`Warning: ${message}`));
  errors.forEach((message) => console.error(message));
  console.log(`${files.length} read, ${records.length} built, ${files.length - records.length} skipped`);
}

// Per-file problems are handled above; reaching this means the taxonomy or a template
// is broken, which affects every page, so this one does fail the build.
main().catch((error) => {
  console.error(`Build failed: ${error.message}`);
  process.exitCode = 1;
});
