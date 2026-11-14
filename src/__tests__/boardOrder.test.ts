/**
 * An activity board orders its words like the child's main board: same kinds together, in the
 * order of the main board's columns; inside a kind, the order the words have there.
 */
import { createDefaultProfile, TLA_CORE, TLA_FUNCTIONS } from '../data/defaults';
import { arrangeTla, mainBoardOrder, tlaLayout } from '../lib/boardOrder';
import type { Cell, Profile } from '../model/types';

const names = (cells: (Cell | null)[]) => cells.map((c) => (c ? c.concept : '-'));

describe('the order of the main board', () => {
  const profile = createDefaultProfile();

  it('kinds follow the main board from left to right, then the folders', () => {
    expect(mainBoardOrder(profile).kinds).toEqual(['pronoun', 'verb', 'little', 'negation', 'descriptor', 'question', 'social', 'people', 'noun']);
  });

  it('words given in any order come back in the main board’s order', () => {
    const { sortConcepts } = mainBoardOrder(profile);
    // things, a describing word, actions, a person, a social word: mixed up
    expect(sortConcepts(['juice', 'hot', 'drink', 'bread', 'dentist', 'eat', 'thanks', 'cold', 'water', 'want'])).toEqual([
      'want', 'eat', 'drink', // actions, as they come on the main board (column by column)
      'hot', 'cold', // describing words
      'thanks', // social
      'dentist', // people
      'bread', 'water', 'juice', // things: the food folder comes before the drinks folder
    ]);
    // an action kept in a folder still goes with the actions
    expect(sortConcepts(['ball', 'sing', 'play'])).toEqual(['play', 'sing', 'ball']);
  });

  it('a new word goes after the known words of its kind, in the order it was given', () => {
    const { sort } = mainBoardOrder(profile);
    const items = [
      { name: 'drill', cls: 'noun' as const },
      { name: 'open (known)', concept: 'open', cls: 'verb' as const },
      { name: 'rinse', cls: 'verb' as const },
      { name: 'teeth (known)', concept: 'teeth', cls: 'noun' as const },
      { name: 'spit', cls: 'verb' as const },
      { name: 'clean', cls: 'descriptor' as const },
    ];
    expect(sort(items, (x) => x).map((x) => x.name)).toEqual(['open (known)', 'rinse', 'spit', 'clean', 'teeth (known)', 'drill']);
  });

  it('follows the child’s own main board, not the starter one', () => {
    const mine: Profile = JSON.parse(JSON.stringify(profile));
    const core = mine.boards.core;
    // the family swapped two columns of actions: "eat, drink…" now comes before "want, go…"
    for (let r = 0; r < core.rows; r++) {
      const a = r * core.cols + 1;
      const b = r * core.cols + 3;
      [core.cells[a], core.cells[b]] = [core.cells[b], core.cells[a]];
    }
    expect(mainBoardOrder(profile).sortConcepts(['eat', 'want', 'big'])).toEqual(['want', 'eat', 'big']);
    expect(mainBoardOrder(mine).sortConcepts(['eat', 'want', 'big'])).toEqual(['eat', 'want', 'big']);
  });
});

describe('a new activity board', () => {
  it('keeps the core block on the left and the communication words first, then the topic words', () => {
    const { rows, cols, cells } = tlaLayout(['eat', 'hot', 'bread']);
    expect([rows, cols]).toEqual([5, 6]);
    expect(names(cells).slice(0, 12)).toEqual([...TLA_CORE[0], ...TLA_FUNCTIONS, ...TLA_CORE[1], 'eat', 'hot', 'bread', '-']);
  });
  it('does not repeat a word of the fixed part, and grows with the words', () => {
    const many = Array.from({ length: 20 }, (_, i) => `w${i}`);
    const { rows, cells } = tlaLayout(['want', 'where', 'eat', 'eat', ...many]);
    expect(rows).toBe(7);
    const all = names(cells).filter((x) => x !== '-');
    expect(all.filter((x) => x === 'want')).toHaveLength(1);
    expect(all.filter((x) => x === 'where')).toHaveLength(1);
    expect(all.filter((x) => x === 'eat')).toHaveLength(1);
  });
});

describe('arranging a board already made', () => {
  const profile = createDefaultProfile();
  it('puts the topic words in the main board’s order without touching the fixed words or the empty places', () => {
    const made = tlaLayout(['juice', 'hot', 'drink', 'bread', 'eat', 'cold']);
    const board = { id: 't', kind: 'tla' as const, concept: 't_meal', rows: made.rows, cols: made.cols, cells: made.cells };
    board.cells[11] = { ...(board.cells[11] as Cell), size: 0.8 }; // "bread", made smaller by the family
    const cells = arrangeTla(profile, board)!;
    // first line and the two left columns: as they were
    expect(names(cells).slice(0, 6)).toEqual(names(board.cells).slice(0, 6));
    for (let r = 0; r < board.rows; r++) expect(names(cells).slice(r * 6, r * 6 + 2)).toEqual(names(board.cells).slice(r * 6, r * 6 + 2));
    expect(names(cells).slice(8, 12)).toEqual(['eat', 'drink', 'hot', 'cold']);
    expect(names(cells).slice(14, 16)).toEqual(['bread', 'juice']);
    expect(cells.find((c) => c?.concept === 'bread')).toMatchObject({ size: 0.8 });
    expect(cells.filter(Boolean)).toHaveLength(board.cells.filter(Boolean).length);
    // already in order: nothing to do
    expect(arrangeTla(profile, { ...board, cells })).toBeNull();
  });
  it('leaves folders and cards spread over several places where they are', () => {
    const board = profile.boards.tla_meal;
    const withSpan = { ...board, cells: board.cells.map((c, i) => (i === 2 ? { ...(c as Cell), span: [2, 1] as [number, number] } : c)) };
    const cells = arrangeTla(profile, withSpan) ?? withSpan.cells;
    expect(cells[2]).toBe(withSpan.cells[2]);
    expect(names(cells).filter((x) => x !== '-').sort()).toEqual(names(board.cells).filter((x) => x !== '-').sort());
  });
});
