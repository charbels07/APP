/**
 * Activity boards (TLA) are laid out like the child's main board.
 *
 * The main board is made of columns: people, actions, little words, describing words,
 * questions, social words, then the folders of things. An activity board does the same:
 *  - each kind of word (each colour) gets its own column, or several when there are many words,
 *    and the kinds follow each other from left to right in the order of the main board;
 *  - inside a kind, the words every activity board carries come first (same place on every
 *    board), then the words the main board already has, in the order they have there, then the
 *    words that are new for the child.
 * The child's own main board is read (not the starter one), and nothing here moves a word on it.
 */
import { TLA_CORE, TLA_FUNCTIONS } from '../data/tlaCore';
import type { Board, Cell, Profile, WordClass } from '../model/types';
import { getConcept } from './lexicon';

/** Used for kinds the main board does not show at all. */
const USUAL_KINDS: WordClass[] = ['pronoun', 'verb', 'little', 'negation', 'descriptor', 'question', 'social', 'people', 'noun'];

/** Kinds that share a column group, as on the main board ("not" sits with the little words, people come with the things). */
const GROUP_OF: Partial<Record<WordClass, WordClass>> = { negation: 'little', people: 'noun', folder: 'noun' };
const groupOf = (cls: WordClass): WordClass => GROUP_OF[cls] ?? cls;

/** What is known about a word to be placed: the profile's word if it has one, and its kind. */
export interface Placed {
  concept?: string;
  cls: WordClass;
}

export function mainBoardOrder(profile: Profile) {
  // Every word reachable from the main board, numbered in the order it is met: the main board
  // column by column, and each folder (read line by line) at the place of its card.
  const rank = new Map<string, number>();
  const seen = new Set<string>();
  const visit = (b: Board | undefined, byColumns: boolean) => {
    if (!b || seen.has(b.id)) return;
    seen.add(b.id);
    for (let i = 0; i < b.rows * b.cols; i++) {
      const cell = b.cells[byColumns ? (i % b.rows) * b.cols + Math.floor(i / b.rows) : i];
      if (!cell) continue;
      if (!rank.has(cell.concept)) rank.set(cell.concept, rank.size);
      if (cell.folder) visit(profile.boards[cell.folder], false);
    }
  };
  visit(profile.boards.core, true);

  const kinds: WordClass[] = [];
  for (const id of rank.keys()) {
    const cls = getConcept(profile, id)?.cls;
    if (cls && cls !== 'folder' && !kinds.includes(cls)) kinds.push(cls);
  }
  for (const cls of USUAL_KINDS) if (!kinds.includes(cls)) kinds.push(cls);
  const kindOf = (cls: WordClass) => (kinds.includes(cls) ? kinds.indexOf(cls) : kinds.length);
  /** The column groups, from left to right. */
  const groups: WordClass[] = [];
  for (const cls of kinds) if (!groups.includes(groupOf(cls))) groups.push(groupOf(cls));

  /** The items in the order of the main board (items that tie keep the order they came in). */
  function sort<T>(items: T[], describe: (item: T) => Placed): T[] {
    return items
      .map((item, i) => {
        const p = describe(item);
        const known = p.concept !== undefined ? rank.get(p.concept) : undefined;
        return { item, i, kind: kindOf(p.cls), place: known ?? Number.MAX_SAFE_INTEGER };
      })
      .sort((a, b) => a.kind - b.kind || a.place - b.place || a.i - b.i)
      .map((x) => x.item);
  }
  /** Words of the profile, in the order of the main board. */
  const sortConcepts = (ids: string[]) => sort(ids, (id) => ({ concept: id, cls: getConcept(profile, id)?.cls ?? 'noun' }));
  return { kinds, groups, sort, sortConcepts };
}

/** The words every activity board carries, in the order they keep at the top of their columns. */
const FIXED = [...TLA_CORE.flat(), ...TLA_FUNCTIONS];
/** As wide as the main board at most; beyond that the board gets more lines instead. */
const MOST_COLUMNS = 12;

/**
 * Cards → the grid: one column (or more) per kind of word, filled from top to bottom.
 * Five lines; more (up to seven) when the board would otherwise become too wide.
 */
function columnsByKind(profile: Profile, cards: Cell[]): { rows: number; cols: number; cells: (Cell | null)[] } {
  const { groups, sort } = mainBoardOrder(profile);
  const kindOfCard = (c: Cell): WordClass => getConcept(profile, c.concept)?.cls ?? 'noun';
  const fixedPlace = (c: Cell) => (FIXED.includes(c.concept) ? FIXED.indexOf(c.concept) : FIXED.length);
  const inOrder = sort(cards, (c) => ({ concept: c.concept, cls: kindOfCard(c) }));
  const byGroup = groups
    .map((g) =>
      inOrder
        .filter((c) => groupOf(kindOfCard(c)) === g)
        // the fixed words first, the others keep the main board's order (the sort is stable)
        .sort((a, b) => fixedPlace(a) - fixedPlace(b)),
    )
    .filter((list) => list.length > 0);
  const width = (rows: number) => byGroup.reduce((n, list) => n + Math.ceil(list.length / rows), 0);
  const rows = [5, 6, 7].find((r) => width(r) <= MOST_COLUMNS) ?? 7;
  const cols = Math.max(width(rows), 1);
  const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
  let col = 0;
  for (const list of byGroup) {
    list.forEach((card, i) => {
      cells[(i % rows) * cols + col + Math.floor(i / rows)] = card;
    });
    col += Math.ceil(list.length / rows);
  }
  return { rows, cols, cells };
}

/**
 * The grid of a new activity board: its fixed words and the topic words (already words of the
 * profile), each kind in its own column. A topic word that is one of the fixed words is not repeated.
 */
export function tlaLayout(profile: Profile, topicWords: string[]): { rows: number; cols: number; cells: (Cell | null)[] } {
  const words = [...new Set([...FIXED, ...topicWords])];
  return columnsByKind(
    profile,
    words.map((concept) => ({ concept })),
  );
}

/**
 * An activity board already made, put back in columns like the main board. Every card keeps its
 * own settings (size, colour strength, level); a card that was spread over several places goes
 * back to one place, because its neighbours change. Returns null when nothing would move.
 */
export function arrangeTla(profile: Profile, board: Board): { rows: number; cols: number; cells: (Cell | null)[] } | null {
  // Read column by column, as the columns are filled: words that tie keep the place they have,
  // so arranging a board that is already in order changes nothing.
  const cards: Cell[] = [];
  for (let c = 0; c < board.cols; c++)
    for (let r = 0; r < board.rows; r++) {
      const cell = board.cells[r * board.cols + c];
      if (cell) cards.push(cell.span ? { ...cell, span: undefined } : cell);
    }
  const next = columnsByKind(profile, cards);
  const same =
    next.rows === board.rows && next.cols === board.cols && next.cells.every((c, i) => (c?.concept ?? null) === (board.cells[i]?.concept ?? null));
  return same ? null : next;
}
