import { createDefaultProfile } from '../data/defaults';
import { compactPlaces } from '../lib/boardOps';
import type { Board } from '../model/types';

/** The words drawn on screen, column by column, top to bottom. */
function columns(board: Board, places: Map<number, number>): string[][] {
  const cols: string[][] = Array.from({ length: board.cols }, () => []);
  [...places.entries()]
    .sort((a, b) => a[1] - b[1])
    .forEach(([index, slot]) => cols[slot % board.cols].push(board.cells[index]!.concept));
  return cols;
}

describe('part of the words shown: the main board without holes', () => {
  const core = createDefaultProfile().boards.core;

  it('each word slides up in its own column: no hole above any word, the order of the complete board is kept', () => {
    for (const level of [1, 2]) {
      const places = compactPlaces(core, level, undefined)!;
      expect(places).not.toBeNull();
      const shown = core.cells.map((c, i) => (c && (c.level ?? 1) <= level ? i : -1)).filter((i) => i >= 0);
      // Every shown word is drawn once, no hidden word is drawn.
      expect([...places.keys()].sort((a, b) => a - b)).toEqual(shown);
      expect(new Set(places.values()).size).toBe(shown.length);
      for (let c = 0; c < core.cols; c++) {
        const inColumn = shown.filter((i) => i % core.cols === c);
        // Same column as on the complete board, rows 0, 1, 2… from the top, in the same order.
        expect(inColumn.map((i) => places.get(i))).toEqual(inColumn.map((_, row) => row * core.cols + c));
      }
    }
  });

  it('the first words: I and you on top of the first column, as on the complete board', () => {
    const places = compactPlaces(core, 1, undefined)!;
    const cols = columns(core, places);
    expect(cols[0].slice(0, 2)).toEqual(['i', 'you']);
    // No drawn word sits lower than the number of words in its column.
    places.forEach((slot) => expect(Math.floor(slot / core.cols)).toBeLessThan(core.rows));
  });

  it('nothing moves when every word is shown, when the family keeps the final places, or on other boards', () => {
    const p = createDefaultProfile();
    expect(compactPlaces(core, 3, undefined)).toBeNull();
    expect(compactPlaces(core, 1, 'final')).toBeNull();
    const tla = Object.values(p.boards).find((b) => b.kind === 'tla')!;
    expect(compactPlaces(tla, 1, 'compact')).toBeNull();
  });

  it('a shown card spread over several slots keeps every card in place', () => {
    const board: Board = JSON.parse(JSON.stringify(core));
    const first = board.cells.findIndex((c) => c && (c.level ?? 1) === 1);
    board.cells[first]!.span = [2, 1];
    expect(compactPlaces(board, 1, undefined)).toBeNull();
  });

  it('the stored places are never changed', () => {
    const before = JSON.stringify(core);
    compactPlaces(core, 1, undefined);
    compactPlaces(core, 2, 'compact');
    expect(JSON.stringify(core)).toBe(before);
  });
});
