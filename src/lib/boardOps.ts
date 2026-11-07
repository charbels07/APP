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
