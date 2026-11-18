/**
 * Switch scanning (Settings → Touch), for a child who cannot point: a highlight goes over the
 * screen and one switch (automatic scanning) or two switches (step scanning) choose. The rules
 * are here, pure and tested; the screen part is src/ui/Scanner.tsx.
 *
 * What is scanned is a list of rows, in the order seen on screen: the sentence's buttons when
 * they can be used (Back in a folder, Speak, Delete), then each row of cards of the board.
 * - "Row, then card" (big boards): a whole row is lit; the switch enters it, then its cards are
 *   lit one by one. Not chosen after its turns, the row is left (the rows are lit again).
 * - "Card by card" (small boards): every item one after the other.
 * After a choice the scan starts again from the top (in the folder, when a folder was opened).
 * Automatic scanning stops after its turns and waits: the next press starts it again.
 */
import type { ScanSettings, Settings } from '../model/types';

export const SCAN_DEFAULTS: ScanSettings = { mode: 'off', pattern: 'rows', speed: 1.5, loops: 3, speak: false, screen: false };
/** Seconds on each step offered in the settings. */
export const SCAN_SPEEDS = [0.5, 1, 1.5, 2, 3, 5];
/** Turns before the automatic scan stops, offered in the settings. */
export const SCAN_LOOPS = [1, 2, 3, 5];

