/** The board's bin: deleted words and activity boards come back without moving anything else. */
import { createDefaultProfile } from '../data/defaults';
import { removeCells } from '../lib/cellActions';
import { BIN_DAYS, binBoard, binItems, takeBack } from '../lib/wordBin';

const firstFilled = (cells: (unknown | null)[]) => cells.findIndex(Boolean);

describe('the board\'s bin', () => {
  it('a deleted word comes back to its own place', () => {
    const d = createDefaultProfile();
    const core = d.boards.core;
    const i = firstFilled(core.cells);
    const word = core.cells[i];
    removeCells(d, 'core', [i]);
    expect(core.cells[i]).toBeNull();
    const [item] = binItems(d);
    expect(item).toMatchObject({ kind: 'cell', board: 'core', index: i });
    expect(takeBack(d, item.id)).toBe('back');
    expect(core.cells[i]).toEqual(word);
    expect(d.bin).toBeUndefined();
  });

  it('when its place was taken meanwhile, it goes to the first empty place; nothing else moves', () => {
    const d = createDefaultProfile();
    const core = d.boards.core;
    const i = firstFilled(core.cells);
    const word = core.cells[i]!;
    removeCells(d, 'core', [i]);
    core.cells[i] = { concept: 'something-new' };
    const before = JSON.stringify(core.cells);
    const free = core.cells.findIndex((c) => !c);
    expect(takeBack(d, binItems(d)[0].id)).toBe(free >= 0 ? 'moved' : 'full');
    if (free >= 0) {
      expect(core.cells[free]?.concept).toBe(word.concept);
      const after = JSON.parse(JSON.stringify(core.cells));
      after[free] = null;
      expect(JSON.stringify(after)).toBe(before);
    }
  });

  it('a full board refuses, and the word stays in the bin', () => {
    const d = createDefaultProfile();
    const core = d.boards.core;
    const i = firstFilled(core.cells);
    removeCells(d, 'core', [i]);
    core.cells = core.cells.map((c) => c ?? { concept: 'filler' });
    expect(takeBack(d, binItems(d)[0].id)).toBe('full');
    expect(binItems(d)).toHaveLength(1);
  });

  it('a deleted activity board comes back at its place in the list', () => {
    const d = createDefaultProfile();
    const id = d.tlaOrder[1] ?? d.tlaOrder[0];
    if (!id) return;
    const pos = d.tlaOrder.indexOf(id);
    const board = structuredClone(d.boards[id]);
    binBoard(d, id);
    d.tlaOrder = d.tlaOrder.filter((x) => x !== id);
    delete d.boards[id];
    expect(takeBack(d, binItems(d)[0].id)).toBe('back');
    expect(d.boards[id]).toEqual(board);
    expect(d.tlaOrder.indexOf(id)).toBe(pos);
  });

  it('keeps 30 days', () => {
    const d = createDefaultProfile();
    removeCells(d, 'core', [firstFilled(d.boards.core.cells)]);
    const later = Date.now() + (BIN_DAYS + 1) * 86_400_000;
    expect(binItems(d, later)).toHaveLength(0);
  });
});
