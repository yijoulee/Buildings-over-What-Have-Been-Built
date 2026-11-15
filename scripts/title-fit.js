// Measures a case study title so CSS can keep it to two lines without JavaScript.
//
// The browser can't be asked how wide text will be before it lays it out, so the build asks
// the font instead: it finds the split into two lines whose longer line is shortest, and
// hands CSS that line's advance (in em) and its character count. CSS adds the tracking, which
// is fluid and so only known in the browser, and sizes the title so that line fits.
import { join } from 'node:path';
import { openSync } from 'fontkit';

// The title's face. The fallback in --font-text is only seen until this has loaded.
const FONT_FILE = join('public', 'fonts', 'abel-latin-400.woff2');

// The most tracking a title gets, --tracking-h1-max in tokens.css. Lines are compared at it
// so a short line of many narrow letters isn't mistaken for the narrower one.
const TRACKING_MAX = 0.2;

let font;

export function measureTitle(root, title) {
  font ??= openSync(join(root, FONT_FILE));
  // Characters, not UTF-16 units: letter-spacing is added once per character.
  const line = (words) => {
    const text = words.join(' ');
    const chars = [...text].length;
    const advance = font.layout(text).advanceWidth / font.unitsPerEm;
    return { advance, chars, width: advance + TRACKING_MAX * chars };
  };

  const words = title.trim().split(/\s+/);
  // One line is a split too, and the only one for a single word.
  let best = line(words);
  for (let i = 1; i < words.length; i += 1) {
    const [first, second] = [line(words.slice(0, i)), line(words.slice(i))];
    const longer = first.width >= second.width ? first : second;
    if (longer.width < best.width) best = longer;
  }
  return { advance: Number(best.advance.toFixed(4)), chars: best.chars };
}
