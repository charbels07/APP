/**
 * Child lock in a browser: a finger move that scrolls nothing must be stopped, otherwise the
 * browser drags the whole page and "pull to refresh" reloads the board (seen on an iPad).
 */
type FakeEl = {
  parentElement: FakeEl | null;
  style: { overflowY?: string; overflowX?: string };
  scrollTop: number;
  clientHeight: number;
  scrollHeight: number;
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
};
const el = (parent: FakeEl | null, o: Partial<FakeEl> = {}): FakeEl => ({
  parentElement: parent,
  style: {},
  scrollTop: 0,
  clientHeight: 100,
  scrollHeight: 100,
  scrollLeft: 0,
  clientWidth: 100,
  scrollWidth: 100,
  ...o,
});

describe('child lock in a browser: the page cannot be pulled', () => {
  const body = el(null);
  let canScrollWith: (target: unknown, dx: number, dy: number) => boolean;
  beforeAll(() => {
    const g = globalThis as unknown as { document: unknown; window: unknown };
    g.document = { body, documentElement: el(null) };
    g.window = { getComputedStyle: (e: FakeEl) => ({ overflowY: e.style.overflowY ?? 'visible', overflowX: e.style.overflowX ?? 'visible' }) };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    canScrollWith = require('../lib/childLock.web').canScrollWith;
  });

  it('a card of the board scrolls nothing: pulling down (or any way) is stopped', () => {
    const card = el(el(body));
    expect(canScrollWith(card, 0, 80)).toBe(false); // the pull that reloaded the page
    expect(canScrollWith(card, 0, -80)).toBe(false);
    expect(canScrollWith(card, 60, 5)).toBe(false);
  });

  it('a list inside a panel still scrolls, but not past its ends', () => {
    const list = el(body, { style: { overflowY: 'auto' }, scrollHeight: 500 });
    const row = el(list);
    // At the top: sliding up shows what is below; pulling down would drag the page.
    expect(canScrollWith(row, 0, -40)).toBe(true);
    expect(canScrollWith(row, 0, 40)).toBe(false);
    list.scrollTop = 200;
    expect(canScrollWith(row, 0, 40)).toBe(true);
    expect(canScrollWith(row, 0, -40)).toBe(true);
    list.scrollTop = 400; // the very end
    expect(canScrollWith(row, 0, -40)).toBe(false);
    expect(canScrollWith(row, 0, 40)).toBe(true);
  });

  it('a wide board still slides sideways, in both writing directions', () => {
    const grid = el(body, { style: { overflowX: 'scroll' }, scrollWidth: 900 });
    const card = el(grid);
    expect(canScrollWith(card, -50, 4)).toBe(true); // more on the right
    expect(canScrollWith(card, 50, 4)).toBe(false); // already at the start
    grid.scrollLeft = -300; // a right-to-left page counts backwards
    expect(canScrollWith(card, 50, 4)).toBe(true);
    // Sideways room does not let the page be pulled down.
    expect(canScrollWith(card, 3, 70)).toBe(false);
  });

  it('something that hides its overflow is not a scroller', () => {
    const clipped = el(body, { style: { overflowY: 'hidden' }, scrollHeight: 500, scrollTop: 100 });
    expect(canScrollWith(el(clipped), 0, 40)).toBe(false);
  });
});
