import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { createImageProcessor } from './images.js';
import { renderTemplate } from './template.js';

// Everything here is in Figma pixels on the 1235 x 666 stage, from docs/animation-spec.md.
// Each list is in Figma's stacking order, and hosts sit under inserts under combined.
const HOSTS = [
  { name: 'host-reichstag', pair: 'reichstag', x: 44, y: 553, w: 420, h: 112 },
  { name: 'host-coaldrop', pair: 'coaldrop', x: 408, y: 513, w: 248.57, h: 145 },
  { name: 'host-porthouse', pair: 'porthouse', x: 893, y: 534, w: 245, h: 110 },
  { name: 'host-elbphilharmonie', pair: 'elbphilharmonie', x: 673, y: 574, w: 246, h: 91 },
];

const COMBINED = [
  { name: 'combined-elbphilharmonie', pair: 'elbphilharmonie', x: 671, y: 446, w: 229, h: 217 },
  { name: 'combined-porthouse', pair: 'porthouse', x: 903, y: 415, w: 332.34, h: 234 },
  { name: 'combined-coaldrop', pair: 'coaldrop', x: 388, y: 535, w: 270, h: 120 },
  { name: 'combined-reichstag', pair: 'reichstag', x: 45, y: 530, w: 373, h: 135 },
];

