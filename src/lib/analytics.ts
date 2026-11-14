/**
 * The "Suivi" numbers: turns the recorded days (UsageDay, one per device and day) and the adults'
 * observations into the four domains of the specification:
 *  1. general use of the app,   2. vocabulary used,
 *  3. language development (sentences, only with 'language' consent),
 *  4. communicative functions (automatic guess from the sentences + adults' observations).
 * Pure functions, no screen: the dashboard, the CSV export and the tests share them.
 */
import type { CommFunction, Observation, UsageDay, UtteranceSample } from '../backend/types';
import { TLA_CORE } from '../data/defaults';
import type { Profile, WordClass } from '../model/types';
import { getConcept, wordClass } from './lexicon';
import { csvSafe } from './safety';

// ── Period ──────────────────────────────────────────────────

/** Days, inclusive, as 'YYYY-MM-DD' (the device's local day). */
export interface Period {
  from: string;
  to: string;
}

const two = (n: number) => String(n).padStart(2, '0');
export const dayKey = (d: Date) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
const parseDay = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** The last `n` days, today included. */
export function lastDays(n: number, today = new Date()): Period {
  const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (n - 1));
  return { from: dayKey(from), to: dayKey(today) };
}

/** Every day of the period, in order. */
export function daysOf(p: Period): string[] {
  const out: string[] = [];
  const end = parseDay(p.to).getTime();
  for (let d = parseDay(p.from); d.getTime() <= end; d.setDate(d.getDate() + 1)) out.push(dayKey(d));
  return out;
}

export const inPeriod = (day: string, p: Period) => day >= p.from && day <= p.to;

// ── Domain 1: general use ───────────────────────────────────

export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
/** Morning 6–11 h, midday 11–14 h, afternoon 14–18 h, evening 18–22 h, night 22–6 h. */
export const timeOfDay = (hour: number): TimeOfDay =>
  hour >= 6 && hour < 11 ? 'morning' : hour < 14 && hour >= 11 ? 'midday' : hour >= 14 && hour < 18 ? 'afternoon' : hour >= 18 && hour < 22 ? 'evening' : 'night';

export type PageKind = 'core' | 'folder' | 'tla' | 'schedule' | 'keyboard' | 'other';

export interface PageUse {
  page: string;
  kind: PageKind;
  opens: number;
  minutes: number;
}

export interface DayPoint {
  day: string;
  sessions: number;
  selections: number;
  utterances: number;
  activeMinutes: number;
}

export interface UsageSummary {
  periodDays: number;
  daysUsed: number;
  sessions: number;
  sessionsPerDay: number;
  sessionsPerWeek: number;
  /** From the first touch to the last of each session. */
  avgSessionMinutes: number;
  activeMinutes: number;
  selections: number;
  utterances: number;
  hours: number[];
  timeOfDay: Record<TimeOfDay, number>;
  /** Day by day (also the days without use), for the chart. */
  perDay: DayPoint[];
  pages: PageUse[];
  tla: { opens: number; minutes: number; created: number };
  modes: UsageDay['modes'];
  devices: { deviceId: string; platform: string; days: number; selections: number }[];
  /** Inactivity: days without use, the longest run of them, and the usual pause between sessions. */
  inactivity: { daysWithout: number; longestBreakDays: number; avgPauseMinutes: number };
  offlineMinutes: number;
  errors: number;
  timeZone?: string;
}

const MIN = 60 * 1000;
const round1 = (n: number) => Math.round(n * 10) / 10;

export function pageKind(profile: Profile, page: string): PageKind {
  if (page === 'schedule' || page === 'keyboard') return page;
  const kind = profile.boards[page]?.kind;
  return kind === 'core' || kind === 'folder' || kind === 'tla' ? kind : 'other';
}

