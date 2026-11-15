/**
 * What the app's team may learn to improve the app, and nothing more.
 *
 * Two things, both only for the families who agreed ("Help improve the app", terms 2):
 *  - feature counters: "the timer was started 3 times today". A fixed list of names and numbers
 *    per day: no word, no sentence, no text, no time of day;
 *  - technical problems: the kind of problem, the screen, a place in the code. Never the error's
 *    own message (it can quote what somebody typed).
 * The database has the same lists and refuses anything else (`product_keys`, `report_problems`).
 *
 * Any screen counts with `countFeature('print')` or reports with `reportProblem('print', e)`;
 * both do nothing unless a board whose family agreed is open (`setProductSink`).
 */
import type { Settings } from '../model/types';

/** One per feature: "used that day". The back office shows who uses each one regularly, now and then, no more, never. */
export const FEATURES = [
  'board',
  'tla',
  'schedule',
  'firstThen',
  'timer',
  'search',
  'keyboard',
  'model',
  'edit',
  'photo',
  'recording',
  'print',
  'followUp',
  'ai',
  'guide',
  'lock',
] as const;
export type Feature = (typeof FEATURES)[number];

/** What happened inside a task (a search without result, a board started and not finished…). */
export const TASK_COUNTERS = [
  'searchNone',
  'searchPick',
  'tlaStart',
  'tlaDone',
  'tlaMs',
  'tlaAi',
  'tlaPhoto',
  'tlaKept',
  'tlaChanged',
  'seqStart',
  'seqDone',
  'pictoSwap',
  'printTla',
  'printSchedule',
] as const;
export type Counter = Feature | (typeof TASK_COUNTERS)[number];
export const COUNTERS: readonly Counter[] = [...FEATURES, ...TASK_COUNTERS];

export const PROBLEM_KINDS = ['crash', 'promise', 'sync', 'speech', 'audio', 'print', 'ai', 'mic', 'picto', 'photo'] as const;
export type ProblemKind = (typeof PROBLEM_KINDS)[number];

/** Where the person was (never a board's or a folder's own name). */
export const SCREENS = [
  'board',
  'folder',
  'tla',
  'schedule',
  'search',
  'keyboard',
  'model',
  'editor',
  'picker',
  'settings',
  'guide',
  'print',
  'newTla',
  'newSeq',
  'timer',
  'help',
  'lock',
  'data',
  'other',
] as const;
export type Screen = (typeof SCREENS)[number];

const ERROR_NAMES = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'NotAllowedError',
  'NotFoundError',
  'NotSupportedError',
  'AbortError',
  'NetworkError',
  'QuotaExceededError',
  'SecurityError',
  'TimeoutError',
  'DataError',
  'InvalidStateError',
  'BackendError',
]);

/** A problem as it is sent: known values only. */
export interface ProblemItem {
  kind: ProblemKind;
  name: string;
  /** "line:column" of the place in the app's code where it happened, or ''. */
  at: string;
  screen: Screen;
  n: number;
}

/** The version of "what is shared" the family must have agreed to for the counters and problems. */
export const SHARE_TERMS = 2;

/** Did the family agree to the list that includes feature counters and technical problems? */
export function sharesProduct(settings: Pick<Settings, 'shareStats' | 'shareTerms'>): boolean {
  return settings.shareStats === 'anonymous' && (settings.shareTerms ?? 0) >= SHARE_TERMS;
}

/** What the "Help improve the app" switch writes: turning it on is agreeing to today's list. */
export function shareChoice(on: boolean): Pick<Settings, 'shareStats' | 'shareTerms'> {
  return on ? { shareStats: 'anonymous', shareTerms: SHARE_TERMS } : { shareStats: 'none' };
}

/**
 * The place in the code of the first line of an error's trace, as "line:column". Only digits:
 * the file's address is left out (it can hold the site's name).
 */
export function placeInCode(stack: unknown): string {
  if (typeof stack !== 'string') return '';
  for (const line of stack.split('\n')) {
    const m = /:(\d{1,7}):(\d{1,7})\)?\s*$/.exec(line.trim());
    if (m) return `${m[1]}:${m[2]}`;
  }
  return '';
}

/** A problem reduced to what may be sent. The error's message is never read. */
export function describeProblem(kind: ProblemKind, error: unknown, screen: Screen): ProblemItem {
  const e = error as { name?: unknown; stack?: unknown } | null | undefined;
  const name = typeof e?.name === 'string' && ERROR_NAMES.has(e.name) ? e.name : 'Error';
  return { kind, name, at: placeInCode(e?.stack), screen: SCREENS.includes(screen) ? screen : 'other', n: 1 };
}

export interface ProductSink {
  count(key: Counter, n: number): void;
  problem(item: ProblemItem): void;
}

let sink: ProductSink | null = null;
let screen: Screen = 'other';

/** The open board's counter (or null when no board is open). */
export function setProductSink(s: ProductSink | null): void {
  sink = s;
}

/** Told by the board each time the person moves to another kind of screen. */
export function setScreen(s: Screen): void {
  screen = s;
}
export function currentScreen(): Screen {
  return screen;
}

/** "This feature was used." Does nothing unless the family agreed. `n`: how many (or milliseconds for a `…Ms` counter). */
export function countFeature(key: Counter, n = 1): void {
  if (!sink || !(n > 0)) return;
  try {
    sink.count(key, n);
  } catch {
    /* counting never breaks the app */
  }
}

/** "This went wrong." Does nothing unless the family agreed. */
export function reportProblem(kind: ProblemKind, error?: unknown): void {
  if (!sink) return;
  try {
    sink.problem(describeProblem(kind, error, screen));
  } catch {
    /* reporting never breaks the app */
  }
}

/** Phone, tablet or computer: the only thing told about the device (with its system and the app's version). */
export type DeviceForm = 'phone' | 'tablet' | 'computer';
export function deviceForm(os: string, width: number, height: number, touch: boolean): DeviceForm {
  const small = Math.min(width, height);
  if (os === 'web' && !touch) return 'computer';
  return small >= 600 ? 'tablet' : 'phone';
}
