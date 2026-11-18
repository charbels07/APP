/**
 * What the app's team may learn to improve the app, and nothing more.
 *
 * Two things, both only for the families who agreed ("Help improve the app", terms 3):
 *  - counters per day, from fixed lists of names, numbers only (no word, no sentence, no text,
 *    no time of day): "the timer was started 3 times today" (`FEATURES`, `TASK_COUNTERS`),
 *    "the timer's button was on screen today" (`SEEN_COUNTERS`, 0 or 1 a day), "the voice took
 *    between 0.5 and 1 s to start, 4 times" (`SPEED_COUNTERS`: fixed steps, never the time
 *    itself), with the app's version (digits and dots only);
 *  - technical problems: the kind of problem, the screen, a place in the code. Never the error's
 *    own message (it can quote what somebody typed).
 * The database has the same lists and refuses anything else (`product_keys`, `report_problems`).
 *
 * Any screen counts with `countFeature('print')`, `useSeen('print')` (src/ui/Seen.tsx) or
 * `countSpeed('voice', ms)`, and reports with `reportProblem('print', e)`; all do nothing unless
 * a board whose family agreed is open (`setProductSink`).
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

/**
 * "Seen": the button, panel or tip that leads to a feature was on screen that day (0 or 1 a day).
 * Next to "used", it tells "never found it" from "found it and chose not to use it".
 */
export type SeenCounter = `seen:${Feature}`;
export const SEEN_COUNTERS: readonly SeenCounter[] = FEATURES.map((f): SeenCounter => `seen:${f}`);

/** How long the app made people wait: opening (to the first board), a save or a look for changes, the voice after a touch. */
export const SPEEDS = ['start', 'sync', 'voice'] as const;
export type Speed = (typeof SPEEDS)[number];
/** Fixed steps, in seconds: under 0.5, 0.5 to 1, 1 to 2, 2 to 5, more than 5. Only the step is kept, never the time. */
export const SPEED_BUCKETS = ['0.5', '1', '2', '5', 'more'] as const;
export type SpeedBucket = (typeof SPEED_BUCKETS)[number];
const SPEED_LIMITS = [500, 1000, 2000, 5000];
export type SpeedCounter = `${Speed}:${SpeedBucket}`;
export const SPEED_COUNTERS: readonly SpeedCounter[] = SPEEDS.flatMap((k) => SPEED_BUCKETS.map((b): SpeedCounter => `${k}:${b}`));

/** The step a waiting time falls into. */
export function speedBucket(ms: number): SpeedBucket {
  const i = SPEED_LIMITS.findIndex((limit) => ms < limit);
  return SPEED_BUCKETS[i < 0 ? SPEED_BUCKETS.length - 1 : i];
}

export type Counter = Feature | (typeof TASK_COUNTERS)[number] | SeenCounter | SpeedCounter;
export const COUNTERS: readonly Counter[] = [...FEATURES, ...TASK_COUNTERS, ...SEEN_COUNTERS, ...SPEED_COUNTERS];

/**
 * The app's version as it may be sent: digits and dots only ("1.4.0"), 19 characters at most, so
 * that no text can travel in it. The database keeps the same rule (`clean_version`).
 */
export const VERSION_PATTERN = /^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$/;
export const cleanVersion = (v: unknown): string => (typeof v === 'string' && VERSION_PATTERN.test(v) ? v : '');

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

/**
 * The version of "what is shared" the family must have agreed to for the counters and problems
 * (the database requires the same: `product_terms()`). 2: feature counters and technical
 * problems; 3: also what was seen, the app's version and the speed figures. A family that agreed
 * to an older list sends nothing until it agrees to this one.
 */
export const SHARE_TERMS = 3;

/** Did the family agree to today's list (`SHARE_TERMS`): feature counters, what was seen, versions, speed, technical problems? */
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
/**
 * Counted while a board is opening, before its counter is ready (its bar's buttons, the start-up
 * time): kept in memory for that moment, then handed to the counter, which checks the agreement.
 * Nothing waits when no board is opening (the preview, a professional's workspace).
 */
let waiting: { key: Counter; n: number }[] | null = null;

/** A board is opening: what is counted until its counter is ready waits for it (`setProductSink`). */
export function holdProduct(): void {
  if (!sink) waiting = [];
}

/** The open board's counter (or null when no board is open: what was waiting is dropped). */
export function setProductSink(s: ProductSink | null): void {
  sink = s;
  const held = waiting;
  waiting = null;
  if (s && held) for (const h of held) deliver(h.key, h.n);
}

function deliver(key: Counter, n: number): void {
  if (!sink) {
    if (waiting && waiting.length < 64) waiting.push({ key, n });
    return;
  }
  try {
    sink.count(key, n);
  } catch {
    /* counting never breaks the app */
  }
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
  if (n > 0) deliver(key, n);
}

/** "The way to this feature was on screen." Kept once a day at most (the counter keeps a 1). */
export function countSeen(feature: Feature): void {
  if (FEATURES.includes(feature)) deliver(`seen:${feature}`, 1);
}

/** "The person waited `ms` milliseconds" (start, sync or voice): only the step is kept. */
export function countSpeed(kind: Speed, ms: number): void {
  if (SPEEDS.includes(kind) && Number.isFinite(ms) && ms >= 0) deliver(`${kind}:${speedBucket(ms)}`, 1);
}

// ── Start-up time: from the app's start to its first board on screen ──

/** When this code started to run (in a browser, the page's own start is used instead). */
const loadedAt = Date.now();
let startDone = false;

/** Milliseconds since the app was opened: since the page started in a browser, since the app's code started on a tablet. */
export function sinceLaunch(now = Date.now()): number {
  const perf = (globalThis as { performance?: { timeOrigin?: number } }).performance;
  const web = typeof document !== 'undefined' && typeof perf?.timeOrigin === 'number' && perf.timeOrigin > 0;
  return Math.max(0, now - (web ? perf!.timeOrigin! : loadedAt));
}

/**
 * A screen that waits for a person came first (welcome, sign-in, set-up, a professional's
 * workspace): this launch's start-up is not measured, it would count the person's own time.
 */
export function startupWaited(): void {
  startDone = true;
}

/** The first board of this launch is on screen: the start-up time is counted, once. */
export function firstBoardShown(now = Date.now()): void {
  if (startDone) return;
  startDone = true;
  countSpeed('start', sinceLaunch(now));
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
