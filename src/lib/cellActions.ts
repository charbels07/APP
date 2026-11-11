/**
 * Card actions of the caregiver mode (double-tap menu, multi-selection): duplicate, add to
 * "my words" (favourites), copy / paste, resize, move to another activity board, delete,
 * duplicate an activity board, and the activity-board file used to share one.
 * All functions change a draft profile (inside app.update) and never move cards of the main board
 * elsewhere: its positions are the child's motor plan (cards are copied from it, not taken away).
 */
import type { ResourceData } from '../backend/types';
import type { Board, Cell, Profile } from '../model/types';
import { coveredSlots } from './boardOps';
import { getConcept, symbolOf } from './lexicon';
import { resourceToOps, withConcepts } from './resources';
import { applyOps } from './profileDiff';

/** Board of the "my words" folder (favourites). */
export const FAVOURITES_BOARD = 'mine';

/** Empty slots of a board, in reading order, starting after `after` when given. */
export function emptySlots(board: Board, after = -1): number[] {
  const covered = coveredSlots(board);
  const all = board.cells.map((c, i) => (c || covered.has(i) ? -1 : i)).filter((i) => i >= 0);
  return [...all.filter((i) => i > after), ...all.filter((i) => i <= after)];
}

/** A copy that fits one slot (no spreading over others), at the main board's first level. */
function placeable(c: Cell, target: Board): Cell {
  const { span: _span, level: _level, ...rest } = structuredClone(c);
  return target.kind === 'core' ? { ...rest, level: 1 } : rest;
}

/** Most rows an activity board or a folder grows to when cards are added to it. */
export const MAX_ROWS = 8;

/** Activity boards and folders get an extra row when full (never the main board: motor plan). */
function makeRoom(b: Board, needed: number) {
  if (b.kind === 'core') return;
  while (emptySlots(b).length < needed && b.rows < MAX_ROWS) {
    b.rows += 1;
    b.cells.push(...Array.from({ length: b.cols }, () => null));
  }
}

/** Puts copies of the cards in the board's empty slots (adding rows if needed); returns how many fitted. */
export function placeCells(d: Profile, boardId: string, cells: Cell[], after = -1): number {
  const b = d.boards[boardId];
  if (!b) return 0;
  makeRoom(b, cells.length);
  const free = emptySlots(b, after);
  let n = 0;
  for (const c of cells) {
    const i = free[n];
    if (i === undefined) break;
    b.cells[i] = placeable(c, b);
    n++;
  }
  return n;
}

/** A copy of the card in the next empty slot of the same board (-1 if the board is full). */
export function duplicateCell(d: Profile, boardId: string, index: number): number {
  const b = d.boards[boardId];
  const c = b?.cells[index];
  if (!b || !c) return -1;
  makeRoom(b, 1);
  const i = emptySlots(b, index)[0];
  if (i === undefined) return -1;
  b.cells[i] = placeable(c, b);
  return i;
}

export type FavouriteResult = 'added' | 'already' | 'full' | 'missing';

/** Adds the word to the "my words" folder. */
export function addFavourite(d: Profile, concept: string): FavouriteResult {
  const b = d.boards[FAVOURITES_BOARD];
  if (!b) return 'missing';
  if (b.cells.some((c) => c?.concept === concept)) return 'already';
  return placeCells(d, FAVOURITES_BOARD, [{ concept }]) ? 'added' : 'full';
}

export function removeCells(d: Profile, boardId: string, indexes: number[]) {
  const b = d.boards[boardId];
  if (!b) return;
  for (const i of indexes) b.cells[i] = null;
}

/** Card size (1 = 100 %). */
export function resizeCells(d: Profile, boardId: string, indexes: number[], size: number) {
  const b = d.boards[boardId];
  if (!b) return;
  for (const i of indexes) {
    const c = b.cells[i];
    if (!c) continue;
    if (size === 1) delete c.size;
    else c.size = size;
  }
}

/**
 * Sends the cards to another board's empty slots. They leave their board, except the main board
 * (motor plan), where they stay and are copied. Returns how many were placed.
 */
export function moveCellsTo(d: Profile, from: string, indexes: number[], to: string): number {
  const src = d.boards[from];
  if (!src || !d.boards[to] || from === to) return 0;
  const cells = indexes.map((i) => src.cells[i]).filter((c): c is Cell => !!c);
  const n = placeCells(d, to, cells);
  if (src.kind !== 'core') removeCells(d, from, indexes.filter((i) => src.cells[i]).slice(0, n));
  return n;
}

/** A copy of an activity board, with its own title word ("Repas 2"), placed after the original. */
export function duplicateTla(d: Profile, id: string, suffix = Date.now().toString(36)): string | null {
  const b = d.boards[id];
  if (!b) return null;
  const newId = `${id.split('_c')[0]}_c${suffix}`;
  const title = getConcept(d, b.concept);
  const conceptId = `${b.concept.split('_c')[0]}_c${suffix}`;
  if (title) {
    const labels = { ...title.labels };
    for (const l of Object.keys(labels) as (keyof typeof labels)[]) {
      labels[l] = `${d.overrides[b.concept]?.labels?.[l] ?? labels[l]} 2`;
    }
    d.customConcepts[conceptId] = { id: conceptId, cls: title.cls, labels, emoji: title.emoji, custom: true };
    d.overrides[conceptId] = { symbol: symbolOf(d, b.concept) };
  }
  d.boards[newId] = { ...structuredClone(b), id: newId, concept: title ? conceptId : b.concept };
  const at = d.tlaOrder.indexOf(id);
  d.tlaOrder.splice(at < 0 ? d.tlaOrder.length : at + 1, 0, newId);
  return newId;
}

// ── Sharing an activity board as a file ──

export interface TlaFile {
  format: 'caa-tla';
  version: 1;
  title: string;
  data: ResourceData;
}

export function tlaData(p: Profile, id: string): ResourceData | null {
  const b = p.boards[id];
  if (!b) return null;
  return withConcepts({ boards: [structuredClone(b)], schedules: [], customConcepts: {}, overrides: {} }, p);
}

export function tlaFile(p: Profile, id: string, title: string): TlaFile | null {
  const data = tlaData(p, id);
  return data && { format: 'caa-tla', version: 1, title, data };
}

export function parseTlaFile(text: string): TlaFile | null {
  try {
    const f = JSON.parse(text);
    if (f?.format !== 'caa-tla' || !Array.isArray(f?.data?.boards) || !f.data.boards.length) return null;
    const b = f.data.boards[0];
    if (typeof b?.id !== 'string' || !Array.isArray(b.cells) || typeof b.rows !== 'number' || typeof b.cols !== 'number') return null;
    return { format: 'caa-tla', version: 1, title: String(f.title ?? ''), data: { schedules: [], customConcepts: {}, overrides: {}, ...f.data } };
  } catch {
    return null;
  }
}

/** Adds a shared activity board to the profile (nothing already there is replaced); returns its id. */
export function importTla(p: Profile, data: ResourceData): { profile: Profile; id: string | null } {
  const ops = resourceToOps(p, 'tla', data);
  const next = applyOps(p, ops).profile;
  const added = next.tlaOrder.filter((x) => !p.tlaOrder.includes(x));
  return { profile: next, id: added[0] ?? null };
}
