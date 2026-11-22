/**
 * Our changes put on top of someone else's newer version of the board (two devices, or two
 * people, changed it at the same time). Rules decided with the owner (gap review, Q39):
 *
 * - A word moved, two words swapped, a word deleted and put in the bin: the changes that belong
 *   together are kept together or dropped together. A move or a swap that collides is dropped
 *   whole, never half-done (a word must never vanish, nor be on the board twice).
 * - A word is merged part by part: its picture, its recording in each language, its name in each
 *   language. Only the part both changed keeps the other person's version.
 * - The list of activity boards is merged as a list: two people each adding a board both find it.
 * - Demonstrations and the bin are merged entry by entry.
 * - Everything else as before: a place that someone else changed keeps their version.
 *
 * What was not kept is returned (`dropped`): the board names it to the person.
 * Core cells never move here: a core change either applies exactly as made or is dropped.
 */
import type { Profile } from '../model/types';
import { getAt, same, setAt, stable, type Op } from './profileDiff';

export interface Merged {
  profile: Profile;
  applied: Op[];
  /** Our changes (or the part of them) that were not kept: the other version won there. */
  dropped: Op[];
}

const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** The place still holds what we started from (or already what we want). */
function fits(p: Profile, op: Op): 'done' | 'free' | 'taken' {
  const now = getAt(p, op.path);
  if (same(now, op.after)) return 'done';
  if (same(now, op.before) || (op.before === undefined && now === null) || (op.before === null && now === undefined)) return 'free';
  return 'taken';
}

/** The words a cell or a bin entry holds (to tie a move, a swap or a deletion together). */
function wordsOf(op: Op, side: 'before' | 'after'): string[] {
  const v = op[side] as Record<string, unknown> | null | undefined;
  if (!v || typeof v !== 'object') return [];
  if (op.path[0] === 'cell') return typeof v.concept === 'string' ? [v.concept] : [];
  if (op.path[0] === 'bin') {
    const cell = v.cell as { concept?: unknown } | undefined;
    const board = v.board as { concept?: unknown; id?: unknown } | undefined;
    if (v.kind === 'cell' && typeof cell?.concept === 'string') return [cell.concept];
    if (v.kind === 'board' && typeof board?.id === 'string') return [`board:${board.id}`];
  }
  if (op.path[0] === 'board') return [`board:${op.path[1]}`];
  return [];
}

/**
 * Groups the changes that belong together: a word that leaves a place (or goes to the bin) and the
 * change that puts it somewhere else (or the deletion that sent it there).
 */
function groups(ops: Op[]): Op[][] {
  const parent = ops.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const join = (a: number, b: number) => {
    parent[find(a)] = find(b);
  };
  const leaves = new Map<string, number[]>();
  const arrives = new Map<string, number[]>();
  ops.forEach((op, i) => {
    const before = wordsOf(op, 'before');
    const after = wordsOf(op, 'after');
    for (const w of before) if (!after.includes(w)) (leaves.get(w) ?? leaves.set(w, []).get(w)!).push(i);
    for (const w of after) if (!before.includes(w)) (arrives.get(w) ?? arrives.set(w, []).get(w)!).push(i);
  });
  for (const [w, from] of leaves) for (const to of arrives.get(w) ?? []) for (const f of from) join(f, to);
  const out = new Map<number, Op[]>();
  ops.forEach((op, i) => {
    const r = find(i);
    (out.get(r) ?? out.set(r, []).get(r)!).push(op);
  });
  return [...out.values()];
}

/**
 * Three-way merge of two objects, part by part (`depth` levels: a word's `labels` and `audio` are
 * merged language by language). Returns the result and the parts where the other side was kept.
 */
function mergeParts(base: Record<string, unknown>, ours: Record<string, unknown>, theirs: Record<string, unknown>, depth: number): { value: Record<string, unknown>; lost: string[] } {
  const value = clone(theirs);
  const lost: string[] = [];
  for (const k of new Set([...Object.keys(base), ...Object.keys(ours)])) {
    if (same(base[k], ours[k])) continue; // we did not change this part
    if (same(theirs[k], ours[k])) continue; // already the same
    if (same(theirs[k], base[k])) {
      // only we changed it
      if (ours[k] === undefined) delete value[k];
      else value[k] = clone(ours[k]);
      continue;
    }
    if (depth > 0 && isObj(base[k] ?? {}) && isObj(ours[k]) && isObj(theirs[k])) {
      const inner = mergeParts((base[k] ?? {}) as Record<string, unknown>, ours[k] as Record<string, unknown>, theirs[k] as Record<string, unknown>, depth - 1);
      value[k] = inner.value;
      lost.push(...inner.lost.map((x) => `${k}.${x}`));
      continue;
    }
    lost.push(k); // both changed it: theirs kept
  }
  return { value, lost };
}

