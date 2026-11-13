// Makes the strategy icons the case study pages show:
//   node scripts/strategy-icons.mjs
// Reads the drawings in assets/figures/strategy/ (gitignored) and writes one icon per strategy
// in content/taxonomy.yml to public/icons/strategy/<slug>.svg.
//
// Each drawing's own label is replaced with its taxonomy name, outlined from Microsoft YaHei UI
// Light. As outlines the label looks the same on devices without that font, it always matches
// the name the CMS and filters use, and a name like "A & B" can't break the file's XML.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openSync } from 'fontkit';
import yaml from 'js-yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'assets', 'figures', 'strategy');
const OUTPUT_DIR = join(ROOT, 'public', 'icons', 'strategy');
const FONT_FILE = 'C:/Windows/Fonts/msyhl.ttc';
const FONT_NAME = 'MicrosoftYaHeiUILight';

// Source drawing for each taxonomy value. Two drawings were labelled with other wording.
const DRAWINGS = {
  'Function Follows Form': 'function-follows-form.svg',
  Disconnect: 'disconnected.svg',
  'Horizontal Proliferation': 'horizontal-proliferation.svg',
  Infill: 'infill.svg',
  Overlap: 'overlap.svg',
  'Explode and Reorganise': 'exploded-and-reorganization.svg',
};

// The drawings' own label settings, so the outlined names sit where the text did.
const LABEL = {
  fontSize: 11,
  letterSpacing: 1.1,
  fill: '#222020',
  centreX: 50,
  firstBaseline: 112.186,
  lineHeight: 13.2,
  maxWidth: 90,
};

// build.js names the files the same way.
const strategySlug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const escapeXml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (value) => Number(value.toFixed(3));

const advanceWidth = (font, text) => {
  const scale = LABEL.fontSize / font.unitsPerEm;
  return font.layout(text).positions.reduce((sum, p) => sum + p.xAdvance * scale, 0);
};

// The drawings' spacing, tightened on a line that would otherwise be wider than the drawing,
// as the original labels were.
function spacingFor(font, text) {
  const gaps = Math.max(font.layout(text).positions.length - 1, 1);
  return Math.max(0, Math.min(LABEL.letterSpacing, (LABEL.maxWidth - advanceWidth(font, text)) / gaps));
}

const lineWidth = (font, text, spacing) => advanceWidth(font, text) + spacing * (font.layout(text).positions.length - 1);

// Fills lines word by word, as the drawings break their longer labels. A line fits if it can
// reach the width with its spacing tightened.
function wrap(font, text) {
  const lines = [];
  for (const word of text.split(' ')) {
    const candidate = lines.length ? `${lines.at(-1)} ${word}` : word;
    if (lines.length && advanceWidth(font, candidate) <= LABEL.maxWidth) lines[lines.length - 1] = candidate;
    else lines.push(word);
  }
  return lines;
}

// One path per line, in the icon's own coordinates: font units scaled and flipped upright.
function outlineLine(font, text, baseline) {
  const { glyphs, positions } = font.layout(text);
  const scale = LABEL.fontSize / font.unitsPerEm;
  const spacing = spacingFor(font, text);
  let x = LABEL.centreX - lineWidth(font, text, spacing) / 2;
  const parts = [];
  glyphs.forEach((glyph, index) => {
    const px = (gx) => n(x + gx * scale);
    const py = (gy) => n(baseline - gy * scale);
    for (const { command, args } of glyph.path.commands) {
      if (command === 'moveTo') parts.push(`M${px(args[0])} ${py(args[1])}`);
      else if (command === 'lineTo') parts.push(`L${px(args[0])} ${py(args[1])}`);
      else if (command === 'quadraticCurveTo') parts.push(`Q${px(args[0])} ${py(args[1])} ${px(args[2])} ${py(args[3])}`);
      else if (command === 'bezierCurveTo') parts.push(`C${px(args[0])} ${py(args[1])} ${px(args[2])} ${py(args[3])} ${px(args[4])} ${py(args[5])}`);
      else if (command === 'closePath') parts.push('Z');
    }
    x += positions[index].xAdvance * scale + spacing;
  });
  return `<path d="${parts.join('')}" fill="${LABEL.fill}"/>`;
}

function buildIcon(source, name, font) {
  const lines = wrap(font, name.toUpperCase());
  const label = lines.map((line, i) => outlineLine(font, line, LABEL.firstBaseline + i * LABEL.lineHeight)).join('\n    ');
  const slug = strategySlug(name);
  return source
    .replace(/<text\b[\s\S]*?<\/text>/g, '')
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/, `<title id="ttl-${slug}">${escapeXml(name)}</title>`)
    .replace(/aria-labelledby="[^"]*"/, `aria-labelledby="ttl-${slug}"`)
    .replace(/<\/svg>\s*$/, `  <g aria-hidden="true">\n    ${label}\n  </g>\n</svg>\n`);
}

const taxonomy = yaml.load(readFileSync(join(ROOT, 'content', 'taxonomy.yml'), 'utf8'));
const missing = taxonomy.strategy.filter((name) => !DRAWINGS[name]);
if (missing.length) console.warn(`No drawing for: ${missing.join(', ')}. Add one to DRAWINGS.`);

const font = openSync(FONT_FILE).fonts.find((f) => f.postscriptName === FONT_NAME);
mkdirSync(OUTPUT_DIR, { recursive: true });
for (const name of taxonomy.strategy.filter((value) => DRAWINGS[value])) {
  const source = readFileSync(join(SOURCE_DIR, DRAWINGS[name]), 'utf8');
  const file = `${strategySlug(name)}.svg`;
  writeFileSync(join(OUTPUT_DIR, file), buildIcon(source, name, font));
  console.log(`${DRAWINGS[name].padEnd(36)} -> public/icons/strategy/${file}  (${wrap(font, name.toUpperCase()).join(' / ')})`);
}
