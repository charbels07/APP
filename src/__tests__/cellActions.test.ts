import { createDefaultProfile } from '../data/defaults';
import {
  addFavourite,
  duplicateCell,
  duplicateTla,
  emptySlots,
  importTla,
  moveCellsTo,
  parseTlaFile,
  placeCells,
  removeCells,
  resizeCells,
  tlaFile,
} from '../lib/cellActions';
import { label } from '../lib/lexicon';

describe('caregiver card actions', () => {
  it('duplicates a card into the next empty slot of the same board', () => {
    const p = createDefaultProfile();
    const b = p.boards.tla_meal;
    b.cells[b.cells.length - 1] = null;
    b.cells[3] = null;
    const free = emptySlots(b);
    const src = b.cells.findIndex((c, i) => i > 3 && c?.concept && !['i', 'want'].includes(c.concept));
    const at = duplicateCell(p, 'tla_meal', src);
    expect(at).toBe(b.cells.length - 1); // the next empty slot after the card, not the first one
    expect(p.boards.tla_meal.cells[at]?.concept).toBe(b.cells[src]?.concept);
    expect(emptySlots(p.boards.tla_meal)).toHaveLength(free.length - 1);
    expect(duplicateCell(p, 'tla_meal', src)).toBe(3);
    // Full: an activity board grows by one row (up to 8 rows); the main board never does.
    const rows = p.boards.tla_meal.rows;
    expect(duplicateCell(p, 'tla_meal', src)).toBe(rows * p.boards.tla_meal.cols);
    expect(p.boards.tla_meal.rows).toBe(rows + 1);
    const core = p.boards.core;
    for (let i = 0; i < core.cells.length; i++) if (!core.cells[i]) core.cells[i] = { concept: 'ball' };
    expect(duplicateCell(p, 'core', 0)).toBe(-1);
    expect(core.rows).toBe(createDefaultProfile().boards.core.rows);
  });

  it('adds a word to "my words" once, and says when it is already there', () => {
    const p = createDefaultProfile();
    expect(addFavourite(p, 'pizza')).toBe('added');
    expect(addFavourite(p, 'pizza')).toBe('already');
    expect(p.boards.mine.cells.filter((c) => c?.concept === 'pizza')).toHaveLength(1);
  });

  it('pastes copies into empty slots only, and resizes or deletes several cards', () => {
    const p = createDefaultProfile();
    const n = placeCells(p, 'mine', [{ concept: 'ball', span: [2, 2] }, { concept: 'book' }]);
    expect(n).toBe(2);
    const idx = p.boards.mine.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    expect(p.boards.mine.cells[idx[0]]).toEqual({ concept: 'ball' }); // no spreading over other slots
    resizeCells(p, 'mine', idx, 0.8);
    expect(p.boards.mine.cells[idx[1]]?.size).toBe(0.8);
    resizeCells(p, 'mine', idx, 1);
    expect(p.boards.mine.cells[idx[1]]?.size).toBeUndefined();
    removeCells(p, 'mine', idx);
    expect(p.boards.mine.cells.every((c) => c === null)).toBe(true);
  });

  it('moves cards between activity boards, but only copies from the main board (motor plan)', () => {
    const p = createDefaultProfile();
    const park = p.boards.tla_park.cells.map((c, i) => (c && c.concept !== 'i' && c.concept !== 'want' ? i : -1)).filter((i) => i >= 0).slice(-1);
    // Make room in the meal board first.
    const meal = p.boards.tla_meal;
    const freeBefore = emptySlots(meal).length;
    if (!freeBefore) meal.cells[meal.cells.length - 1] = null;
    const concept = p.boards.tla_park.cells[park[0]]!.concept;
    expect(moveCellsTo(p, 'tla_park', park, 'tla_meal')).toBe(1);
    expect(p.boards.tla_park.cells[park[0]]).toBeNull();
    expect(p.boards.tla_meal.cells.some((c) => c?.concept === concept)).toBe(true);

    const core = p.boards.core.cells.findIndex((c) => c?.concept === 'eat');
    const q = createDefaultProfile();
    q.boards.tla_meal.cells[q.boards.tla_meal.cells.length - 1] = null;
    expect(moveCellsTo(q, 'core', [core], 'tla_meal')).toBe(1);
    expect(q.boards.core.cells[core]?.concept).toBe('eat');
  });

  it('duplicates an activity board with its own title, right after the original', () => {
    const p = createDefaultProfile();
    const id = duplicateTla(p, 'tla_meal', 'x1')!;
    expect(id).toBe('tla_meal_cx1');
    expect(p.tlaOrder[p.tlaOrder.indexOf('tla_meal') + 1]).toBe(id);
    expect(label(p, p.boards[id].concept, 'fr')).toBe('repas 2');
    expect(p.boards[id].cells).toEqual(p.boards.tla_meal.cells);
  });

  it('shares an activity board as a file and imports it elsewhere', () => {
    const a = createDefaultProfile();
    a.customConcepts.c_tabbouleh = { id: 'c_tabbouleh', cls: 'noun', labels: { fr: 'taboulé', en: 'tabbouleh', ar: 'تبولة' }, emoji: '🥗', custom: true };
    a.boards.tla_meal.cells[a.boards.tla_meal.cells.length - 1] = { concept: 'c_tabbouleh' };
    const text = JSON.stringify(tlaFile(a, 'tla_meal', 'repas'));
    expect(parseTlaFile('{"nope":1}')).toBeNull();
    const f = parseTlaFile(text)!;
    expect(f.data.customConcepts.c_tabbouleh).toBeDefined();
    const b = createDefaultProfile();
    const { profile, id } = importTla(b, f.data);
    expect(id).not.toBe('tla_meal'); // the child already has one: a new id
    expect(profile.boards[id!].cells.some((c) => c?.concept === 'c_tabbouleh')).toBe(true);
    expect(profile.customConcepts.c_tabbouleh.labels.ar).toBe('تبولة');
  });
});
