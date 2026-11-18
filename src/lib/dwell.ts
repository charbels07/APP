/**
 * Choosing by resting the pointer (Settings → Touch): a mouse, a head pointer or an eye-gaze
 * pointer that moves the cursor rests on a card for the time chosen, and the card is chosen
 * (the card fills up meanwhile). Nothing more is chosen there until the pointer leaves it.
 * Pure and tested; the screen part is `useDwellTarget` (src/state/access.tsx).
 *
 * "There" is a place on screen: when a folder opens under the pointer, the card now at the same
 * place is not chosen either until the pointer has left the place of the card it rested on (where
 * the screen gives the pointer's position; otherwise, the same target).
 */
import type { Settings } from '../model/types';

/** Seconds offered in the settings (0 = off). */
export const DWELL_TIMES = [0.5, 1, 1.5, 2, 3];

/** The resting time of a profile in milliseconds (0 = off), within bounds (it may come from another device). */
export function dwellMs(st: Pick<Settings, 'dwell'>): number {
  const s = st.dwell;
  if (typeof s !== 'number' || !Number.isFinite(s) || s <= 0) return 0;
  return Math.round(Math.min(3, Math.max(0.5, s)) * 1000);
}

export interface Timers {
  set: (fn: () => void, ms: number) => unknown;
  clear: (handle: unknown) => void;
  now: () => number;
}

export const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
  now: () => Date.now(),
};

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Where the pointer is, and (on entering) the target's place on screen, when the screen tells. */
export interface Where {
  x: number;
  y: number;
  rect?: Rect;
}

/** Strictly inside (a point on the edge, where the pointer leaves, is outside). */
const inside = (p: Where, r: Rect) => p.x > r.x + 1 && p.x < r.x + r.w - 1 && p.y > r.y + 1 && p.y < r.y + r.h - 1;

export interface DwellState {
  /** The target the pointer rests on, filling up. */
  target: string | null;
  /** When it started (ms). */
  since: number;
  /** Just chosen (or entered on the place of a choice): not before the pointer leaves it. */
  done: string | null;
}

export interface Dwell {
  /** The pointer came onto `id`: `choose` runs if it stays `ms` milliseconds. */
  enter: (id: string, ms: number, choose: () => void, at?: Where) => void;
  /** The pointer left `id`. */
  leave: (id: string, at?: Where) => void;
  /** `id` is no longer on screen: its filling stops (a choice just made stays remembered). */
  forget: (id: string) => void;
  /** Everything stops (the setting was turned off). */
  stop: () => void;
  state: () => DwellState;
  subscribe: (fn: () => void) => () => void;
}

export function createDwell(timers: Timers = realTimers): Dwell {
  let state: DwellState = { target: null, since: 0, done: null };
  /** The place of the last choice: cold until the pointer has left it. */
  let cold: Rect | null = null;
  let handle: unknown;
  const listeners = new Set<() => void>();
  const set = (next: DwellState) => {
    state = next;
    listeners.forEach((fn) => fn());
  };
  const cancel = () => {
    if (handle !== undefined) timers.clear(handle);
    handle = undefined;
  };
  return {
    enter(id, ms, choose, at) {
      if (!(ms > 0)) return;
      if (cold && at) {
        if (inside(at, cold)) {
          // Something new under a pointer that has not moved away (a folder just opened).
          if (state.done !== id) {
            cancel();
            set({ target: null, since: 0, done: id });
          }
          return;
        }
        cold = null;
      }
      if (state.done === id || state.target === id) return;
      cancel();
      set({ ...state, target: id, since: timers.now() });
      const place = at?.rect ?? null;
      handle = timers.set(() => {
        handle = undefined;
        cold = place;
        set({ target: null, since: 0, done: id });
        choose();
      }, ms);
    },
    leave(id, at) {
      if (cold && at && !inside(at, cold)) cold = null;
      if (state.target === id) {
        cancel();
        set({ ...state, target: null, since: 0 });
      }
      if (state.done === id) set({ ...state, done: null });
    },
    forget(id) {
      if (state.target !== id) return;
      cancel();
      set({ ...state, target: null, since: 0 });
    },
    stop() {
      cancel();
      cold = null;
      if (state.target || state.done) set({ target: null, since: 0, done: null });
    },
    state: () => state,
    subscribe(fn) {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}
