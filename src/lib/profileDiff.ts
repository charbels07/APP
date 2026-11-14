/**
 * Changes to an AAC profile, as a list of small "ops".
 *
 * An op says: at this place (a cell of a board, a word, a setting…), the value was
 * `before` and becomes `after`. That makes three things possible:
 *  - proposals: a professional edits a copy; the differences are sent for approval;
 *  - conflicts: if the place no longer holds `before` when the change is applied,
 *    someone else changed it meanwhile — nothing is overwritten silently;
 *  - undo: swapping `before` and `after` gives the opposite change.
 */
import type { Board, Cell, Profile, Schedule } from '../model/types';
import { badKey } from './safety';

export type OpPath =
  | ['cell', string, number]
  | ['board', string]
  | ['concept', string]
  | ['override', string]
  | ['schedule', string]
  | ['tlaOrder']
  | ['activeSchedule']
  | ['setting', string]
  | ['firstThen']
  | ['help']
  /** Week plan: one weekday ('0' = Monday). */
  | ['weekDay', string]
  /** Month plan: one event. */
  | ['monthEvent', string];

export interface Op {
  path: OpPath;
  /** undefined = did not exist */
  before: unknown;
  /** undefined = removed */
  after: unknown;
}

/** Settings that are personal (each person's menu language) or secret: never part of a change set. */
const PRIVATE_SETTINGS = new Set(['pin', 'uiLang']);
/** Settings only the family decides: what is recorded about the child, what is shared, the caregiver code. */
const FAMILY_ONLY_SETTINGS = new Set(['dataCollection', 'shareStats', 'pin', 'uiLang']);

/**
 * Someone else's changes (a proposal, a shared material, an imported file) before they are
 * applied to a child's profile. Left out: what only the family decides, anything that is not a
 * known kind of change, and links to apps or sites (a card that opens a page or calls a number
 * is set up by the family itself, never received from someone).
 */
export function foreignOps(ops: unknown): { ops: Op[]; leftOut: number } {
  const kept: Op[] = [];
  let leftOut = 0;
  for (const op of Array.isArray(ops) ? (ops as Op[]) : []) {
    const path = op?.path as unknown;
    if (!Array.isArray(path) || path.some((k) => typeof k === 'string' && badKey(k))) {
      leftOut++;
      continue;
    }
    if (path[0] === 'setting' && FAMILY_ONLY_SETTINGS.has(String(path[1]))) {
      leftOut++;
      continue;
    }
    if ((path[0] === 'concept' || path[0] === 'override') && op.after && typeof op.after === 'object') {
      const was = op.before && typeof op.before === 'object' ? (op.before as { app?: unknown }).app : undefined;
      const after = { ...(op.after as Record<string, unknown>) };
      if (stable(after.app) !== stable(was)) {
        if (was === undefined) delete after.app;
        else after.app = was;
        leftOut++;
        if (stable(after) === stable(op.before)) continue;
        kept.push({ ...op, after });
        continue;
      }
    }
    kept.push(op);
  }
  return { ops: kept, leftOut };
}

/** JSON with sorted keys, so two equal objects always compare equal. */
export function stable(v: unknown): string {
  if (v === undefined) return 'undefined';
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .filter((k) => o[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stable(o[k])}`)
    .join(',')}}`;
}
export const same = (a: unknown, b: unknown) => stable(a) === stable(b);
const clone = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

function keyedDiff<T>(path: (id: string) => OpPath, a: Record<string, T>, b: Record<string, T>, out: Op[]) {
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!same(a[id], b[id])) out.push({ path: path(id), before: clone(a[id]), after: clone(b[id]) });
  }
}

const byId = (list: Schedule[]) => Object.fromEntries(list.map((s) => [s.id, s]));

/** Every difference between two versions of a profile. */
export function diffProfiles(base: Profile, draft: Profile): Op[] {
  const ops: Op[] = [];
  // Boards: cell by cell when the shape is unchanged, otherwise the whole board.
  for (const id of new Set([...Object.keys(base.boards), ...Object.keys(draft.boards)])) {
    const a = base.boards[id];
    const b = draft.boards[id];
    if (same(a, b)) continue;
    if (!a || !b || a.rows !== b.rows || a.cols !== b.cols || a.kind !== b.kind || a.concept !== b.concept) {
      ops.push({ path: ['board', id], before: clone(a), after: clone(b) });
      continue;
    }
    a.cells.forEach((cell, i) => {
      if (!same(cell, b.cells[i])) ops.push({ path: ['cell', id, i], before: clone(cell), after: clone(b.cells[i]) });
    });
  }
  keyedDiff((id) => ['concept', id], base.customConcepts, draft.customConcepts, ops);
  keyedDiff((id) => ['override', id], base.overrides, draft.overrides, ops);
  keyedDiff((id) => ['schedule', id], byId(base.schedules), byId(draft.schedules), ops);
  if (!same(base.tlaOrder, draft.tlaOrder)) ops.push({ path: ['tlaOrder'], before: clone(base.tlaOrder), after: clone(draft.tlaOrder) });
  if (!same(base.activeSchedule, draft.activeSchedule))
    ops.push({ path: ['activeSchedule'], before: base.activeSchedule, after: draft.activeSchedule });
  const sa = base.settings as unknown as Record<string, unknown>;
  const sb = draft.settings as unknown as Record<string, unknown>;
  for (const k of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (PRIVATE_SETTINGS.has(k) || same(sa[k], sb[k])) continue;
    ops.push({ path: ['setting', k], before: clone(sa[k]), after: clone(sb[k]) });
  }
  if (!same(base.firstThen, draft.firstThen)) ops.push({ path: ['firstThen'], before: clone(base.firstThen), after: clone(draft.firstThen) });
  if (!same(base.help, draft.help)) ops.push({ path: ['help'], before: clone(base.help), after: clone(draft.help) });
  keyedDiff((id) => ['weekDay', id], base.weekPlan ?? {}, draft.weekPlan ?? {}, ops);
  keyedDiff((id) => ['monthEvent', id], base.monthPlan ?? {}, draft.monthPlan ?? {}, ops);
  return ops;
}