export function usageSummary(all: UsageDay[], profile: Profile, period: Period): UsageSummary {
  const days = all.filter((d) => inPeriod(d.day, period));
  const calendar = daysOf(period);
  const per = new Map<string, DayPoint>(calendar.map((day) => [day, { day, sessions: 0, selections: 0, utterances: 0, activeMinutes: 0 }]));
  const hours = Array.from({ length: 24 }, () => 0);
  const modes: UsageDay['modes'] = { core: 0, folder: 0, tla: 0, quick: 0, schedule: 0, keyboard: 0 };
  const pages = new Map<string, { opens: number; ms: number }>();
  const devices = new Map<string, { deviceId: string; platform: string; days: Set<string>; selections: number }>();
  let sessions = 0;
  let sessionMs = 0;
  let activeMs = 0;
  let selections = 0;
  let utterances = 0;
  let tlaCreated = 0;
  let offlineMs = 0;
  let errors = 0;
  const pauses: number[] = [];

  for (const d of days) {
    const p = per.get(d.day);
    const active = d.sessions.reduce((s, x) => s + x.activeMs, 0);
    if (p) {
      p.sessions += d.sessions.length;
      p.selections += d.selections;
      p.utterances += d.utterances;
      p.activeMinutes = round1(p.activeMinutes + active / MIN);
    }
    sessions += d.sessions.length;
    sessionMs += d.sessions.reduce((s, x) => s + (x.end - x.start), 0);
    activeMs += active;
    selections += d.selections;
    utterances += d.utterances;
    tlaCreated += d.tlaCreated;
    offlineMs += d.offlineMs;
    errors += d.errors;
    d.hours.forEach((n, h) => (hours[h] += n));
    for (const k of Object.keys(modes) as (keyof typeof modes)[]) modes[k] += d.modes[k] ?? 0;
    for (const [page, v] of Object.entries(d.pages)) {
      const x = pages.get(page) ?? { opens: 0, ms: 0 };
      x.opens += v.opens;
      x.ms += v.ms;
      pages.set(page, x);
    }
    const dev = devices.get(d.deviceId) ?? { deviceId: d.deviceId, platform: d.platform, days: new Set<string>(), selections: 0 };
    dev.days.add(d.day);
    dev.selections += d.selections;
    devices.set(d.deviceId, dev);
    const sorted = [...d.sessions].sort((a, b) => a.start - b.start);
    for (let i = 1; i < sorted.length; i++) pauses.push(sorted[i].start - sorted[i - 1].end);
  }

  const used = calendar.filter((day) => {
    const p = per.get(day)!;
    return p.sessions > 0 || p.selections > 0;
  });
  let longest = 0;
  let run = 0;
  // Breaks counted only after the first day of use (before it the app may not have been there yet).
  const firstUse = used[0];
  for (const day of calendar) {
    if (!firstUse || day < firstUse) continue;
    const p = per.get(day)!;
    run = p.sessions > 0 || p.selections > 0 ? 0 : run + 1;
    longest = Math.max(longest, run);
  }
  const pageList: PageUse[] = [...pages.entries()]
    .map(([page, v]) => ({ page, kind: pageKind(profile, page), opens: v.opens, minutes: round1(v.ms / MIN) }))
    .sort((a, b) => b.opens - a.opens || b.minutes - a.minutes);
  const tlaPages = pageList.filter((p) => p.kind === 'tla');
  const tod: Record<TimeOfDay, number> = { morning: 0, midday: 0, afternoon: 0, evening: 0, night: 0 };
  hours.forEach((n, h) => (tod[timeOfDay(h)] += n));

  return {
    periodDays: calendar.length,
    daysUsed: used.length,
    sessions,
    sessionsPerDay: used.length ? round1(sessions / used.length) : 0,
    sessionsPerWeek: calendar.length ? round1((sessions / calendar.length) * 7) : 0,
    avgSessionMinutes: sessions ? round1(sessionMs / sessions / MIN) : 0,
    activeMinutes: round1(activeMs / MIN),
    selections,
    utterances,
    hours,
    timeOfDay: tod,
    perDay: calendar.map((d) => per.get(d)!),
    pages: pageList,
    tla: {
      opens: tlaPages.reduce((s, p) => s + p.opens, 0),
      minutes: round1(tlaPages.reduce((s, p) => s + p.minutes, 0)),
      created: tlaCreated,
    },
    modes,
    devices: [...devices.values()]
      .map((d) => ({ deviceId: d.deviceId, platform: d.platform, days: d.days.size, selections: d.selections }))
      .sort((a, b) => b.selections - a.selections),
    inactivity: {
      daysWithout: firstUse ? calendar.filter((d) => d >= firstUse).length - used.length : 0,
      longestBreakDays: longest,
      avgPauseMinutes: pauses.length ? round1(pauses.reduce((s, x) => s + x, 0) / pauses.length / MIN) : 0,
    },
    offlineMinutes: round1(offlineMs / MIN),
    errors,
    timeZone: days[days.length - 1]?.timeZone,
  };
}

