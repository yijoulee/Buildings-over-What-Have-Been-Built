// A red corner mark disappears where it lies over a red text block, so those corners turn
// black. Which corners overlap depends on how tall each block's text runs at the current
// width, so it's measured rather than set in CSS. Without scripts every corner stays red.

const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
const OVERLAP_COLOUR = 'var(--colour-ink)';

const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

// The area one corner's two bars cover, from the frame's box and the bars' own size.
function cornerBox(frame, corner) {
  const box = frame.getBoundingClientRect();
  const style = getComputedStyle(frame, '::after');
  const outset = parseFloat(style.top) || 0;
  const length = parseFloat(getComputedStyle(frame).getPropertyValue('--corner-length')) || 0;
  const left = corner.endsWith('left') ? box.left + outset : box.right - outset - length;
  const top = corner.startsWith('top') ? box.top + outset : box.bottom - outset - length;
  return { left, top, right: left + length, bottom: top + length };
}

function update(pair) {
  const red = pair.querySelector('.approach-pair__text').getBoundingClientRect();
  for (const frame of pair.querySelectorAll('.image-frame')) {
    for (const corner of CORNERS) {
      const property = `--corner-${corner}`;
      if (intersects(cornerBox(frame, corner), red)) frame.style.setProperty(property, OVERLAP_COLOUR);
      else frame.style.removeProperty(property);
    }
  }
}

const pairs = [...document.querySelectorAll('.approach-pair')];
const updateAll = () => pairs.forEach(update);
// Resizing reflows the text, and fonts and figures arriving change the blocks' heights.
const observer = new ResizeObserver(updateAll);
pairs.forEach((pair) => {
  observer.observe(pair);
  pair.querySelectorAll('.approach-pair__text, .approach-pair__media').forEach((el) => observer.observe(el));
});
document.fonts.ready.then(updateAll);
updateAll();