const within = (v: unknown, lo: number, hi: number, d: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d;

/** The scanning settings of a profile, complete and within bounds (they may come from another device). */
export function scanOf(st: Pick<Settings, 'scan'>): ScanSettings {
  const s = (st.scan && typeof st.scan === 'object' ? st.scan : {}) as Partial<ScanSettings>;
  return {
    mode: s.mode === 'auto' || s.mode === 'step' ? s.mode : 'off',
    pattern: s.pattern === 'cards' ? 'cards' : 'rows',
    speed: within(s.speed, 0.5, 5, SCAN_DEFAULTS.speed),
    loops: Math.round(within(s.loops, 1, 5, SCAN_DEFAULTS.loops)),
    speak: s.speak === true,
    screen: s.screen === true,
  };
}

export type ScanMode = 'auto' | 'step';
export type ScanPattern = ScanSettings['pattern'];

export interface ScanRules {
  mode: ScanMode;
  /** Turns before stopping (automatic) or before leaving a row that was entered. */
  loops: number;
}

export interface ScanState {
  /** 'rows': a whole row is lit; 'items': one item of the row `row` is lit. */
  level: 'rows' | 'items';
  row: number;
  item: number;
  /** Complete turns made at this level. */
  turns: number;
  /** Automatic scanning stopped after its turns: nothing is lit until the switch is pressed. */
  waiting: boolean;
}

/** The groups really scanned: the rows that hold something, or a single row of every item. */
export function scanGroups(rows: string[][], pattern: ScanPattern): string[][] {
  const full = rows.filter((r) => r.length > 0);
  if (pattern === 'cards') {
    const all = full.flat();
    return all.length ? [all] : [];
  }
  return full;
}

/** With one group only, there is no row to choose first. */
const rowLevel = (groups: string[][]) => groups.length > 1;

/** The first step: the first row (or the first item when there is a single row). */
export function startScan(groups: string[][]): ScanState {
  return { level: rowLevel(groups) ? 'rows' : 'items', row: 0, item: 0, turns: 0, waiting: false };
}

/** What is lit now: a whole row, one item, or nothing (waiting). */
export function litIds(s: ScanState, groups: string[][]): string[] {
  if (s.waiting) return [];
  const row = groups[s.row];
  if (!row) return [];
  if (s.level === 'rows') return row;
  return row[s.item] !== undefined ? [row[s.item]] : [];
}

/** The item whose word is said for auditory scanning: the lit item, or the first one of a lit row. */
export function spokenId(s: ScanState, groups: string[][]): string | undefined {
  return litIds(s, groups)[0];
}

/** The highlight moves on by one step (the timer in automatic scanning, the "next" switch in step scanning). */
export function nextStep(s: ScanState, groups: string[][], rules: ScanRules): ScanState {
  if (s.waiting || !groups.length) return s;
  const stopAfter = Math.max(1, Math.round(rules.loops));
  if (s.level === 'rows') {
    if (s.row + 1 < groups.length) return { ...s, row: s.row + 1 };
    const turns = s.turns + 1;
    if (rules.mode === 'auto' && turns >= stopAfter) return { ...startScan(groups), waiting: true };
    return { ...s, row: 0, turns };
  }
  const items = groups[s.row] ?? [];
  if (s.item + 1 < items.length) return { ...s, item: s.item + 1 };
  const turns = s.turns + 1;
  if (rowLevel(groups)) {
    // Nothing chosen in this row: back to the rows, this row lit again (step scanning: after one pass).
    if (rules.mode === 'step' || turns >= stopAfter) return { level: 'rows', row: s.row, item: 0, turns: 0, waiting: false };
    return { ...s, item: 0, turns };
  }
  if (rules.mode === 'auto' && turns >= stopAfter) return { ...startScan(groups), waiting: true };
  return { ...s, item: 0, turns };
}

/**
 * The "choose" switch: enters the lit row (a row of one item chooses it at once), or chooses the
 * lit item; then the scan starts again from the top. While waiting, it only starts the scan again.
 */
export function chooseStep(s: ScanState, groups: string[][]): { state: ScanState; chosen?: string } {
  if (!groups.length) return { state: s };
  if (s.waiting) return { state: startScan(groups) };
  const row = groups[s.row] ?? [];
  if (s.level === 'rows') {
    if (row.length === 1) return { state: startScan(groups), chosen: row[0] };
    return { state: { level: 'items', row: s.row, item: 0, turns: 0, waiting: false } };
  }
  return { state: startScan(groups), chosen: row[s.item] };
}

export type SwitchAction = 'next' | 'choose';

/**
 * What a key does. Most switch interfaces type Space and Enter (some 1 and 2): automatic
 * scanning chooses with any of them; step scanning moves with Space (or 1, or an arrow) and
 * chooses with Enter (or 2).
 */
export function keyAction(key: string, mode: ScanMode): SwitchAction | null {
  const first = key === ' ' || key === 'Spacebar' || key === '1';
  const second = key === 'Enter' || key === '2';
  if (mode === 'auto') return first || second ? 'choose' : null;
  if (first || key === 'ArrowRight' || key === 'ArrowDown') return 'next';
  return second ? 'choose' : null;
}

/**
 * "The whole screen is the switch": a touch anywhere chooses (automatic scanning). Step scanning
 * needs two switches: the left half of the screen moves, the right half chooses (boards are never
 * mirrored, nor is this).
 */
export function screenAction(x: number, width: number, mode: ScanMode): SwitchAction {
  if (mode !== 'step') return 'choose';
  return x < width / 2 ? 'next' : 'choose';
}

/** A card of the board in the scan: `c:` and its index in the board. */
export const cardId = (index: number) => `c:${index}`;
export const cardIndex = (id: string): number | null => (id.startsWith('c:') ? Number(id.slice(2)) : null);

/** A drawn card: its index in the board and its place on screen (slot, row-major). */
export interface PlacedCard {
  index: number;
  slot: number;
}

/** The board's rows as the scan goes through them: by row on screen, left to right. */
export function boardRows(cards: PlacedCard[], cols: number): string[][] {
  const byRow = new Map<number, PlacedCard[]>();
  for (const c of cards) {
    const r = Math.floor(c.slot / cols);
    byRow.set(r, [...(byRow.get(r) ?? []), c]);
  }
  return [...byRow.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, list]) => list.sort((a, b) => a.slot - b.slot).map((c) => cardId(c.index)));
}
