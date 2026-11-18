/**
 * Ways to choose without pointing precisely (Settings → Touch), shared by the pieces of the
 * board's screen: switch scanning (the board says what it holds, the scanner lights it) and
 * choosing by resting the pointer (any card or button can fill up and be chosen).
 * Provided by src/ui/Root.tsx; outside it, a quiet default does nothing.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { createDwell, dwellMs, type Dwell, type Where } from '../lib/dwell';
import { useAppMaybe } from './AppState';

/** What the open board offers to the scan. */
export interface ScanGrid {
  /** Changes when what is on screen changes (another board, a folder, more words shown). */
  key: string;
  /** Rows of card ids (`c:index`), in the order seen on screen. */
  rows: string[][];
  choose: (id: string) => void;
  /** The word said for auditory scanning; null for a folder (its name is never said). */
  word: (id: string) => string | null;
}

/** What the scan lights: a whole row, or one item. */
export interface ScanLit {
  level: 'rows' | 'items' | null;
  ids: string[];
}

const NOTHING: ScanLit = { level: null, ids: [] };

export interface ScanStore {
  grid: () => ScanGrid | null;
  setGrid: (g: ScanGrid | null) => void;
  lit: () => ScanLit;
  setLit: (l: ScanLit) => void;
  subscribe: (fn: () => void) => () => void;
}

export function createScanStore(): ScanStore {
  let grid: ScanGrid | null = null;
  let lit: ScanLit = NOTHING;
  const listeners = new Set<() => void>();
  const tell = () => listeners.forEach((fn) => fn());
  return {
    grid: () => grid,
    setGrid: (g) => {
      grid = g;
      tell();
    },
    lit: () => lit,
    setLit: (l) => {
      if (l.level === lit.level && l.ids.join() === lit.ids.join()) return;
      lit = l.ids.length ? l : NOTHING;
      tell();
    },
    subscribe: (fn) => {
      listeners.add(fn);
      return () => void listeners.delete(fn);
    },
  };
}

interface Access {
  scan: ScanStore;
  dwell: Dwell;
}

const fallback: Access = { scan: createScanStore(), dwell: createDwell() };
const Ctx = createContext<Access>(fallback);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const value = useMemo<Access>(() => ({ scan: createScanStore(), dwell: createDwell() }), []);
  useEffect(() => () => value.dwell.stop(), [value]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAccess = () => useContext(Ctx);

/** What the scan lights now (re-renders only when it changes). */
export function useScanLit(): ScanLit {
  const { scan } = useAccess();
  return useSyncExternalStore(scan.subscribe, scan.lit, scan.lit);
}

/** Is this item lit by the scan (alone, or with its row)? */
export function useScanned(id: string): boolean {
  const { scan } = useAccess();
  const get = useCallback(() => scan.lit().ids.includes(id), [scan, id]);
  return useSyncExternalStore(scan.subscribe, get, get);
}

/** The resting time of the open board in milliseconds: 0 when it is off, and always in caregiver mode. */
export function useRestMs(): number {
  const app = useAppMaybe();
  return !app || app.editMode ? 0 : dwellMs(app.profile.settings);
}

export interface DwellTarget {
  /** The pointer rests on it: show the filling (it lasts `ms`). */
  active: boolean;
  ms: number;
  /** For the Pressable (undefined when resting is off). */
  onHoverIn?: (e?: unknown) => void;
  onHoverOut?: (e?: unknown) => void;
}

/**
 * The pointer's position in a hover event, and on entering the target's place on screen (the
 * browser gives both; a tablet may give only the position, or nothing).
 */
function whereOf(e: unknown, withPlace: boolean): Where | undefined {
  const ev = e as { nativeEvent?: unknown; currentTarget?: unknown; target?: unknown } | undefined;
  const ne = (ev?.nativeEvent ?? ev) as { clientX?: unknown; clientY?: unknown } | undefined;
  const x = ne?.clientX;
  const y = ne?.clientY;
  if (typeof x !== 'number' || typeof y !== 'number') return undefined;
  if (!withPlace) return { x, y };
  const el = (ev?.currentTarget ?? ev?.target) as { getBoundingClientRect?: () => { left: number; top: number; width: number; height: number } } | undefined;
  const r = typeof el?.getBoundingClientRect === 'function' ? el.getBoundingClientRect() : undefined;
  return { x, y, rect: r ? { x: r.left, y: r.top, w: r.width, h: r.height } : undefined };
}

/**
 * A card or a button that can be chosen by resting the pointer on it. `id` names its place on
 * screen; `ms` = 0 (the setting is off, or caregiver mode) does nothing.
 */
export function useDwellTarget(id: string, ms: number, action: () => void): DwellTarget {
  const { dwell } = useAccess();
  const actionRef = useRef(action);
  actionRef.current = action;
  const on = ms > 0;
  const get = useCallback(() => on && dwell.state().target === id, [dwell, id, on]);
  const active = useSyncExternalStore(dwell.subscribe, get, get);
  // Gone from the screen (or the setting turned off): its filling stops.
  useEffect(() => () => dwell.forget(id), [dwell, id, on]);
  const onHoverIn = useCallback((e?: unknown) => dwell.enter(id, ms, () => actionRef.current(), whereOf(e, true)), [dwell, id, ms]);
  const onHoverOut = useCallback((e?: unknown) => dwell.leave(id, whereOf(e, false)), [dwell, id]);
  return on ? { active, ms, onHoverIn, onHoverOut } : { active: false, ms };
}