/** The list of activity boards: what we added and removed, on top of their list. */
function mergeList(base: string[], ours: string[], theirs: string[]): string[] {
  const b = new Set(base);
  const o = new Set(ours);
  const t = new Set(theirs);
  const weRemoved = new Set(base.filter((x) => !o.has(x)));
  const theyRemoved = new Set(base.filter((x) => !t.has(x)));
  const common = (list: string[]) => list.filter((x) => b.has(x) && o.has(x) && t.has(x));
  const weReordered = !same(common(base), common(ours));
  const theyReordered = !same(common(base), common(theirs));
  let out: string[];
  if (weReordered && !theyReordered) {
    // Our order, with what they added kept where it was (at the end of the list if alone).
    out = ours.filter((x) => !theyRemoved.has(x));
    theirs.forEach((x, i) => {
      if (b.has(x) || out.includes(x)) return;
      const before = theirs.slice(0, i).reverse().find((y) => out.includes(y));
      out.splice(before === undefined ? 0 : out.indexOf(before) + 1, 0, x);
    });
  } else {
    out = theirs.filter((x) => !weRemoved.has(x));
    ours.forEach((x, i) => {
      if (b.has(x) || out.includes(x)) return;
      const before = ours.slice(0, i).reverse().find((y) => out.includes(y));
      out.splice(before === undefined ? out.length : out.indexOf(before) + 1, 0, x);
    });
  }
  return [...new Set(out)];
}

/** Applies our changes on top of their version (never mutates `theirs`). */
export function mergeOps(theirs: Profile, ours: Op[]): Merged {
  const p = clone(theirs);
  const applied: Op[] = [];
  const dropped: Op[] = [];
  const tied = ours.filter((op) => op.path[0] === 'cell' || op.path[0] === 'board' || op.path[0] === 'bin');
  const words = ours.filter((op) => op.path[0] === 'concept' || op.path[0] === 'override');
  const order = ours.filter((op) => op.path[0] === 'tlaOrder');
  const rest = ours.filter((op) => !tied.includes(op) && !words.includes(op) && !order.includes(op));

  // 1. Cells, boards and the bin: what belongs together goes together, or not at all.
  for (const group of groups(tied)) {
    if (group.some((op) => fits(p, op) === 'taken')) {
      dropped.push(...group);
      continue;
    }
    for (const op of group) if (fits(p, op) === 'free') setAt(p, op.path, op.after);
    applied.push(...group);
  }

  // 2. Words: part by part.
  for (const op of words) {
    const state = fits(p, op);
    if (state !== 'taken') {
      if (state === 'free') setAt(p, op.path, op.after);
      applied.push(op);
      continue;
    }
    const now = getAt(p, op.path);
    // Deleted on one side and changed on the other: the word stays as the other side left it.
    if (!isObj(now) || !isObj(op.after)) {
      dropped.push(op);
      continue;
    }
    const { value, lost } = mergeParts(isObj(op.before) ? op.before : {}, op.after, now, 1);
    setAt(p, op.path, value);
    if (lost.length) {
      // What was not kept, said as the change of that word.
      dropped.push(op);
      if (stable(value) !== stable(now)) applied.push({ ...op, before: now, after: value });
    } else applied.push(op);
  }

  // 3. The list of activity boards.
  for (const op of order) {
    const base = Array.isArray(op.before) ? (op.before as string[]) : [];
    const want = Array.isArray(op.after) ? (op.after as string[]) : [];
    const next = mergeList(base, want, Array.isArray(p.tlaOrder) ? p.tlaOrder : []);
    if (!same(next, p.tlaOrder)) setAt(p, ['tlaOrder'], next);
    applied.push(op);
  }

  // 4. Everything else, one place at a time.
  for (const op of rest) {
    const state = fits(p, op);
    if (state === 'taken') {
      dropped.push(op);
      continue;
    }
    if (state === 'free') setAt(p, op.path, op.after);
    applied.push(op);
  }
  return { profile: p, applied, dropped };
}