// ── Domain 2: vocabulary ────────────────────────────────────

export interface WordCount {
  concept: string;
  count: number;
}

export interface VocabularySummary {
  /** Words are known only for days recorded at 'vocabulary' level or above. */
  available: boolean;
  distinct: number;
  top: WordCount[];
  /** First time seen in the recorded data falls inside the period. */
  newWords: { concept: string; day: string }[];
  /** True when there were recorded days before the period (so "new" means new). */
  hasBaseline: boolean;
  /** Used on at least two different days of the period. */
  reused: { concept: string; days: number }[];
  /** Selections of the core words (main board + fixed block of activity boards) vs the others. */
  core: number;
  specific: number;
  byClass: Partial<Record<WordClass, number>>;
  /** Words the family or professionals added. */
  personal: WordCount[];
  searches: number;
  searched: WordCount[];
}

const sortCounts = (m: Map<string, number>): WordCount[] =>
  [...m.entries()].map(([concept, count]) => ({ concept, count })).sort((a, b) => b.count - a.count || a.concept.localeCompare(b.concept));

/** Concepts of the main board(s) and the core block every activity board starts with. */
export function coreWords(profile: Profile): Set<string> {
  const set = new Set<string>(TLA_CORE.flat());
  for (const b of Object.values(profile.boards)) {
    if (b.kind !== 'core') continue;
    for (const c of b.cells) if (c && !c.folder) set.add(c.concept);
  }
  return set;
}

export function vocabularySummary(all: UsageDay[], profile: Profile, period: Period): VocabularySummary {
  const days = all.filter((d) => inPeriod(d.day, period));
  const counts = new Map<string, number>();
  const daysUsed = new Map<string, Set<string>>();
  const firstSeen = new Map<string, string>();
  const searched = new Map<string, number>();
  let searches = 0;
  let available = false;
  for (const d of all) {
    for (const c of Object.keys(d.concepts ?? {})) {
      const f = firstSeen.get(c);
      if (!f || d.day < f) firstSeen.set(c, d.day);
    }
  }
  for (const d of days) {
    searches += d.searches;
    if (d.concepts) available = true;
    for (const [c, n] of Object.entries(d.concepts ?? {})) {
      counts.set(c, (counts.get(c) ?? 0) + n);
      const s = daysUsed.get(c) ?? new Set<string>();
      s.add(d.day);
      daysUsed.set(c, s);
    }
    for (const [c, n] of Object.entries(d.searched ?? {})) searched.set(c, (searched.get(c) ?? 0) + n);
  }
  const core = coreWords(profile);
  const byClass: Partial<Record<WordClass, number>> = {};
  let coreN = 0;
  let specific = 0;
  const personal = new Map<string, number>();
  for (const [c, n] of counts) {
    if (core.has(c)) coreN += n;
    else specific += n;
    const cls = wordClass(profile, c);
    byClass[cls] = (byClass[cls] ?? 0) + n;
    if (getConcept(profile, c)?.custom) personal.set(c, n);
  }
  const hasBaseline = all.some((d) => d.day < period.from && d.concepts);
  return {
    available,
    distinct: available ? counts.size : Math.max(0, ...days.map((d) => d.stats.distinctConcepts)),
    top: sortCounts(counts),
    newWords: [...firstSeen.entries()]
      .filter(([c, day]) => inPeriod(day, period) && counts.has(c))
      .map(([concept, day]) => ({ concept, day }))
      .sort((a, b) => b.day.localeCompare(a.day) || a.concept.localeCompare(b.concept)),
    hasBaseline,
    reused: [...daysUsed.entries()]
      .filter(([, s]) => s.size >= 2)
      .map(([concept, s]) => ({ concept, days: s.size }))
      .sort((a, b) => b.days - a.days || a.concept.localeCompare(b.concept)),
    core: coreN,
    specific,
    byClass,
    personal: sortCounts(personal),
    searches,
    searched: sortCounts(searched),
  };
}

