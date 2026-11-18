/**
 * "Which touch counts" (Settings → Touch), for a child whose hand shakes or slips.
 *
 * - Where the finger lifts (standard, also when not set): the usual touch of the app.
 * - Where the finger first lands: the card the finger landed on is chosen, even if the finger
 *   slips onto another card or off the board before it lifts. With "Keep the finger pressed",
 *   the finger must stay down the hold time, wherever it slides meanwhile.
 *
 * Pure and tested; the cards call it from src/ui/Grid.tsx.
 */
import type { Settings } from '../model/types';
import { realTimers, type Timers } from './dwell';

/** Is "where the finger first lands" in use? (Not in caregiver mode, and "as soon as the finger touches" already is.) */
export function landingTouch(st: Pick<Settings, 'touchPoint' | 'access'>, editMode: boolean): boolean {
  return !editMode && st.touchPoint === 'land' && (st.access ?? 'release') !== 'press';
}

export interface LandingChoice {
  /** The finger landed on this card. */
  pressIn: (index: number) => void;
  /** The finger lifted (wherever it is now), or the touch was taken away. */
  pressOut: (index: number) => void;
  stop: () => void;
}

/**
 * `hold`: milliseconds the finger must stay down ("Keep the finger pressed"), 0 = chosen when it lifts.
 * `choose` is called once per touch at most.
 */
export function createLandingChoice(opts: { choose: (index: number) => void; hold: () => number; timers?: Timers }): LandingChoice {
  const timers = opts.timers ?? realTimers;
  const down = new Map<number, { handle?: unknown; done: boolean }>();
  const clear = (index: number) => {
    const rec = down.get(index);
    if (rec?.handle !== undefined) timers.clear(rec.handle);
    down.delete(index);
    return rec;
  };
  return {
    pressIn(index) {
      clear(index);
      const rec: { handle?: unknown; done: boolean } = { done: false };
      const hold = opts.hold();
      if (hold > 0)
        rec.handle = timers.set(() => {
          rec.handle = undefined;
          rec.done = true;
          opts.choose(index);
        }, hold);
      down.set(index, rec);
    },
    pressOut(index) {
      const rec = down.get(index);
      if (!rec) return;
      const waiting = rec.handle !== undefined;
      clear(index);
      // Held: chosen by the timer (lifted too early: nothing). Otherwise: chosen now.
      if (!waiting && !rec.done) opts.choose(index);
    },
    stop() {
      for (const i of [...down.keys()]) clear(i);
    },
  };
}