// A traveller sits at its docked place in the page and is moved from there by transform, so
// `path` is its centre in each of states 1-9. `arrival` is the state it docks in; the next
// step is the crossfade to the combined photograph.
//
// Coal Drops and Elbphilharmonie were exported in their state 1 pose, half a turn from the
// angle Figma calls 0. Turning the files lets the spec's rotations apply as they stand.
const TRAVELLERS = [
  {
    name: 'insert-reichstag', pair: 'reichstag', arrival: 5,
    x: 190, y: 475, w: 95, h: 95,
    image: { x: 8, y: 30, w: 80, h: 38 },
    cells: [[0, 0]],
    path: [[142.5, 237.5], [237.5, 238.5], [237.5, 333.5], [237.5, 428.5], [237.5, 522.5], [237.5, 522.5], [237.5, 522.5], [237.5, 522.5], [237.5, 522.5]],
    angles: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  {
    name: 'insert-coaldrop', pair: 'coaldrop', arrival: 8, rotation: 180,
    x: 380, y: 475, w: 285, h: 95,
    image: { x: 8, y: 16, w: 270, h: 60 },
    cells: [[0, 0], [95, 0], [190, 0]],
    path: [[427.5, 143.5], [522.5, 143.5], [522.5, 238.5], [522.5, 237.5], [522.5, 237.5], [522.5, 332.5], [522.5, 427.5], [522.5, 522.5], [522.5, 522.5]],
    angles: [-180, -180, -180, -90, 0, 0, 0, 0, 0],
  },
  {
    name: 'insert-elbphilharmonie', pair: 'elbphilharmonie', arrival: 5, rotation: 180,
    x: 665, y: 381, w: 285, h: 190,
    image: { x: 6, y: 14, w: 229, h: 166 },
    cells: [[0, 0], [95, 0], [0, 95], [95, 95], [190, 95]],
    path: [[807.5, 95], [807.5, 191], [760, 333.5], [807.5, 381], [807.5, 476], [807.5, 476], [807.5, 476], [807.5, 476], [807.5, 476]],
    angles: [180, 180, 90, 0, 0, 0, 0, 0, 0],
  },
  {
    name: 'insert-porthouse', pair: 'porthouse', arrival: 7,
    x: 950, y: 380, w: 285, h: 285,
    image: { x: 0, y: 33.97, w: 285, h: 234.03 },
    cells: [[95, 0], [190, 0], [0, 95], [95, 95], [190, 95], [0, 190], [95, 190]],
    path: [[1187.5, 142.5], [1187.5, 238.5], [1092.5, 238.5], [1092.5, 238.5], [1092.5, 332.5], [1092.5, 427.5], [1092.5, 522.5], [1092.5, 522.5], [1092.5, 522.5]],
    angles: [0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
];

const PAGE_WIDTH = 1440;
const PIXEL_DENSITIES = [1, 2];

// The resting composition is all that narrow screens, no-script visitors and reduced motion
// ever see, so the moving layers swap to a blank for them and never download.
const MEDIA_NARROW = '(max-width: 899px)';
const MEDIA_STATIC = `${MEDIA_NARROW}, (prefers-reduced-motion: reduce), (scripting: none)`;

// The narrow hero keeps only the bottom three rows of the grid, where the buildings stand.
const FLAT = { top: 380, width: 1236, height: 286, widths: [640, 1280, 1800], quality: 80 };

const round = (value) => Math.round(value * 10000) / 10000;
const srcset = (variants) => variants.map(({ file, width }) => `/landing/${file} ${width}w`).join(', ');
const sizes = (w) => `(min-width: ${PAGE_WIDTH}px) ${Math.round(w)}px, ${(w / PAGE_WIDTH * 100).toFixed(2)}vw`;

// As percentages of the element's own size, which is itself a percentage of the stage, so
// the whole motion scales with the stage and nothing is ever stored in pixels.
function travellerStates({ x, y, w, h, path, angles }) {
  const restX = x + w / 2;
  const restY = y + h / 2;
  return path.map(([centreX, centreY], index) => [
    round((centreX - restX) / w * 100),
    round((centreY - restY) / h * 100),
    angles[index],
  ]);
}

async function buildFlatHero({ sourceRoot, cacheDir, outputDir }) {
  const sources = COMBINED.map(({ name }) => join(sourceRoot, 'landing', `${name}.png`));
  const hash = createHash('sha256')
    .update(JSON.stringify([FLAT, COMBINED, sources.map((path) => statSync(path).mtimeMs)]))
    .digest('hex')
    .slice(0, 10);
  const folder = join(cacheDir, 'flat');
  mkdirSync(folder, { recursive: true });

  // Layers are composited at the 2x their source files were exported at.
  const flattened = sharp({
    create: { width: FLAT.width * 2, height: FLAT.height * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite(COMBINED.map(({ x, y }, index) => ({
    input: sources[index],
    left: Math.round(x * 2),
    top: Math.round((y - FLAT.top) * 2),
  })));
  const composite = await flattened.png().toBuffer();

  const variants = [];
  for (const width of FLAT.widths) {
    const file = `hero-resolved-flat-${hash}-${width}.webp`;
    const height = Math.round(width * FLAT.height / FLAT.width);
    if (!existsSync(join(folder, file))) {
      await sharp(composite).resize({ width }).webp({ quality: FLAT.quality }).toFile(join(folder, file));
    }
    cpSync(join(folder, file), join(outputDir, file));
    variants.push({ file, width, height });
  }
  return variants;
}

export async function renderLandingPage(templates, chrome, { sourceRoot, cacheDir, outputDir }) {
  const processor = createImageProcessor({ sourceRoot, cacheDir });
  mkdirSync(outputDir, { recursive: true });

  const publish = async (name, w, rotation) => {
    const widths = PIXEL_DENSITIES.map((density) => Math.round(w * density));
    const { folder, variants } = await processor.process('landing', `${name}.png`, { widths, rotation });
    for (const { file } of variants) cpSync(join(folder, file), join(outputDir, file));
    return variants;
  };

  const renderLayers = async (layers, kind, media) => {
    const html = [];
    for (const layer of layers) {
      const variants = await publish(layer.name, layer.w);
      html.push(renderTemplate(templates.landingLayer, {
        kind,
        media,
        pair: layer.pair,
        x: layer.x,
        y: layer.y,
        w: layer.w,
        h: layer.h,
        src: `/landing/${variants.at(-1).file}`,
        srcset: srcset(variants),
        sizes: sizes(layer.w),
        width: variants.at(-1).width,
        height: variants.at(-1).height,
      }));
    }
    return html.join('');
  };

  const renderTravellers = async () => {
    const html = [];
    for (const traveller of TRAVELLERS) {
      const { image } = traveller;
      const variants = await publish(traveller.name, image.w, traveller.rotation);
      const states = travellerStates(traveller);
      html.push(renderTemplate(templates.landingTraveller, {
        pair: traveller.pair,
        arrival: traveller.arrival,
        states: JSON.stringify(states),
        media: MEDIA_STATIC,
        x: traveller.x,
        y: traveller.y,
        w: traveller.w,
        h: traveller.h,
        start_x: states[0][0],
        start_y: states[0][1],
        start_angle: states[0][2],
        image_x: image.x,
        image_y: image.y,
        image_w: image.w,
        image_h: image.h,
        src: `/landing/${variants.at(-1).file}`,
        srcset: srcset(variants),
        sizes: sizes(image.w),
        width: variants.at(-1).width,
        height: variants.at(-1).height,
        cells: traveller.cells.map(([x, y]) => renderTemplate(templates.landingCell, { x, y })).join(''),
      }));
    }
    return html.join('');
  };

  const hosts = await renderLayers(HOSTS, 'host', MEDIA_STATIC);
  const travellers = await renderTravellers();
  const combined = await renderLayers(COMBINED, 'combined', MEDIA_NARROW);
  processor.save();

  const flat = await buildFlatHero({ sourceRoot, cacheDir, outputDir });
  return renderTemplate(templates.landing, {
    header: chrome.header,
    footer: chrome.footer,
    flat_src: `/landing/${flat.at(-1).file}`,
    flat_srcset: srcset(flat),
    flat_width: flat.at(-1).width,
    flat_height: flat.at(-1).height,
    layers: hosts + travellers + combined,
  });
}