/** The most chosen words of a folder (for the long press "peek"), from the recorded days. */
export function topInFolder(all: UsageDay[], concepts: string[], n = 6): string[] {
  const inFolder = new Set(concepts);
  const m = new Map<string, number>();
  for (const d of all) for (const [c, k] of Object.entries(d.concepts ?? {})) if (inFolder.has(c)) m.set(c, (m.get(c) ?? 0) + k);
  return sortCounts(m)
    .slice(0, n)
    .map((w) => w.concept);
}

// ── Domain 3: language development (sentences) ──────────────

export type Relation = 'agentAction' | 'actionObject' | 'possession' | 'location' | 'attribute' | 'recurrence' | 'negation';
export type Structure = 'pronounVerb' | 'verbVerb' | 'verbNoun' | 'pronounVerbNoun';
export type Feature = 'pronoun' | 'verb' | 'negation' | 'question' | 'connector' | 'narrative';

export interface Example {
  t: number;
  tokens: UtteranceSample['tokens'];
}

export interface LanguageSummary {
  /** Sentences recorded with 'language' consent in the period. */
  samples: number;
  /** Lengths come from every recorded sentence (also at the 'usage' level, numbers only). */
  utterances: number;
  len1: number;
  len2: number;
  len3plus: number;
  /** Mean length of utterance, in words/pictures. */
  mlu: number;
  longest: number;
  /** Different combinations of two words or more. */
  combinations: number;
  topCombinations: { words: string[]; count: number }[];
  relations: Record<Relation, number>;
  structures: Record<Structure, number>;
  /** Number of sentences with each feature, which words, and recent examples. */
  features: Record<Feature, { count: number; words: WordCount[]; examples: Example[] }>;
}

const LOCATION = new Set(['in', 'on', 'here', 'there', 'up', 'down', 'outside']);
const CONNECTORS = new Set(['and', 'but', 'because', 'after', 'then', 'before', 'first', 'with']);
const NARRATIVE = new Set(['yesterday', 'before', 'then', 'after', 'first', 'today', 'tomorrow', 'later']);
const NEGATION = new Set(['not', 'no', 'stop', 'dont_like', 'dont_know', 'disagree', 'dont_understand']);
const MODALS = new Set(['want', 'can', 'like', 'go', 'finish', 'stop_v']);
const QUESTION_SOCIAL = new Set(['is_it_done', 'how_long', 'and_you']);
const PLACE_NOUNS = new Set(['home', 'school', 'park', 'toilet', 'bedroom', 'kitchen', 'car', 'shop', 'hospital', 'beach', 'pool', 'restaurant', 'outside', 'waiting_room']);

type Tok = { id?: string; cls: WordClass | 'text' };
function toks(profile: Profile, tokens: UtteranceSample['tokens']): Tok[] {
  return tokens.map((t) => (t.c ? { id: t.c, cls: wordClass(profile, t.c) } : { cls: 'text' }));
}
const isPerson = (t: Tok) => t.cls === 'pronoun' || t.cls === 'people';
const isNoun = (t: Tok) => t.cls === 'noun' || t.cls === 'text';

