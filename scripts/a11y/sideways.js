// How far a page goes past the sides of the window (WCAG 1.4.10, "reflow"). Used by the two scans:
// `Object.assign(extra, await page.evaluate(sideways))`. It runs inside the page and gives
// { overflowX, overflowBy }: the number of pixels (0 when all is well) and what sticks out the most.
// Two measures, the larger one is kept:
// - what the page itself says (scrollWidth), which only sees the right-hand side;
// - each visible element outside a scrolling area: the Arabic menus are mirrored row by row, so a
//   row that is too long there sticks out on the LEFT, which the first measure never sees.
// What scrolls inside its own area (the board's cards, a row of tabs) is not counted.
function sideways() {
  const w = window.innerWidth;
  const clipped = (e) => {
    for (let x = e.parentElement; x && x !== document.body; x = x.parentElement) if (getComputedStyle(x).overflowX !== 'visible') return true;
    return false;
  };
  let worst = 0;
  let by = '';
  for (const e of document.querySelectorAll('body *')) {
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const out = Math.max(r.right - w, -r.left);
    if (out > worst + 0.5 && getComputedStyle(e).visibility !== 'hidden' && !clipped(e)) {
      worst = out;
      by = (e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 30);
    }
  }
  const page = document.documentElement.scrollWidth - w;
  return { overflowX: Math.max(Math.round(worst), page), overflowBy: by || 'the page' };
}
module.exports = { sideways };
