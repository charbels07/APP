/**
 * The board's own bin: a word or an activity board deleted by mistake can be put back for 30 days
 * (Settings → Board → Words and pictures → "Deleted words and boards"). It travels with the profile
 * (every device of the child has it) but is not part of the change history: putting back is the undo.
 * The whole board's earlier versions are kept by the server (src/ui/settings/Backups.tsx).
 */
import type { BinItem, Board, Profile } from '../model/types';

export const BIN_DAYS = 30;
const MAX_ITEMS = 100;
const DAY = 86_400_000;

const newId = () => `bin${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/** Drops what is older than 30 days, and the oldest beyond 100 items. */
function tidy(d: Profile, now = Date.now()) {
  d.bin = (d.bin ?? []).filter((b) => now - b.at < BIN_DAYS * DAY).slice(-MAX_ITEMS);
  if (!d.bin.length) delete d.bin;
}

/** Keeps the words of these places before they are emptied (called by removeCells). */
export function binCells(d: Profile, boardId: string, indexes: number[], now = Date.now()) {
  const b = d.boards[boardId];
  if (!b) return;
  const items: BinItem[] = [];
  for (const index of indexes) {
    const cell = b.cells[index];
    if (cell) items.push({ id: newId(), at: now, kind: 'cell', board: boardId, index, cell: structuredClone(cell) });
  }
  if (!items.length) return;
  d.bin = [...(d.bin ?? []), ...items];
  tidy(d, now);
}

/** Keeps an activity board before it is deleted (with its place in the list). */
export function binBoard(d: Profile, boardId: string, now = Date.now()) {
  const b = d.boards[boardId];
  if (!b) return;
  d.bin = [...(d.bin ?? []), { id: newId(), at: now, kind: 'board', board: structuredClone(b), tlaIndex: Math.max(0, d.tlaOrder.indexOf(boardId)) }];
  tidy(d, now);
}

/** What can be put back, newest first. */
export function binItems(d: Profile, now = Date.now()): BinItem[] {
  return (d.bin ?? []).filter((b) => now - b.at < BIN_DAYS * DAY).sort((a, b) => b.at - a.at);
}

export type TakeBack = 'back' | 'moved' | 'full' | 'missing';

/**
 * Puts an item back: a word in its own place when it is still empty (never moving another word:
 * positions are the child's motor plan), otherwise in the first empty place of its board; an
 * activity board where it was in the list.
 */
export function takeBack(d: Profile, id: string): TakeBack {
  const item = (d.bin ?? []).find((b) => b.id === id);
  if (!item) return 'missing';
  let out: TakeBack;
  if (item.kind === 'cell') {
    const b = d.boards[item.board];
    if (!b) return 'missing';
    // A word that spread over several places keeps one place when it comes back.
    const cell = { ...item.cell };
    delete cell.span;
    if (!b.cells[item.index]) {
      b.cells[item.index] = cell;
      out = 'back';
    } else {
      const free = b.cells.findIndex((c) => !c);
      if (free < 0) return 'full';
      b.cells[free] = cell;
      out = 'moved';
    }
  } else {
    let boardId = item.board.id;
    if (d.boards[boardId]) boardId = `${boardId}-${Date.now().toString(36)}`;
    const board: Board = { ...structuredClone(item.board), id: boardId };
    d.boards[boardId] = board;
    const order = d.tlaOrder.filter((x) => x !== boardId);
    order.splice(Math.min(item.tlaIndex, order.length), 0, boardId);
    d.tlaOrder = order;
    out = 'back';
  }
  d.bin = (d.bin ?? []).filter((b) => b.id !== id);
  if (!d.bin.length) delete d.bin;
  return out;
}
