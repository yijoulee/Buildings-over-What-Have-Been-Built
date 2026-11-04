// Shrinks the Approach page's figures for publishing:
//   node scripts/optimise-figures.mjs
// Reads the sources in assets/figures/approach/ (gitignored: fig1 alone is tens of MB) and
// writes the published copies to public/figures/approach/.
//
// Embedded images stay embedded. A browser showing an SVG through <img> loads nothing from
// outside the file, so an image moved to its own file would simply disappear.
//
// Labels are set in Microsoft YaHei UI and hand-kerned words are joined back up; the source
// files themselves are never changed.
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { optimize } from 'svgo';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_DIR = join(ROOT, 'assets', 'figures', 'approach');
const OUTPUT_DIR = join(ROOT, 'public', 'figures', 'approach');

// 2x first; a figure still over the target is redone at the lower density, which the brief's
// "at most 2x" allows.
const PIXEL_DENSITIES = [2, 1.5];
const SMALL_DENSITY = 0.75;
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 80;
const TARGET_BYTES = 500 * 1024;
const STOP_BYTES = 1024 * 1024;

const attr = (tag, name) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];

// Every label in one family, so the figures read as a set wherever YaHei is installed.
const FIGURE_FONT = `'Microsoft YaHei UI', sans-serif`;

