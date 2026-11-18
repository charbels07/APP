/** Settings → Touch: choosing by resting the pointer, the touch that counts, and old profiles. */
import { DEFAULT_SETTINGS, createDefaultProfile } from '../data/defaults';
import { createDwell, dwellMs, type Timers } from '../lib/dwell';
import { migrate } from '../lib/storage';
import { createLandingChoice, landingTouch } from '../lib/touchChoice';

/** Timers driven by the test: `tick(ms)` moves the clock on. */
function fakeTimers() {
  let now = 0;
  let seq = 0;
  const due = new Map<number, { at: number; fn: () => void }>();
  const timers: Timers = {
    set: (fn, ms) => {
      due.set(++seq, { at: now + ms, fn });
      return seq;
    },
    clear: (h) => void due.delete(h as number),
    now: () => now,
  };
  const tick = (ms: number) => {
    const end = now + ms;
    for (;;) {
      const next = [...due.entries()].filter(([, d]) => d.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!next) break;
      due.delete(next[0]);
      now = next[1].at;
      next[1].fn();
    }
    now = end;
  };
  return { timers, tick, pending: () => due.size };
}

describe('choosing by resting the pointer', () => {
  it('is off unless chosen, between 0.5 and 3 seconds', () => {
    expect(dwellMs({})).toBe(0);
    expect(dwellMs({ dwell: 0 })).toBe(0);
    expect(dwellMs({ dwell: 1.5 })).toBe(1500);
    expect(dwellMs({ dwell: 0.1 })).toBe(500);
    expect(dwellMs({ dwell: 60 })).toBe(3000);
    expect(dwellMs({ dwell: NaN })).toBe(0);
  });

  it('chooses a card when the pointer rests on it long enough, with the filling meanwhile', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    const chosen: string[] = [];
    d.enter('slot:3', 1000, () => chosen.push('slot:3'));
    expect(d.state()).toMatchObject({ target: 'slot:3', since: 0 });
    tick(999);
    expect(chosen).toEqual([]);
    tick(1);
    expect(chosen).toEqual(['slot:3']);
    expect(d.state().target).toBeNull();
  });

  it('leaving before the time chooses nothing', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    const chosen: string[] = [];
    d.enter('slot:3', 1000, () => chosen.push('slot:3'));
    tick(600);
    d.leave('slot:3');
    tick(2000);
    expect(chosen).toEqual([]);
  });

  it('moving to another card starts again there', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    const chosen: string[] = [];
    d.enter('slot:1', 1000, () => chosen.push('slot:1'));
    tick(700);
    d.leave('slot:1');
    d.enter('slot:2', 1000, () => chosen.push('slot:2'));
    tick(700);
    expect(chosen).toEqual([]);
    tick(300);
    expect(chosen).toEqual(['slot:2']);
  });

  it('no second choice until the pointer has left the card', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    let n = 0;
    d.enter('slot:5', 500, () => n++);
    tick(500);
    // A folder opened under the pointer: the card now at this place is not chosen…
    d.enter('slot:5', 500, () => n++);
    tick(5000);
    expect(n).toBe(1);
    // …until the pointer leaves it and comes back.
    d.leave('slot:5');
    d.enter('slot:5', 500, () => n++);
    tick(500);
    expect(n).toBe(2);
  });

  it('a folder opened under the pointer: the card now at that place waits until the pointer has left the place', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    const chosen: string[] = [];
    const food = { x: 1000, y: 210, w: 90, h: 110 };
    d.enter('slot:23', 1000, () => chosen.push('food'), { x: 1040, y: 260, rect: food });
    tick(1000);
    expect(chosen).toEqual(['food']);
    // The folder's board is drawn: another card (another target) is under the pointer, which barely moved.
    d.enter('slot:9', 1000, () => chosen.push('egg'), { x: 1042, y: 262, rect: { x: 980, y: 200, w: 120, h: 130 } });
    tick(3000);
    expect(chosen).toEqual(['food']);
    // The pointer leaves that card, still inside the old place: the neighbour entered there waits too.
    d.leave('slot:9', { x: 1050, y: 300 });
    d.enter('slot:10', 1000, () => chosen.push('milk'), { x: 1050, y: 301 });
    tick(3000);
    expect(chosen).toEqual(['food']);
    // Out of the old place: everything works again.
    d.leave('slot:10', { x: 1095, y: 330 });
    d.enter('slot:11', 1000, () => chosen.push('bread'), { x: 1100, y: 340, rect: { x: 1100, y: 335, w: 90, h: 110 } });
    tick(1000);
    expect(chosen).toEqual(['food', 'bread']);
  });

  it('the same word again: leave the card, come back, rest again', () => {
    const { timers, tick } = fakeTimers();
    const d = createDwell(timers);
    let n = 0;
    const card = { x: 100, y: 100, w: 80, h: 100 };
    d.enter('slot:1', 500, () => n++, { x: 140, y: 150, rect: card });
    tick(500);
    d.leave('slot:1', { x: 100, y: 150 });
    d.enter('slot:1', 500, () => n++, { x: 102, y: 150, rect: card });
    tick(500);
    expect(n).toBe(2);
  });

  it('a card that leaves the screen stops filling; turned off, nothing happens', () => {
    const { timers, tick, pending } = fakeTimers();
    const d = createDwell(timers);
    let n = 0;
    d.enter('slot:1', 800, () => n++);
    d.forget('slot:1');
    expect(pending()).toBe(0);
    d.enter('slot:2', 0, () => n++);
    tick(5000);
    expect(n).toBe(0);
    expect(d.state().target).toBeNull();
  });

  it('tells the screen when something changes', () => {
    const d = createDwell(fakeTimers().timers);
    let calls = 0;
    const off = d.subscribe(() => calls++);
    d.enter('a:speak', 800, () => {});
    d.leave('a:speak');
    off();
    d.enter('a:speak', 800, () => {});
    expect(calls).toBe(2);
  });
});

