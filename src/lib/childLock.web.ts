/**
 * Child lock, browser side. A web page cannot lock a tablet the way Guided Access does, so it
 * does what a page can:
 *  - full screen, asked again at the next touch if the child left it (Safari on iPad always lets
 *    a swipe down leave full screen: no site can stop that);
 *  - the page cannot be pulled, bounced or "pulled to refresh" (which reloaded the board);
 *  - the browser asks before the page is closed or left.
 */
export function enterFullscreen(): void {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) void el.requestFullscreen().catch(() => {});
  } catch {
    /* not allowed here */
  }
}

export function exitFullscreen(): void {
  try {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * True when something under the finger can still scroll the way the finger moves (`dx`, `dy`:
 * how far the finger went). When nothing can, the move would only drag the whole page.
 */
export function canScrollWith(target: Element | null, dx: number, dy: number): boolean {
  const vertical = Math.abs(dy) >= Math.abs(dx);
  for (let el: Element | null = target; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
    const style = window.getComputedStyle(el);
    if (vertical) {
      if (!/auto|scroll/.test(style.overflowY) || el.scrollHeight <= el.clientHeight + 1) continue;
      // Finger going down shows what is above; going up, what is below.
      if (dy > 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    } else {
      if (!/auto|scroll/.test(style.overflowX) || el.scrollWidth <= el.clientWidth + 1) continue;
      const left = Math.abs(el.scrollLeft); // negative in right-to-left pages
      if (dx > 0 ? left > 0 : left + el.clientWidth < el.scrollWidth - 1) return true;
    }
  }
  return false;
}

/** While the child lock is on; returns the function that undoes everything. */
export function guardLeaving(): () => void {
  const ask = (e: BeforeUnloadEvent) => {
    e.preventDefault();
    e.returnValue = '';
  };
  window.addEventListener('beforeunload', ask);

  // The page itself never moves: no bounce at the edges, no "pull down to reload".
  const html = document.documentElement.style;
  const body = document.body.style;
  const before = { html: html.overscrollBehavior, body: body.overscrollBehavior };
  html.overscrollBehavior = 'none';
  body.overscrollBehavior = 'none';
  // Older Safari ignores that setting: there, a finger move that scrolls nothing is stopped
  // before the browser turns it into a pull of the whole page.
  let x = 0;
  let y = 0;
  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1) return;
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  };
  const onMove = (e: TouchEvent) => {
    if (!e.cancelable || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - x;
    const dy = e.touches[0].clientY - y;
    if (!canScrollWith(e.target as Element | null, dx, dy)) e.preventDefault();
  };
  document.addEventListener('touchstart', onStart, { passive: true, capture: true });
  document.addEventListener('touchmove', onMove, { passive: false, capture: true });

  // The child swiped out of full screen: the next touch brings it back (a browser only accepts
  // full screen from inside a touch or a click).
  // Not while a panel is open: an adult may be typing the code there to take the lock off.
  const backToFullscreen = () => {
    if (!document.querySelector('[role="dialog"]')) enterFullscreen();
  };
  document.addEventListener('touchend', backToFullscreen, true);
  document.addEventListener('click', backToFullscreen, true);

  return () => {
    window.removeEventListener('beforeunload', ask);
    html.overscrollBehavior = before.html;
    body.overscrollBehavior = before.body;
    document.removeEventListener('touchstart', onStart, true);
    document.removeEventListener('touchmove', onMove, true);
    document.removeEventListener('touchend', backToFullscreen, true);
    document.removeEventListener('click', backToFullscreen, true);
  };
}
