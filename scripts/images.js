import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const WIDTHS = [480, 960, 1440];
const QUALITY = 80;
// Cards sit under a scrim and are many to a page, so they can spare quality that plans and
// section photographs can't. At 80, ten cards on a phone miss the Lighthouse target.
export const CARD_QUALITY = 50;

// Source names contain spaces, apostrophes and accents, none of which belong in a URL.
function urlSafeName(src) {
  const name = src
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return name || 'image';
}

async function encode(sourcePath, outputDir, baseName, { quality, widths: requested, rotation }) {
  const metadata = await sharp(sourcePath).metadata();
  // Orientations 5-8 are rotated a quarter turn, so the stored width is the visual height.
  const sourceWidth = metadata.orientation >= 5 ? metadata.height : metadata.width;
  // Clamped rather than filtered: an 800px source would otherwise top out at 480 and
  // lose detail it actually has.
  const widths = [...new Set(requested.map((width) => Math.min(width, sourceWidth)))];

  mkdirSync(outputDir, { recursive: true });
  const variants = [];
  for (const width of widths) {
    const file = `${baseName}-${width}.webp`;
    const info = await sharp(sourcePath)
      .rotate(rotation)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality })
      .toFile(join(outputDir, file));
    variants.push({ file, width: info.width, height: info.height });
  }
  return variants;
}

export function createImageProcessor({ sourceRoot, cacheDir }) {
  const manifestPath = join(cacheDir, 'manifest.json');
  let manifest = {};
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    // No cache yet, or an unreadable one: both just mean re-encoding.
  }

  return {
    /** Resolves to { folder, variants: [{ file, width, height }] }, smallest first. */
    async process(slug, src, { quality = QUALITY, widths = WIDTHS, rotation } = {}) {
      const sourcePath = join(sourceRoot, slug, src);
      const { mtimeMs } = statSync(sourcePath);
      const settings = JSON.stringify({ WIDTHS: widths, QUALITY: quality, rotation });
      // The hash is also in the output name, so an edited image gets a new URL and
      // can't be served stale from a long-lived browser cache.
      const hash = createHash('sha256')
        .update(`${slug}/${src}|${mtimeMs}|${settings}`)
        .digest('hex')
        .slice(0, 10);
      const folder = join(cacheDir, slug);

      const cached = manifest[hash];
      if (cached?.every(({ file }) => existsSync(join(folder, file)))) {
        return { folder, variants: cached };
      }

      const variants = await encode(sourcePath, folder, `${urlSafeName(src)}-${hash}`, { quality, widths, rotation });
      manifest[hash] = variants;
      return { folder, variants };
    },

    save() {
      mkdirSync(cacheDir, { recursive: true });
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    },
  };
}
