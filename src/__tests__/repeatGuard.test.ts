import { createDefaultProfile } from '../data/defaults';
import { createRepeatGuard } from '../lib/repeatGuard';

describe('delay between two presses on the same pictogram', () => {
  it('ignores the same pictogram pressed again within the delay', () => {
    const accept = createRepeatGuard();
    expect(accept('not', 2000, 0)).toBe(true);
    expect(accept('not', 2000, 300)).toBe(false); // « pas pas »
    expect(accept('not', 2000, 1900)).toBe(false);
    expect(accept('not', 2000, 2000)).toBe(true); // counted from the last accepted press
    expect(accept('not', 2000, 2500)).toBe(false);
  });
  it('lets other pictograms through at once', () => {
    const accept = createRepeatGuard();
    expect(accept('i', 2000, 0)).toBe(true);
    expect(accept('want', 2000, 100)).toBe(true);
    expect(accept('eat', 2000, 200)).toBe(true);
    expect(accept('i', 2000, 300)).toBe(false);
  });
  it('can be turned off, and is on (2 s) by default', () => {
    const accept = createRepeatGuard();
    expect([accept('more', 0, 0), accept('more', 0, 10), accept('more', 0, 20)]).toEqual([true, true, true]);
    expect(createDefaultProfile().settings.repeatDelay).toBe(2);
  });
});