// In a <style> block the quotes are written &apos;, whose own semicolon mustn't end the value.
function unifyFonts(svg) {
  return svg
    .replace(/font-family="([^"]*)"/g, (whole, value) => (/YaHei/.test(value) ? whole : `font-family="${FIGURE_FONT}"`))
    .replace(/font-family:((?:&[a-z]+;|[^;}"])*)/g, (whole, value) => (/YaHei/.test(value) ? whole : `font-family:${FIGURE_FONT.replaceAll("'", '&apos;')}`));
}

// Illustrator hand-kerns some words by splitting them into pieces, each pinned to its own x
// with negative letter-spacing. Those offsets only fit the exact font they were set in; any
// other font, even a different weight, pushes letters into each other. Pieces on the same line
// are joined back into one run, so the word keeps its even letter-spacing in any font.
function joinKernedRuns(svg) {
  return svg.replace(/(<text\b[^>]*>)([\s\S]*?)(<\/text>)/g, (whole, open, body, close) => {
    const pieces = [...body.matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
    if (pieces.length < 2 || pieces.map((p) => p[0]).join('') !== body.trim()) return whole;
    // Only runs kerned inline, as in fig4. fig3 sets its spacing through classes, and joining
    // those pieces would drop the class that sizes them.
    if (!pieces.some(([, attrs]) => /font-kerning:\s*none|letter-spacing="/.test(attrs))) return whole;
    const lines = new Map();
    for (const [, attrs, text] of pieces) {
      const y = attr(` ${attrs}`, 'y') ?? '0';
      if (!lines.has(y)) lines.set(y, { attrs, text: '' });
      lines.get(y).text += text;
    }
    if (lines.size === pieces.length) return whole;
    const tspans = [...lines.values()].map(({ attrs, text }) => {
      const kept = attrs.replace(/\s(letter-spacing|style)="[^"]*"/g, '');
      return `<tspan${kept}>${text}</tspan>`;
    });
    return `${open}${tspans.join('')}${close}`;
  });
}

// The scale a transform applies, from the length of its first column. Only matrix() and
// scale() appear in these exports; translate() and rotate() leave the size alone.
function transformScale(transform) {
  if (!transform) return 1;
  let scale = 1;
  for (const [, kind, args] of transform.matchAll(/(matrix|scale)\(([^)]*)\)/g)) {
    const n = args.split(/[\s,]+/).filter(Boolean).map(Number);
    scale *= kind === 'matrix' ? Math.hypot(n[0], n[1]) : n[0];
  }
  return scale;
}

// Every <g transform> still open at this point also scales the image.
function ancestorScale(svg, index) {
  const stack = [];
  for (const [tag] of svg.slice(0, index).matchAll(/<\/?g\b[^>]*>/g)) {
    if (tag.startsWith('</')) stack.pop();
    else if (!tag.endsWith('/>')) stack.push(transformScale(attr(tag, 'transform')));
  }
  return stack.reduce((a, b) => a * b, 1);
}

async function shrinkImages(svg, density) {
  const report = [];
  const tags = [...svg.matchAll(/<image\b[^>]*>/g)];
  let out = '';
  let last = 0;
  for (const match of tags) {
    const tag = match[0];
    const hrefName = attr(tag, 'xlink:href') !== undefined ? 'xlink:href' : 'href';
    const href = attr(tag, hrefName) ?? '';
    const data = href.match(/^data:image\/(png|jpe?g|webp);base64,(.*)$/s);
    if (!data) { report.push({ note: 'not an embedded image, left as is' }); continue; }

    const input = Buffer.from(data[2], 'base64');
    const { width: sourceWidth, height: sourceHeight } = await sharp(input).metadata();
    const shown = Number(attr(tag, 'width') ?? sourceWidth) * transformScale(attr(tag, 'transform')) * ancestorScale(svg, match.index);
    const width = Math.min(sourceWidth, MAX_WIDTH, Math.round(shown * density));
    const webp = await sharp(input).resize({ width, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer();

    // width and height stay as they were: the transform maps them into place, and the
    // smaller bitmap is simply stretched to fill the same box.
    const newTag = tag.replace(`${hrefName}="${href}"`, `${hrefName}="data:image/webp;base64,${webp.toString('base64')}"`);
    out += svg.slice(last, match.index) + newTag;
    last = match.index + tag.length;
    report.push({ from: `${sourceWidth}x${sourceHeight} ${data[1]} ${kb(input.length)}`, shown: Math.round(shown), to: `${width}px webp ${kb(webp.length)}` });
  }
  return { svg: out + svg.slice(last), report };
}

const kb = (bytes) => `${(bytes / 1024).toFixed(0)} KB`;
const size = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(2)} MB` : kb(bytes));

const SVGO_CONFIG = {
  multipass: true,
  plugins: [
    {
      name: 'preset-default',
      params: {
        // IDs carry the clip paths. svgo 4 already keeps viewBox and <title> by default.
        overrides: { cleanupIds: false },
      },
    },
  ],
};

mkdirSync(OUTPUT_DIR, { recursive: true });
const rows = [];
let stop = false;
for (const name of readdirSync(SOURCE_DIR).filter((file) => file.endsWith('.svg')).sort()) {
  const sourcePath = join(SOURCE_DIR, name);
  const before = statSync(sourcePath).size;
  const source = joinKernedRuns(unifyFonts(readFileSync(sourcePath, 'utf8')));
  let result;
  for (const density of PIXEL_DENSITIES) {
    const { svg, report } = await shrinkImages(source, density);
    const { data } = optimize(svg, { path: name, ...SVGO_CONFIG });
    result = { data, report, density };
    if (Buffer.byteLength(data) <= TARGET_BYTES) break;
  }
  writeFileSync(join(OUTPUT_DIR, name), result.data);
  const after = Buffer.byteLength(result.data);
  rows.push({ name, before, after, report: result.report, density: result.density });
  if (after > STOP_BYTES) stop = true;

  // A lighter copy for phones, picked by srcset. On a 375px screen a figure is drawn about a
  // third of its own width, so photographs at this density are still sharper than shown.
  if (result.report.some((r) => !r.note)) {
    const { svg } = await shrinkImages(source, SMALL_DENSITY);
    const { data } = optimize(svg, { path: name, ...SVGO_CONFIG });
    const smallName = name.replace(/\.svg$/, '-small.svg');
    writeFileSync(join(OUTPUT_DIR, smallName), data);
    rows.push({ name: smallName, before, after: Buffer.byteLength(data), report: [] });
  }
}

console.log('\n| Figure | Before | After | Target |');
console.log('| --- | --- | --- | --- |');
for (const { name, before, after } of rows) {
  console.log(`| ${name} | ${size(before)} | ${size(after)} | ${after <= TARGET_BYTES ? 'under 500 KB' : 'OVER 500 KB'} |`);
}
for (const { name, report, density } of rows.filter((row) => row.report.length > 0)) {
  console.log(`\n${name}, images at ${density}x their shown size`);
  report.forEach((r, i) => console.log(`  image ${i + 1}: ${r.note ?? `${r.from}, shown ${r.shown} units wide -> ${r.to}`}`));
}
if (stop) {
  console.error('\nA figure is still over 1 MB. Stopping here, as the brief asks.');
  process.exitCode = 1;
}
