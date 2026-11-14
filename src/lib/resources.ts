/**
 * Professionals' materials (TLA, schedules, First–Then, timers, picture cards).
 *
 * A material is a small piece of a profile. To edit one, the app builds a "sandbox" profile
 * holding only that material and opens it with the normal editors; saving takes the piece
 * back out. Proposing it to a child turns it into changes ("ops") added to that child's
 * profile — never replacing anything already there.
 */
import { randomUUID } from 'expo-crypto';
import { createDefaultProfile } from '../data/defaults';
import type { Board, Profile, Schedule } from '../model/types';
import type { ResourceData, ResourceKind } from '../backend/types';
import { foreignOps, type Op } from './profileDiff';
import { plain } from './safety';

export const RESOURCE_KINDS: ResourceKind[] = ['tla', 'schedule', 'firstThen', 'timer', 'cards'];

/** A new material's id (the real server expects a UUID). */
export function newResourceId(): string {
  try {
    const id = randomUUID();
    if (typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return id;
  } catch {
    /* not available here: built below */
  }
  return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16));
}

/** Kinds edited in a sandbox board; the others have a small form. */
export const EDITED_ON_BOARD: ResourceKind[] = ['tla', 'schedule'];

export function emptyResource(kind: ResourceKind): ResourceData {
  return {
    boards: [],
    schedules: [],
    customConcepts: {},
    overrides: {},
    ...(kind === 'timer' ? { timer: { minutes: 5, display: ['circle', 'digits'] } } : {}),
    ...(kind === 'cards' ? { cards: [] } : {}),
    ...(kind === 'firstThen' ? { firstThen: {} } : {}),
  };
}

/** A profile holding only this material, for the normal editors. */
export function sandboxFor(kind: ResourceKind, data: ResourceData): Profile {
  const p = createDefaultProfile();
  Object.assign(p.customConcepts, plain(JSON.parse(JSON.stringify(data.customConcepts ?? {}))));
  Object.assign(p.overrides, plain(JSON.parse(JSON.stringify(data.overrides ?? {}))));
  if (kind === 'tla') {
    for (const b of data.boards) p.boards[b.id] = JSON.parse(JSON.stringify(b));
    p.tlaOrder = data.boards.map((b) => b.id);
    p.lastTla = p.tlaOrder[0];
  }
  if (kind === 'schedule') {
    p.schedules = data.schedules.length
      ? JSON.parse(JSON.stringify(data.schedules))
      : [{ id: `sched_${Date.now().toString(36)}`, title: '', concept: 's_morning', recurring: false, steps: [] }];
    p.activeSchedule = p.schedules[0].id;
  }
  if (kind === 'firstThen') p.firstThen = { ...(data.firstThen ?? {}) };
  p.guide = { seen: true };
  return p;
}

/** Words used by a piece of content (to keep their custom labels and pictures with it). */
function conceptsIn(boards: Board[], schedules: Schedule[], firstThen?: { first?: string; then?: string }, cards: string[] = []): Set<string> {
  const ids = new Set<string>(cards);
  for (const b of boards) {
    ids.add(b.concept);
    for (const c of b.cells) if (c) ids.add(c.concept);
  }
  for (const s of schedules) {
    ids.add(s.concept);
    for (const st of s.steps) ids.add(st.concept);
  }
  if (firstThen?.first) ids.add(firstThen.first);
  if (firstThen?.then) ids.add(firstThen.then);
  return ids;
}

function keepUsed(p: Pick<Profile, 'customConcepts' | 'overrides'>, used: Set<string>) {
  return {
    customConcepts: Object.fromEntries(Object.entries(p.customConcepts).filter(([id]) => used.has(id))),
    overrides: Object.fromEntries(Object.entries(p.overrides).filter(([id]) => used.has(id))),
  };
}

/** Takes the material back out of its sandbox. */
export function resourceFromSandbox(kind: ResourceKind, p: Profile, prev: ResourceData): ResourceData {
  const boards = kind === 'tla' ? p.tlaOrder.map((id) => p.boards[id]).filter(Boolean) : [];
  const schedules = kind === 'schedule' ? p.schedules : [];
  const firstThen = kind === 'firstThen' ? p.firstThen ?? {} : prev.firstThen;
  const used = conceptsIn(boards, schedules, firstThen, prev.cards);
  return { ...prev, boards: JSON.parse(JSON.stringify(boards)), schedules: JSON.parse(JSON.stringify(schedules)), firstThen, ...keepUsed(p, used) };
}

/** For forms (cards): keeps the words used and their pictures. */
export function withConcepts(data: ResourceData, from: Pick<Profile, 'customConcepts' | 'overrides'>): ResourceData {
  const used = conceptsIn(data.boards, data.schedules, data.firstThen, data.cards);
  const own = keepUsed({ customConcepts: { ...data.customConcepts, ...from.customConcepts }, overrides: { ...data.overrides, ...from.overrides } }, used);
  return { ...data, ...own };
}

/** The changes that add this material to a child's profile (nothing already there is replaced). */
export function resourceToOps(profile: Profile, kind: ResourceKind, data: ResourceData, suffix = Date.now().toString(36)): Op[] {
  const ops: Op[] = [];
  const free = (id: string, taken: (x: string) => boolean) => (taken(id) ? `${id}_${suffix}` : id);
  for (const [id, c] of Object.entries(plain(data.customConcepts))) {
    if (!profile.customConcepts[id]) ops.push({ path: ['concept', id], before: undefined, after: c });
  }
  for (const [id, o] of Object.entries(plain(data.overrides))) {
    // A word that already has the child's own picture or name keeps it.
    if (!profile.overrides[id]) ops.push({ path: ['override', id], before: undefined, after: o });
  }
  if (kind === 'tla' && data.boards.length) {
    const added: string[] = [];
    for (const b of data.boards) {
      const id = free(b.id, (x) => !!profile.boards[x]);
      ops.push({ path: ['board', id], before: undefined, after: { ...b, id } });
      added.push(id);
    }
    ops.push({ path: ['tlaOrder'], before: profile.tlaOrder, after: [...profile.tlaOrder, ...added] });
  }
  if (kind === 'schedule') {
    for (const s of data.schedules) {
      const id = free(s.id, (x) => profile.schedules.some((y) => y.id === x));
      ops.push({ path: ['schedule', id], before: undefined, after: { ...s, id } });
    }
  }
  if (kind === 'firstThen' && data.firstThen) {
    ops.push({ path: ['firstThen'], before: profile.firstThen, after: data.firstThen });
  }
  // A material can come from someone else (shared, imported file): links to apps or sites do
  // not travel with it. The family adds its own on the card.
  return foreignOps(ops).ops;
}

/** A copy for another use (template → one child's material, or a colleague's copy). */
export function duplicateData(data: ResourceData): ResourceData {
  const suffix = Date.now().toString(36);
  const copy: ResourceData = JSON.parse(JSON.stringify(data));
  copy.boards = copy.boards.map((b) => ({ ...b, id: `${b.id.split('_c')[0]}_c${suffix}` }));
  copy.schedules = copy.schedules.map((s) => ({ ...s, id: `${s.id.split('_c')[0]}_c${suffix}` }));
  return copy;
}
