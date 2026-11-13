import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import {
  COMPARISON_IMAGE_COUNT,
  MAX_IMAGES_PER_SECTION,
  fields,
  imageFields,
  sectionFields,
  sectionNames,
} from './schema.js';

const isBlank = (value) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

const isMapping = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date);

// Function values are grouped by category in taxonomy.yml, but a case study stores
// only the leaf, so nested lists are flattened before comparing.
function allowedValues(taxonomy, listName) {
  const list = taxonomy?.[listName];
  if (Array.isArray(list)) return list;
  if (isMapping(list)) return Object.values(list).flat();
  return null;
}

function checkValue(field, value, path, { taxonomy, report }) {
  switch (field.type) {
    case 'string':
      // YAML reads an unquoted 1986 as a number, hence the hint.
      if (typeof value !== 'string') report(`${path} must be a string; quote the value in YAML`);
      else if (field.pattern && !field.pattern.test(value)) {
        report(`${path} '${value}' must be lowercase letters and numbers joined by hyphens`);
      }
      break;

    case 'markdown':
      if (typeof value !== 'string') report(`${path} must be Markdown text`);
      break;

    case 'boolean':
      if (typeof value !== 'boolean') report(`${path} must be true or false`);
      break;

    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) report(`${path} must be a number`);
      else if (field.integer && !Number.isInteger(value)) report(`${path} must be an integer`);
      break;

    case 'coordinates': {
      if (!Array.isArray(value) || value.length !== 2 || !value.every((n) => Number.isFinite(n))) {
        report(`${path} must be [latitude, longitude]`);
        break;
      }
      const [lat, lng] = value;
      if (lat < -90 || lat > 90) report(`${path} latitude ${lat} out of range (-90 to 90)`);
      if (lng < -180 || lng > 180) report(`${path} longitude ${lng} out of range (-180 to 180)`);
      break;
    }

    case 'enum':
    case 'enum-list': {
      if (field.type === 'enum-list' && !Array.isArray(value)) {
        report(`${path} must be a list`);
        break;
      }
      const allowed = field.taxonomy ? allowedValues(taxonomy, field.taxonomy) : field.values;
      if (!allowed) {
        report(`${path} cannot be checked: taxonomy.${field.taxonomy} is missing`);
        break;
      }
      const source = field.taxonomy ? `taxonomy.${field.taxonomy}` : `[${allowed.join(', ')}]`;
      for (const item of [value].flat()) {
        if (!allowed.includes(item)) report(`${path} '${item}' not in ${source}`);
      }
      break;
    }
  }
}

function checkFields(fieldList, data, prefix, ctx) {
  for (const field of fieldList) {
    const path = `${prefix}${field.name}`;
    const value = data[field.name];
    if (isBlank(value)) {
      if (field.required) ctx.report(`${path} is required`);
      else if (field.requiredWhen && !isBlank(data[field.requiredWhen])) {
        ctx.report(`${path} is required when ${field.requiredWhen} is present`);
      }
      continue;
    }
    checkValue(field, value, path, ctx);
  }
}

// Compares against a directory listing rather than existsSync: Windows ignores case,
// so a wrong-case name would pass here and then 404 on a case-sensitive web host.
function checkImageFile(src, path, ctx) {
  if (typeof src !== 'string' || isBlank(src) || isBlank(ctx.slug) || !ctx.imagesDir) return;

  const folder = join(ctx.imagesDir, String(ctx.slug));
  ctx.listings[folder] ??= listFiles(folder);
  const files = ctx.listings[folder];
  const wanted = src.normalize('NFC');
  if (files.includes(wanted)) return;

  const nearMatch = files.find((name) => name.toLowerCase() === wanted.toLowerCase());
  const hint = nearMatch ? ` (case differs from '${nearMatch}')` : '';
  ctx.report(`${path} '${src}' not found in ${folder}${hint}`);
}

function listFiles(folder) {
  try {
    return readdirSync(folder).map((name) => name.normalize('NFC'));
  } catch {
    return [];
  }
}

function checkImages(section, name, ctx) {
  const prefix = `sections.${name}.images`;
  const images = section.images ?? [];
  if (!Array.isArray(images)) {
    ctx.report(`${prefix} must be a list`);
    return;
  }
  if (images.length > MAX_IMAGES_PER_SECTION) {
    ctx.report(`${prefix} has ${images.length} images (maximum ${MAX_IMAGES_PER_SECTION})`);
  }

  const isComparison = section.figure === 'comparison';
  if (isComparison && images.length !== COMPARISON_IMAGE_COUNT) {
    ctx.report(
      `${prefix} has ${images.length} images (figure: comparison needs exactly ${COMPARISON_IMAGE_COUNT})`,
    );
  }

  images.forEach((image, index) => {
    const path = `${prefix}[${index}]`;
    if (!isMapping(image)) {
      ctx.report(`${path} must have src and caption`);
      return;
    }
    checkFields(imageFields, image, `${path}.`, ctx);
    checkImageFile(image.src, `${path}.src`, ctx);
    if (isComparison && isBlank(image.label)) {
      ctx.report(`${path}.label is required when figure is comparison`);
    }
  });
}

function checkSections(sections, ctx) {
  if (isBlank(sections)) {
    ctx.report('sections is required');
    return;
  }
  if (!isMapping(sections)) {
    ctx.report('sections must be a mapping of the five section names');
    return;
  }
  for (const name of sectionNames) {
    const section = sections[name];
    if (isBlank(section)) {
      ctx.report(`sections.${name} is missing`);
      continue;
    }
    if (!isMapping(section)) {
      ctx.report(`sections.${name} must have a body`);
      continue;
    }
    checkFields(sectionFields, section, `sections.${name}.`, ctx);
    checkImages(section, name, ctx);
  }

  // A card shows one image, so a second mark would leave the choice to chance.
  const thumbnails = sectionNames.flatMap((name) => {
    const images = sections[name]?.images;
    return Array.isArray(images)
      ? images.flatMap((image, index) => (image?.thumbnail === true ? [`sections.${name}.images[${index}]`] : []))
      : [];
  });
  if (thumbnails.length > 1) {
    ctx.report(`only one image can be the thumbnail; ${thumbnails.length} are marked (${thumbnails.join(', ')})`);
  }
}

/**
 * @param {object} frontmatter parsed case study frontmatter
 * @param {{filename: string, taxonomy: object, imagesDir: string}} options
 *   imagesDir is the root images folder; each case study's files sit in <imagesDir>/<slug>/
 * @returns {{valid: boolean, errors: string[]}}
 */
export function validate(frontmatter, options) {
  const { filename = '(unknown file)', taxonomy, imagesDir } = options ?? {};
  const errors = [];
  const report = (message) => errors.push(`${filename}: ${message}`);

  // The build reports every file's problems in one pass, so a bug here must
  // surface as an error against this file rather than abort the others.
  try {
    if (!isMapping(frontmatter)) {
      report('frontmatter is missing or not a mapping');
    } else {
      const slug = frontmatter.slug;
      const ctx = { taxonomy, imagesDir, slug, report, listings: {} };
      checkFields(fields, frontmatter, '', ctx);
      if (typeof slug === 'string' && !isBlank(slug) && slug !== basename(filename, '.md')) {
        report(`slug '${slug}' does not match the filename`);
      }
      checkSections(frontmatter.sections, ctx);
    }
  } catch (error) {
    report(`validator failed: ${error.message}`);
  }

  return { valid: errors.length === 0, errors };
}
