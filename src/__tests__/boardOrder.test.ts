/**
 * An activity board orders its words like the child's main board: same kinds together, in the
 * order of the main board's columns; inside a kind, the order the words have there.
 */
import { createDefaultProfile } from '../data/defaults';
import { SITUATION_KIND_WORDS, situationWordKind } from '../data/situationKinds';
import { SITUATIONS } from '../data/situations';
import { arrangeTla, mainBoardOrder, tlaLayout } from '../lib/boardOrder';
import { getConcept } from '../lib/lexicon';
import type { Cell, Profile } from '../model/types';


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

/** The words of each column, top to bottom. */
const columns = (b: { rows: number; cols: number; cells: (Cell | null)[] }) =>
  Array.from({ length: b.cols }, (_, c) => Array.from({ length: b.rows }, (_, r) => b.cells[r * b.cols + c]?.concept).filter(Boolean) as string[]);
const kindsOf = (profile: Profile, words: string[]) => [...new Set(words.map((w) => getConcept(profile, w)?.cls))];

describe('a new activity board is laid out in columns, like the main board', () => {
  const profile = createDefaultProfile();
  const board = tlaLayout(profile, ['juice', 'hot', 'drink', 'bread', 'eat', 'cold', 'dentist', 'water']);
  const cols = columns(board);

  it('each column holds one kind of word (the little words and "not" share theirs, people come with the things)', () => {
    expect(board.rows).toBe(5);
    for (const col of cols) {
      const kinds = kindsOf(profile, col).map((k) => (k === 'negation' ? 'little' : k === 'people' ? 'noun' : k));
      expect([...new Set(kinds)]).toHaveLength(1);
    }
  });
  it('the kinds go from left to right as on the main board', () => {
    expect(cols.map((col) => getConcept(profile, col[0])?.cls)).toEqual(['pronoun', 'verb', 'little', 'descriptor', 'question', 'social', 'people', 'noun'].filter((k) => cols.some((c) => getConcept(profile, c[0])?.cls === k)));
    expect(cols[0]).toEqual(['i', 'you']);
    // the words every board carries come first in their column, then the topic words in the main board's order
    expect(cols[1]).toEqual(['want', 'like', 'eat', 'drink']);
    expect(cols[2]).toEqual(['more', 'not', 'stop']);
    expect(cols[3]).toEqual(['hot', 'cold']);
    expect(cols[4]).toEqual(['what', 'where']);
    expect(cols[5]).toEqual(['done', 'help_me', 'look_at', 'my_turn', 'i_like_it']);
    expect(cols[6]).toEqual(['dentist', 'bread', 'water', 'juice']);
  });
  it('a kind with many words takes several columns side by side; a word is never repeated', () => {
    const many = tlaLayout(profile, ['eat', 'drink', 'play', 'go', 'open', 'look', 'give', 'want', 'eat']);
    const c = columns(many);
    expect(c[1]).toEqual(['want', 'like', 'go', 'give', 'look']);
    expect(c[2]).toEqual(['eat', 'drink', 'play', 'open']);
    const all = many.cells.filter(Boolean).map((x) => x!.concept);
    expect(all.filter((x) => x === 'want')).toHaveLength(1);
    expect(all.filter((x) => x === 'eat')).toHaveLength(1);
  });
  it('a board with very many words gets more lines rather than too many columns', () => {
    const food = profile.boards.food.cells.filter(Boolean).map((c) => c!.concept);
    const places = profile.boards.places.cells.filter(Boolean).map((c) => c!.concept);
    const big = tlaLayout(profile, [...food, ...places]);
    expect(big.rows).toBeGreaterThan(5);
    expect(big.cols).toBeLessThanOrEqual(12); // never wider than the main board
    expect(big.cells.filter(Boolean)).toHaveLength(new Set([...food, ...places]).size + 14);
  });
  it('the starter activity boards are laid out the same way', () => {
    for (const id of profile.tlaOrder) {
      const b = profile.boards[id];
      expect(b.cells).toHaveLength(b.rows * b.cols);
      expect(columns(b)[0]).toEqual(['i', 'you']);
      for (const col of columns(b)) {
        const kinds = kindsOf(profile, col).map((k) => (k === 'negation' ? 'little' : k === 'people' ? 'noun' : k));
        expect([...new Set(kinds)]).toHaveLength(1);
      }
    }
  });
});

describe('arranging a board already made', () => {
  const profile = createDefaultProfile();
  it('puts every card in its kind’s column and keeps the card’s own settings', () => {
    // a board made the old way: line by line, kinds mixed
    const old = { id: 't', kind: 'tla' as const, concept: 't_meal', rows: 3, cols: 4, cells: ['i', 'want', 'juice', 'hot', 'you', 'like', 'drink', 'bread', 'more', 'not', 'eat', 'cold'].map((concept): Cell | null => ({ concept })) };
    old.cells[7] = { concept: 'bread', size: 0.8 };
    old.cells[2] = { concept: 'juice', span: [2, 1] };
    const next = arrangeTla(profile, old)!;
    const c = columns(next);
    expect(c[0]).toEqual(['i', 'you']);
    expect(c[1]).toEqual(['want', 'like', 'eat', 'drink']);
    expect(c[2]).toEqual(['more', 'not']);
    expect(c[3]).toEqual(['hot', 'cold']);
    expect(c[4]).toEqual(['bread', 'juice']);
    expect(next.cells.find((x) => x?.concept === 'bread')).toMatchObject({ size: 0.8 });
    // a card that was spread over two places goes back to one
    expect(next.cells.find((x) => x?.concept === 'juice')?.span).toBeUndefined();
    expect(next.cells.filter(Boolean)).toHaveLength(12);
    // already in columns: nothing to do
    expect(arrangeTla(profile, { ...old, ...next })).toBeNull();
    for (const id of profile.tlaOrder) expect(arrangeTla(profile, profile.boards[id])).toBeNull();
    // and arranging twice gives the same board (nothing keeps moving)
    const again = arrangeTla(profile, { ...old, ...next, cells: next.cells.slice().reverse() })!;
    expect(arrangeTla(profile, { ...old, ...again })).toBeNull();
  });
});

describe('the situation library knows its actions and describing words', () => {
  const words = new Set(SITUATIONS.flatMap((s) => [...s.words, ...(s.steps ?? []).map((st) => (typeof st === 'string' ? st : st.w))]).map((w) => w.split('#')[0]));
  it('every listed word is still in the library', () => {
    expect(SITUATION_KIND_WORDS.filter((w) => !words.has(w))).toEqual([]);
  });
  it('"laver", "sécher", "sortir" are actions; "propre" describes; "savon" is a thing', () => {
    for (const w of ['laver', 'sécher', 'sortir', 'rincer', 'se laver les mains']) expect(situationWordKind(w)).toBe('verb');
    expect(situationWordKind('propre')).toBe('descriptor');
    expect(situationWordKind('merci')).toBe('social');
    expect(situationWordKind('savon')).toBeUndefined();
  });
});
