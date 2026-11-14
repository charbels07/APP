/** Pure board operations used by caregiver mode (move, spread a card over empty slots). */
import type { Board } from '../model/types';

/** Map of slot index → index of the card that covers it (spread cards only). */
export function coveredSlots(board: Board): Map<number, number> {
  const covered = new Map<number, number>();
  board.cells.forEach((cell, index) => {
    const [w, h] = cell?.span ?? [1, 1];
    if (w === 1 && h === 1) return;
    const r0 = Math.floor(index / board.cols);
    const c0 = index % board.cols;
    for (let r = r0; r < r0 + h; r++)
      for (let c = c0; c < c0 + w; c++) if (r !== r0 || c !== c0) covered.set(r * board.cols + c, index);
  });
  return covered;
}

/** A card can spread if the slots it would cover exist and are empty (and not covered by another card). */
export function canSpan(board: Board, index: number, span: [number, number]): boolean {
  const r0 = Math.floor(index / board.cols);
  const c0 = index % board.cols;
  if (c0 + span[0] > board.cols || r0 + span[1] > board.rows) return false;
  const covered = coveredSlots(board);
  for (let r = r0; r < r0 + span[1]; r++)
    for (let c = c0; c < c0 + span[0]; c++) {
      const i = r * board.cols + c;
      if (i === index) continue;
      if (board.cells[i]) return false;
      const owner = covered.get(i);
      if (owner !== undefined && owner !== index) return false;
    }
  return true;
}

/**
 * Moves the card at `from` to `to`; if `to` holds a card, the two swap.
 * A spread card that no longer fits goes back to a single slot.
 */
export function moveCell(board: Board, from: number, to: number): void {
  if (from === to) return;
  const a = board.cells[from];
  const b = board.cells[to];
  board.cells[to] = a;
  board.cells[from] = b;
  for (const i of [to, from]) {
    const cell = board.cells[i];
    if (cell?.span) {
      const span = cell.span;
      delete cell.span;
      if (canSpan(board, i, span)) cell.span = span;
    }
  }
}

/**
 * Where the cards of the main board are drawn while only part of its words is shown
 * (levels 1 and 2). Each word keeps its own column and slides up until no hole is left above
 * it, so the words of a kind stay together, in the order of the complete board.
 *
 * Stored places never change (they are the child's final motor plan): this is only the picture
 * on screen, used outside caregiver mode and for printing.
 *
 * Returns card index → slot where it is drawn, or `null` when every card stays where it is:
 * another kind of board, every word shown, the family chose "final places", or a shown card is
 * spread over several slots (its neighbours could not slide around it).
 */
export function compactPlaces(board: Board, level: number, places: 'compact' | 'final' | undefined): Map<number, number> | null {
  if (board.kind !== 'core' || places === 'final') return null;
  const shown = (i: number) => !!board.cells[i] && (board.cells[i]!.level ?? 1) <= level;
  let hiddenCards = false;
  for (let i = 0; i < board.cells.length; i++) {
    const cell = board.cells[i];
    if (!cell) continue;
    if (!shown(i)) hiddenCards = true;
    else if (cell.span && (cell.span[0] !== 1 || cell.span[1] !== 1)) return null;
  }
  if (!hiddenCards) return null;
  const at = new Map<number, number>();
  for (let c = 0; c < board.cols; c++) {
    let row = 0;
    for (let r = 0; r < board.rows; r++) {
      const i = r * board.cols + c;
      if (shown(i)) at.set(i, row++ * board.cols + c);
    }
  }
  return at;
}
