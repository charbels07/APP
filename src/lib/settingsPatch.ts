/**
 * The settings being changed, before "Save": kept as the list of what the person changed, not as
 * a copy of the whole settings.
 *
 * - What is on screen is always the profile as it is now, with the person's changes on top: a
 *   change made meanwhile on another device (a consent withdrawn, a new code) is not undone by a
 *   "Save" that only meant to change the voice.
 * - "Save" writes the changed parts only.
 * - The list can wait outside the settings panel (`settingsStash` in AppState): an unsaved change
 *   is found again when the settings open again, after caregiver mode turned itself off or the
 *   person went to "Deleted words" and back.
 */
import { stable } from './profileDiff';

export type Patch<T> = Partial<T>;

const copyOf = <T,>(v: T): T => (v === undefined ? v : (JSON.parse(JSON.stringify(v)) as T));

/** Never changed through the draft: the menus' language belongs to the person, the code has its own field. */
const NEVER = new Set(['uiLang', 'pin']);

/** The parts of `patch` that differ from what the profile holds now. */
export function changedKeys<T extends object>(current: T, patch: Patch<T>): (keyof T)[] {
  return (Object.keys(patch) as (keyof T)[]).filter((k) => !NEVER.has(k as string) && stable(patch[k]) !== stable(current[k]));
}

/** What the screens show: the profile's values with the person's changes on top. */
export function withPatch<T extends object>(current: T, patch: Patch<T>): T {
  const keys = changedKeys(current, patch);
  if (!keys.length) return current;
  const out = { ...current };
  for (const k of keys) {
    if (patch[k] === undefined) delete out[k];
    else out[k] = copyOf(patch[k]) as T[keyof T];
  }
  return out;
}

/** One more change by the person (`fn` edits a copy of what is on screen): the new list. */
export function nextPatch<T extends object>(current: T, patch: Patch<T>, fn: (draft: T) => void): Patch<T> {
  const before = withPatch(current, patch);
  const after = copyOf(before);
  fn(after);
  const out: Patch<T> = {};
  // What was already changed stays, unless it is back to what the profile holds.
  for (const k of changedKeys(current, patch)) out[k] = patch[k];
  for (const k of new Set([...Object.keys(before), ...Object.keys(after)]) as Set<keyof T>) {
    if (NEVER.has(k as string) || stable(after[k]) === stable(before[k])) continue;
    if (stable(after[k]) === stable(current[k])) delete out[k];
    else out[k] = after[k];
  }
  return out;
}

/** "Save": only what the person changed is written. */
export function applyPatch<T extends object>(target: T, patch: Patch<T>): void {
  for (const k of changedKeys(target, patch)) {
    if (patch[k] === undefined) delete target[k];
    else target[k] = copyOf(patch[k]) as T[keyof T];
  }
}

export const isEmptyPatch = <T extends object>(current: T, patch: Patch<T>): boolean => changedKeys(current, patch).length === 0;