describe('the touch that counts (a hand that shakes)', () => {
  it('is used only when chosen, outside caregiver mode, and not with "as soon as the finger touches"', () => {
    expect(landingTouch({ access: 'release' }, false)).toBe(false);
    expect(landingTouch({ access: 'release', touchPoint: 'lift' }, false)).toBe(false);
    expect(landingTouch({ access: 'release', touchPoint: 'land' }, false)).toBe(true);
    expect(landingTouch({ access: 'hold', touchPoint: 'land' }, false)).toBe(true);
    expect(landingTouch({ access: 'press', touchPoint: 'land' }, false)).toBe(false);
    expect(landingTouch({ access: 'release', touchPoint: 'land' }, true)).toBe(false);
  });

  it('"where it first lands": the card landed on is chosen when the finger lifts, wherever it slipped', () => {
    const { timers } = fakeTimers();
    const chosen: number[] = [];
    const c = createLandingChoice({ choose: (i) => chosen.push(i), hold: () => 0, timers });
    c.pressIn(4);
    // (the finger slides onto other cards: the touch stays with card 4)
    expect(chosen).toEqual([]);
    c.pressOut(4);
    expect(chosen).toEqual([4]);
    // Once only.
    c.pressOut(4);
    expect(chosen).toEqual([4]);
  });

  it('with a hold time: chosen once the finger stayed down long enough, even if it slid; lifted too early, nothing', () => {
    const { timers, tick } = fakeTimers();
    const chosen: number[] = [];
    const c = createLandingChoice({ choose: (i) => chosen.push(i), hold: () => 1000, timers });
    c.pressIn(2);
    tick(400);
    c.pressOut(2);
    tick(2000);
    expect(chosen).toEqual([]);
    c.pressIn(7);
    tick(1000);
    expect(chosen).toEqual([7]);
    c.pressOut(7);
    expect(chosen).toEqual([7]);
  });

  it('stops everything half-pressed (another board, caregiver mode)', () => {
    const { timers, tick } = fakeTimers();
    const chosen: number[] = [];
    const c = createLandingChoice({ choose: (i) => chosen.push(i), hold: () => 500, timers });
    c.pressIn(1);
    c.stop();
    tick(1000);
    c.pressOut(1);
    expect(chosen).toEqual([]);
  });
});

describe('Settings → Touch in the profile', () => {
  it('a new profile has everything off: the board works as before', () => {
    const st = createDefaultProfile().settings;
    expect(st.scan?.mode).toBe('off');
    expect(st.dwell).toBe(0);
    expect(st.touchPoint).toBe('lift');
    expect(st.bigTouch).toBe(false);
  });

  it('a profile saved before gets the defaults, and keeps what was chosen', () => {
    const old = createDefaultProfile() as unknown as { settings: Record<string, unknown> };
    delete old.settings.scan;
    delete old.settings.dwell;
    delete old.settings.touchPoint;
    delete old.settings.bigTouch;
    const m = migrate(JSON.parse(JSON.stringify(old)));
    expect(m.settings.scan).toEqual(DEFAULT_SETTINGS.scan);
    expect(m.settings.dwell).toBe(0);
    const chosen = createDefaultProfile();
    chosen.settings.scan = { ...DEFAULT_SETTINGS.scan!, mode: 'step', speed: 3 };
    const kept = migrate(JSON.parse(JSON.stringify({ ...chosen, settings: { ...chosen.settings, scan: { mode: 'step', speed: 3 } } })));
    expect(kept.settings.scan).toMatchObject({ mode: 'step', speed: 3, pattern: 'rows', loops: 3 });
  });
});