/** Which semantic relations a sentence shows (simple word-order rules, a guide for the therapist). */
export function relationsOf(profile: Profile, tokens: UtteranceSample['tokens']): Relation[] {
  const ts = toks(profile, tokens);
  const out = new Set<Relation>();
  const verbAt = ts.findIndex((t) => t.cls === 'verb');
  const hasVerb = verbAt >= 0;
  for (let i = 0; i < ts.length; i++) {
    const t = ts[i];
    const next = ts[i + 1];
    if (isPerson(t) && hasVerb && verbAt > i) out.add('agentAction');
    if (t.cls === 'verb' && ts.slice(i + 1).some((x) => isNoun(x) || x.cls === 'people')) out.add('actionObject');
    if (!hasVerb && isPerson(t) && next && isNoun(next)) out.add('possession');
    if ((t.id && LOCATION.has(t.id)) || (t.id && PLACE_NOUNS.has(t.id) && hasVerb)) out.add('location');
    if (t.cls === 'descriptor' && ts.some((x) => isNoun(x))) out.add('attribute');
    if (t.id === 'more' && ts.length > 1) out.add('recurrence');
    if (t.id && NEGATION.has(t.id)) out.add('negation');
  }
  return [...out];
}

function structuresOf(profile: Profile, tokens: UtteranceSample['tokens']): Structure[] {
  const ts = toks(profile, tokens);
  const out = new Set<Structure>();
  for (let i = 0; i < ts.length - 1; i++) {
    const a = ts[i];
    const b = ts[i + 1];
    if (isPerson(a) && b.cls === 'verb') {
      out.add('pronounVerb');
      if (ts.slice(i + 2).some(isNoun)) out.add('pronounVerbNoun');
    }
    if (a.cls === 'verb' && b.cls === 'verb' && a.id && MODALS.has(a.id)) out.add('verbVerb');
    if (a.cls === 'verb' && isNoun(b)) out.add('verbNoun');
  }
  return [...out];
}

function featuresOf(profile: Profile, tokens: UtteranceSample['tokens']): Map<Feature, string[]> {
  const out = new Map<Feature, string[]>();
  const add = (f: Feature, w: string) => out.set(f, [...(out.get(f) ?? []), w]);
  for (const t of tokens) {
    if (!t.c) continue;
    const cls = wordClass(profile, t.c);
    if (cls === 'pronoun') add('pronoun', t.c);
    if (cls === 'verb') add('verb', t.c);
    if (NEGATION.has(t.c) || cls === 'negation') add('negation', t.c);
    if (cls === 'question' || QUESTION_SOCIAL.has(t.c)) add('question', t.c);
    if (CONNECTORS.has(t.c)) add('connector', t.c);
    if (NARRATIVE.has(t.c)) add('narrative', t.c);
  }
  return out;
}

const EXAMPLES = 5;