export function getAt(p: Profile, path: OpPath): unknown {
  switch (path[0]) {
    case 'cell':
      return p.boards[path[1]]?.cells[path[2]] ?? null;
    case 'board':
      return p.boards[path[1]];
    case 'concept':
      return p.customConcepts[path[1]];
    case 'override':
      return p.overrides[path[1]];
    case 'schedule':
      return p.schedules.find((s) => s.id === path[1]);
    case 'tlaOrder':
      return p.tlaOrder;
    case 'activeSchedule':
      return p.activeSchedule;
    case 'setting':
      return (p.settings as unknown as Record<string, unknown>)[path[1]];
    case 'firstThen':
      return p.firstThen;
    case 'help':
      return p.help;
    case 'weekDay':
      return p.weekPlan?.[path[1]];
    case 'monthEvent':
      return p.monthPlan?.[path[1]];
  }
}

/** Writes one value into a profile (mutates it). */
export function setAt(p: Profile, path: OpPath, value: unknown): void {
  if (path.some((k) => typeof k === 'string' && badKey(k))) return;
  const v = clone(value);
  switch (path[0]) {
    case 'cell': {
      const board = p.boards[path[1]];
      if (board) board.cells[path[2]] = (v ?? null) as Cell | null;
      return;
    }
    case 'board':
      if (v === undefined) delete p.boards[path[1]];
      else p.boards[path[1]] = v as Board;
      return;
    case 'concept':
      if (v === undefined) delete p.customConcepts[path[1]];
      else p.customConcepts[path[1]] = v as Profile['customConcepts'][string];
      return;
    case 'override':
      if (v === undefined) delete p.overrides[path[1]];
      else p.overrides[path[1]] = v as Profile['overrides'][string];
      return;
    case 'schedule': {
      const i = p.schedules.findIndex((s) => s.id === path[1]);
      if (v === undefined) {
        if (i >= 0) p.schedules.splice(i, 1);
      } else if (i >= 0) p.schedules[i] = v as Schedule;
      else p.schedules.push(v as Schedule);
      return;
    }
    case 'tlaOrder':
      p.tlaOrder = (v as string[]) ?? [];
      return;
    case 'activeSchedule':
      p.activeSchedule = v as string | undefined;
      return;
    case 'setting':
      if (!badKey(path[1])) (p.settings as unknown as Record<string, unknown>)[path[1]] = v;
      return;
    case 'firstThen':
      p.firstThen = v as Profile['firstThen'];
      return;
    case 'help':
      if (v !== undefined) p.help = v as Profile['help'];
      return;
    case 'weekDay':
      p.weekPlan ??= {};
      if (v === undefined) delete p.weekPlan[path[1]];
      else p.weekPlan[path[1]] = v as NonNullable<Profile['weekPlan']>[string];
      return;
    case 'monthEvent':
      p.monthPlan ??= {};
      if (v === undefined) delete p.monthPlan[path[1]];
      else p.monthPlan[path[1]] = v as NonNullable<Profile['monthPlan']>[string];
      return;
  }
}

/**
 * Applies changes to a copy of the profile. A change whose place no longer holds its
 * `before` value is a conflict and is skipped (unless `force`), never overwritten silently.
 */
export function applyOps(profile: Profile, ops: Op[], opts: { force?: boolean } = {}): { profile: Profile; applied: Op[]; conflicts: Op[] } {
  const p = clone(profile);
  const applied: Op[] = [];
  const conflicts: Op[] = [];
  for (const op of ops) {
    const now = getAt(p, op.path);
    if (same(now, op.after)) {
      applied.push(op); // already there
      continue;
    }
    if (!opts.force && !same(now, op.before) && !(op.before === undefined && now === null)) {
      conflicts.push(op);
      continue;
    }
    setAt(p, op.path, op.after);
    applied.push(op);
  }
  return { profile: p, applied, conflicts };
}

/** The opposite changes, in reverse order: applying them undoes `ops`. */
export function invertOps(ops: Op[]): Op[] {
  return ops
    .slice()
    .reverse()
    .map((op) => ({ path: op.path, before: op.after, after: op.before }));
}

/** Two change sets touch the same place. */
export function overlapping(a: Op[], b: Op[]): boolean {
  const keys = new Set(a.map((o) => stable(o.path)));
  return b.some((o) => keys.has(stable(o.path)));
}

export function isCoreOp(op: Op): boolean {
  return (op.path[0] === 'cell' || op.path[0] === 'board') && op.path[1] === 'core';
}
