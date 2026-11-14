/**
 * "The order of the main board", used to arrange the words of an activity board (TLA).
 *
 * The main board is read column by column: people, actions, little words, describing words,
 * questions, social words, then the folders of things. So on an activity board:
 *  - words of the same kind (same colour) stay together, and the kinds follow each other in the
 *    order they first appear on the child's main board;
 *  - inside a kind, a word the main board (or one of its folders) already has keeps the order
 *    it has there; words that are new for the child come after.
 * The child's own main board is read (not the starter one), and nothing here moves a word on it.
 */
import { TLA_CORE, TLA_FUNCTIONS } from '../data/defaults';
import type { Board, Cell, Profile, WordClass } from '../model/types';
import { getConcept } from './lexicon';

/** Used for kinds the main board does not show at all. */
const USUAL_KINDS: WordClass[] = ['pronoun', 'verb', 'little', 'negation', 'descriptor', 'question', 'social', 'people', 'noun'];

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
  return { kinds, sort, sortConcepts };
}

const CORE_WORDS = new Set(TLA_CORE.flat());

/**
 * The cells of a new activity board: the shared block of core words in the two left columns (the
 * same place on every activity board), the communication words (look, my turn…) first, then the
 * topic words, already in the order wanted. A topic word that is in the fixed part is not repeated.
 */
export function tlaLayout(topicWords: string[]): { rows: number; cols: number; cells: (Cell | null)[] } {
  const topic = topicWords.filter((w, i) => !CORE_WORDS.has(w) && !TLA_FUNCTIONS.includes(w) && topicWords.indexOf(w) === i);
  const specific = [...TLA_FUNCTIONS, ...topic];
  const cols = 6;
  const rows = Math.max(TLA_CORE.length, Math.ceil(specific.length / (cols - 2)));
  const cells: (Cell | null)[] = new Array(rows * cols).fill(null);
  for (let r = 0; r < rows; r++) {
    if (TLA_CORE[r]) {
      cells[r * cols] = { concept: TLA_CORE[r][0] };
      cells[r * cols + 1] = { concept: TLA_CORE[r][1] };
    }
    for (let c = 2; c < cols; c++) {
      const w = specific[r * (cols - 2) + (c - 2)];
      if (w) cells[r * cols + c] = { concept: w };
    }
  }
  return { rows, cols, cells };
}

/**
 * An activity board already made, put back in the order of the main board. The cards that move
 * exchange their places between themselves (the same slots stay used, empty slots stay empty) and
 * keep their own settings (size, colour strength, level). What does not move: the block of core
 * words on the left, the communication words of the first line, folders, and cards spread over
 * several slots. Returns null when everything is already in order.
 */
export function arrangeTla(profile: Profile, board: Board): (Cell | null)[] | null {
  const fixed = (cell: Cell, i: number) => {
    const col = i % board.cols;
    const row = Math.floor(i / board.cols);
    return (
      (col < 2 && CORE_WORDS.has(cell.concept)) ||
      (row === 0 && TLA_FUNCTIONS.includes(cell.concept)) ||
      !!cell.folder ||
      (!!cell.span && (cell.span[0] > 1 || cell.span[1] > 1))
    );
  };
  const slots: number[] = [];
  board.cells.forEach((cell, i) => {
    if (cell && !fixed(cell, i)) slots.push(i);
  });
  const { sort } = mainBoardOrder(profile);
  const sorted = sort(
    slots.map((i) => board.cells[i] as Cell),
    (cell) => ({ concept: cell.concept, cls: getConcept(profile, cell.concept)?.cls ?? 'noun' }),
  );
  if (sorted.every((cell, k) => cell === board.cells[slots[k]])) return null;
  const cells = board.cells.slice();
  slots.forEach((i, k) => (cells[i] = sorted[k]));
  return cells;
}