export function languageSummary(all: UsageDay[], profile: Profile, period: Period): LanguageSummary {
  const days = all.filter((d) => inPeriod(d.day, period));
  const samples = days.flatMap((d) => d.samples ?? []).sort((a, b) => a.t - b.t);
  let utterances = 0;
  let tokens = 0;
  let len1 = 0;
  let len2 = 0;
  let len3plus = 0;
  for (const d of days) {
    utterances += d.utterances;
    tokens += d.stats.tokens;
    len1 += d.stats.len1;
    len2 += d.stats.len2;
    len3plus += d.stats.len3plus;
  }
  const combos = new Map<string, number>();
  const relations: Record<Relation, number> = { agentAction: 0, actionObject: 0, possession: 0, location: 0, attribute: 0, recurrence: 0, negation: 0 };
  const structures: Record<Structure, number> = { pronounVerb: 0, verbVerb: 0, verbNoun: 0, pronounVerbNoun: 0 };
  const feat = {} as LanguageSummary['features'];
  const words = {} as Record<Feature, Map<string, number>>;
  for (const f of ['pronoun', 'verb', 'negation', 'question', 'connector', 'narrative'] as Feature[]) {
    feat[f] = { count: 0, words: [], examples: [] };
    words[f] = new Map();
  }
  let longest = 0;
  for (const s of samples) {
    longest = Math.max(longest, s.tokens.length);
    if (s.tokens.length >= 2) {
      const key = s.tokens.map((t) => t.c ?? `"${(t.text ?? '').toLowerCase()}"`).join(' ');
      combos.set(key, (combos.get(key) ?? 0) + 1);
    }
    for (const r of relationsOf(profile, s.tokens)) relations[r]++;
    for (const st of structuresOf(profile, s.tokens)) structures[st]++;
    for (const [f, ws] of featuresOf(profile, s.tokens)) {
      feat[f].count++;
      for (const w of ws) words[f].set(w, (words[f].get(w) ?? 0) + 1);
      feat[f].examples.push({ t: s.t, tokens: s.tokens });
      if (feat[f].examples.length > EXAMPLES) feat[f].examples.shift();
    }
  }
  for (const f of Object.keys(feat) as Feature[]) {
    feat[f].words = sortCounts(words[f]);
    feat[f].examples.reverse();
  }
  return {
    samples: samples.length,
    utterances,
    len1,
    len2,
    len3plus,
    mlu: utterances ? Math.round((tokens / utterances) * 100) / 100 : 0,
    longest,
    combinations: combos.size,
    topCombinations: [...combos.entries()]
      .map(([k, count]) => ({ words: k.split(' '), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    relations,
    structures,
    features: feat,
  };
}

// ── Domain 4: communicative functions ───────────────────────

export const FUNCTIONS: CommFunction[] = [
  'request_object', 'request_action', 'request_help', 'request_break', 'request_info',
  'refuse', 'preference', 'comment', 'share_info', 'answer', 'greet', 'attention',
  'emotion', 'pain', 'opinion', 'narrate', 'repair', 'humour', 'self_determination',
];

const has = (ids: string[], ...w: string[]) => w.some((x) => ids.includes(x));
const EMOTIONS = ['happy', 'sad', 'angry', 'scared', 'tired', 'calm', 'surprised', 'bored', 'shy', 'im_scared'];
const REQUEST_VERBS = new Set(['want', 'give', 'take', 'have']);

/**
 * Best guess of what a sentence is for, from its words (the first rule that matches).
 * An adult's observation of the same moment always wins over this guess.
 */
export function classifyUtterance(profile: Profile, tokens: UtteranceSample['tokens']): CommFunction | null {
  const ids = tokens.flatMap((t) => (t.c ? [t.c] : []));
  const ts = toks(profile, tokens);
  if (!ts.length) return null;
  const only = ts.length === 1 ? ids[0] : undefined;
  const hasNoun = ts.some(isNoun);
  const verbs = ts.filter((t) => t.cls === 'verb').map((t) => t.id!);
  if (has(ids, 'it_hurts', 'sick')) return 'pain';
  if (has(ids, 'help_me') || (has(ids, 'help') && !has(ids, 'you'))) return 'request_help';
  if (has(ids, 'need_break', 'want_leave') || (verbs.includes('want') && has(ids, 'stop_v', 'finish'))) return 'request_break';
  if (has(ids, 'not_that', 'repeat', 'dont_understand', 'i_meant')) return 'repair';
  if (has(ids, 'joking')) return 'humour';
  if (has(ids, 'leave_me', 'my_turn')) return 'self_determination';
  if (has(ids, 'agree', 'disagree')) return 'opinion';
  if (ts.some((t) => t.cls === 'question') || has(ids, 'is_it_done', 'how_long')) return 'request_info';
  if (has(ids, 'no', 'stop', 'not')) {
    if (has(ids, 'like', 'i_like_it')) return 'preference';
    return 'refuse';
  }
  if (has(ids, 'dont_like', 'i_like_it') || verbs.includes('like')) return 'preference';
  if (has(ids, 'hello', 'bye', 'thanks', 'please', 'your_turn', 'and_you') && ts.length <= 2 && !hasNoun) return 'greet';
  if (has(ids, 'look_at') || (only === 'look')) return 'attention';
  if (has(ids, ...EMOTIONS)) return 'emotion';
  if (has(ids, 'yes', 'maybe', 'dont_know', 'me_too') && ts.length <= 2) return 'answer';
  if (has(ids, 'yesterday') || (has(ids, 'then', 'before', 'first') && verbs.length > 0 && !verbs.includes('want'))) return 'narrate';
  if (verbs.includes('want') || has(ids, 'please', 'more', 'hungry', 'thirsty')) {
    const wanted = ts.slice(ts.findIndex((t) => t.id === 'want') + 1);
    if (wanted.some((t) => t.cls === 'verb')) return 'request_action';
    return 'request_object';
  }
  if (has(ids, 'funny', 'bravo', 'yummy', 'good', 'bad', 'big', 'small', 'hot', 'cold', 'broken', 'done')) return 'comment';
  if (verbs.length && !verbs.every((v) => REQUEST_VERBS.has(v)) && ts.some(isPerson) && ts[0] && isPerson(ts[0]) && ids[0] !== 'you') return 'share_info';
  if (verbs.length) return 'request_action';
  if (hasNoun) return ts.length === 1 ? 'request_object' : 'comment';
  if (has(ids, 'hello', 'bye', 'thanks')) return 'greet';
  return null;
}

export interface FunctionRow {
  fn: CommFunction;
  /** Sentences the app recognised (without an adult's note on them). */
  detected: number;
  /** Adults' observations. */
  observed: number;
  autonomy: { spontaneous: number; prompted: number; modelled: number };
  contexts: WordCount[];
  partners: WordCount[];
  results: WordCount[];
  examples: string[];
}

export interface FunctionsSummary {
  rows: FunctionRow[];
  /** Functions used at least once (diversity). */
  diversity: number;
  detected: number;
  observed: number;
}

const countText = (m: Map<string, number>, s?: string) => {
  const k = s?.trim();
  if (k) m.set(k, (m.get(k) ?? 0) + 1);
};
const textCounts = (m: Map<string, number>): WordCount[] => sortCounts(m);

/** Words of a sentence in the chosen language. */
export function sentenceText(tokens: UtteranceSample['tokens'], label: (id: string) => string): string {
  return tokens.map((t) => (t.c ? label(t.c) : t.text ?? '')).join(' ');
}

export function functionsSummary(
  all: UsageDay[],
  observations: Observation[],
  profile: Profile,
  period: Period,
  label: (id: string) => string = (id) => id,
): FunctionsSummary {
  const fromT = parseDay(period.from).getTime();
  const toT = parseDay(period.to).getTime() + 24 * 3600 * 1000;
  const obs = observations.filter((o) => o.at >= fromT && o.at < toT);
  const noted = new Set(obs.filter((o) => o.sampleT != null).map((o) => o.sampleT));
  const rows = new Map<CommFunction, FunctionRow & { _c: Map<string, number>; _p: Map<string, number>; _r: Map<string, number> }>();
  const row = (fn: CommFunction) => {
    let r = rows.get(fn);
    if (!r) {
      r = { fn, detected: 0, observed: 0, autonomy: { spontaneous: 0, prompted: 0, modelled: 0 }, contexts: [], partners: [], results: [], examples: [], _c: new Map(), _p: new Map(), _r: new Map() };
      rows.set(fn, r);
    }
    return r;
  };
  let detected = 0;
  for (const d of all) {
    if (!inPeriod(d.day, period)) continue;
    for (const s of d.samples ?? []) {
      if (noted.has(s.t)) continue;
      const fn = classifyUtterance(profile, s.tokens);
      if (!fn) continue;
      const r = row(fn);
      r.detected++;
      detected++;
      if (r.examples.length < 3) r.examples.push(sentenceText(s.tokens, label));
    }
  }
  for (const o of obs) {
    if (!o.function) continue;
    const r = row(o.function);
    r.observed++;
    if (o.autonomy) r.autonomy[o.autonomy]++;
    countText(r._c, o.context);
    countText(r._p, o.partner);
    countText(r._r, o.result);
    if (o.utterance && r.examples.length < 3) r.examples.push(o.utterance);
  }
  const out: FunctionRow[] = FUNCTIONS.filter((f) => rows.has(f)).map((f) => {
    const { _c, _p, _r, ...r } = rows.get(f)!;
    return { ...r, contexts: textCounts(_c), partners: textCounts(_p), results: textCounts(_r) };
  });
  return {
    rows: out.sort((a, b) => b.detected + b.observed - (a.detected + a.observed)),
    diversity: out.length,
    detected,
    observed: obs.filter((o) => o.function).length,
  };
}

// ── Export ──────────────────────────────────────────────────

const csvCell = (v: unknown) => {
  const s = typeof v === 'string' ? csvSafe(v) : v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(',')).join('\n');
