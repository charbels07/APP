/**
 * A damaged board must still open.
 *
 * A saved profile can come back with a part that is not what the app expects: a storage that
 * was cut while writing, an older or newer version of the app, a change by another member that
 * merged badly. The screens trust the shapes below; one wrong value made the whole board fail to
 * draw, and the child had no voice. These functions put a safe value where a part cannot be
 * read, and touch nothing that is sound: a word that is fine never moves and never changes.
 */
import { LANGS, type Board, type Cell, type Concept, type ConceptOverride, type Demo, type HelpConfig, type Lang, type MonthEvent, type PlanItem, type Profile, type Schedule, type Settings, type SymbolRef, type WordClass, type BinItem } from '../model/types';
import { intBetween, plain } from './safety';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/**
 * The id of a word, a board or a sequence: a text, and never the name of something every
 * JavaScript object already has ("toString", "valueOf"…): looked up in a dictionary, such a name
 * finds a function instead of nothing, and the screen that expected a word fails.
 */
export const idOk = (v: unknown): v is string => typeof v === 'string' && v !== '' && !(v in {});

export const WORD_CLASSES: WordClass[] = ['pronoun', 'people', 'verb', 'descriptor', 'noun', 'little', 'question', 'social', 'negation', 'folder'];
const isCls = (v: unknown): v is WordClass => WORD_CLASSES.includes(v as WordClass);

/** A card: a word (its id), or nothing. Anything else is an empty place. */
function cellOf(v: unknown): Cell | null {
  if (!isObj(v) || !idOk(v.concept)) return null;
  let c = v as unknown as Cell;
  const drop = (k: keyof Cell) => {
    if (c === (v as unknown)) c = { ...c };
    delete c[k];
  };
  if (v.folder !== undefined && !idOk(v.folder)) drop('folder');
  if (v.level !== undefined && v.level !== 1 && v.level !== 2 && v.level !== 3) drop('level');
  if (v.size !== undefined && !(num(v.size) && v.size > 0 && v.size <= 1)) drop('size');
  if (v.span !== undefined && !(Array.isArray(v.span) && v.span.length === 2 && v.span.every((n) => Number.isInteger(n) && n >= 1 && n <= 40))) drop('span');
  if (v.intensity !== undefined && !num(v.intensity)) drop('intensity');
  return c;
}

/** A board with its rows, columns and one place per slot; `null` when it cannot be read at all. */
export function boardOf(id: string, v: unknown): Board | null {
  if (!isObj(v) || !Array.isArray(v.cells)) return null;
  const b = v as unknown as Board;
  const rows = intBetween(b.rows, 1, 40, 1);
  const cols = intBetween(b.cols, 1, 40, 1);
  let cells = b.cells;
  let changed = false;
  const fixed = cells.map((c) => {
    if (c === null) return null;
    const ok = cellOf(c);
    if (ok !== c) changed = true;
    return ok;
  });
  if (changed) cells = fixed;
  // Fewer places than the grid has: the missing ones are empty (never fewer words than saved).
  if (cells.length < rows * cols) cells = [...cells, ...Array<null>(rows * cols - cells.length).fill(null)];
  const kind = b.kind === 'core' || b.kind === 'folder' || b.kind === 'tla' ? b.kind : id === 'core' ? 'core' : 'folder';
  const concept = str(b.concept) ? b.concept : '';
  if (cells === b.cells && rows === b.rows && cols === b.cols && kind === b.kind && concept === b.concept && b.id === id) return b;
  return { ...b, id, kind, concept, rows, cols, cells };
}

const labelsOf = (v: unknown): Partial<Record<Lang, string>> | undefined => {
  if (!isObj(v)) return undefined;
  if (Object.keys(v).every((k) => LANGS.includes(k as Lang) && str(v[k]))) return v as Partial<Record<Lang, string>>;
  const out: Partial<Record<Lang, string>> = {};
  for (const l of LANGS) if (str(v[l])) out[l] = v[l] as string;
  return out;
};

export function symbolOk(v: unknown): v is SymbolRef {
  if (!isObj(v)) return false;
  if (v.kind === 'picto') return str(v.key);
  if (v.kind === 'emoji') return str(v.value);
  if (v.kind === 'media') return str(v.name);
  return false;
}

const appOk = (v: unknown) => isObj(v) && str(v.url) && Array.isArray(v.triggers) && v.triggers.every(str);

/** A word made by the family: always a kind of word, a name in the three languages and a picture. */
function conceptOf(id: string, v: unknown): Concept | null {
  if (!isObj(v)) return null;
  const c = v as unknown as Concept;
  const given = labelsOf(v.labels) ?? {};
  const any = given.fr || given.en || given.ar || id;
  const labels = { fr: given.fr ?? any, en: given.en ?? any, ar: given.ar ?? any };
  const sound =
    c.id === id && isCls(c.cls) && isObj(v.labels) && LANGS.every((l) => str((v.labels as Obj)[l])) && str(c.emoji) &&
    (c.tags === undefined || (Array.isArray(c.tags) && c.tags.every(str))) && (c.labelsF === undefined || labelsOf(c.labelsF) === c.labelsF) && (c.app === undefined || appOk(c.app));
  if (sound) return c;
  const out: Concept = { ...c, id, cls: isCls(c.cls) ? c.cls : 'noun', labels, emoji: str(c.emoji) ? c.emoji : '⭐' };
  if (c.tags !== undefined) out.tags = Array.isArray(c.tags) ? c.tags.filter(str) : [];
  if (c.labelsF !== undefined) {
    const f = labelsOf(c.labelsF);
    if (f) out.labelsF = f;
    else delete out.labelsF;
  }
  if (c.app !== undefined && !appOk(c.app)) delete out.app;
  return out;
}

const DISPLAYS = ['both', 'image', 'text'];
/** What the family changed on a word: each part kept when it can be read, left out otherwise. */
function overrideOf(v: unknown): ConceptOverride | null {
  if (!isObj(v)) return null;
  const o = v as ConceptOverride;
  const bad: (keyof ConceptOverride)[] = [];
  if (o.labels !== undefined && labelsOf(o.labels) !== o.labels) bad.push('labels');
  if (o.symbol !== undefined && !symbolOk(o.symbol)) bad.push('symbol');
  if (o.audio !== undefined && labelsOf(o.audio) !== o.audio) bad.push('audio');
  if (o.display !== undefined && !DISPLAYS.includes(o.display)) bad.push('display');
  if (o.cls !== undefined && !isCls(o.cls)) bad.push('cls');
  if (o.app !== undefined && o.app !== false && !appOk(o.app)) bad.push('app');
  if (o.credit !== undefined && !str(o.credit)) bad.push('credit');
  if (!bad.length) return o;
  const out: ConceptOverride = { ...o };
  for (const k of bad) {
    const part = k === 'labels' || k === 'audio' ? labelsOf(o[k]) : undefined;
    if (part) out[k as 'labels'] = part;
    else delete out[k];
  }
  return out;
}

function scheduleOf(v: unknown): Schedule | null {
  if (!isObj(v) || !str(v.id)) return null;
  const s = v as unknown as Schedule;
  const steps = Array.isArray(s.steps) ? s.steps : [];
  const good = steps.filter((st) => isObj(st) && str(st.id) && idOk(st.concept));
  const tidy = good.map((st) => (typeof st.done === 'boolean' && (st.tla === undefined || idOk(st.tla)) && (st.timerMin === undefined || num(st.timerMin)) ? st : { id: st.id, concept: st.concept, done: st.done === true, ...(idOk(st.tla) ? { tla: st.tla } : {}), ...(num(st.timerMin) ? { timerMin: st.timerMin } : {}) }));
  const same = Array.isArray(s.steps) && tidy.length === steps.length && tidy.every((st, i) => st === steps[i]);
  if (same && str(s.title) && str(s.concept) && typeof s.recurring === 'boolean') return s;
  return { ...s, title: str(s.title) ? s.title : '', concept: str(s.concept) ? s.concept : '', recurring: s.recurring === true, steps: tidy };
}

/** A list where each item is kept, repaired or left out; the same list when nothing had to change. */
function listOf<T>(v: unknown, item: (x: unknown) => T | null, fallback: T[]): T[] {
  if (!Array.isArray(v)) return fallback;
  const out = v.map(item).filter((x): x is T => x !== null);
  return out.length === v.length && out.every((x, i) => x === v[i]) ? (v as T[]) : out;
}

/** A dictionary where each entry is kept, repaired or left out. */
function dictOf<T>(v: unknown, item: (id: string, x: unknown) => T | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!isObj(v)) return out;
  for (const [id, x] of Object.entries(plain(v))) {
    if (!idOk(id)) continue;
    const ok = item(id, x);
    if (ok !== null) out[id] = ok;
  }
  return out;
}

export const schedulesOf = (v: unknown, fallback: Schedule[]): Schedule[] => listOf(v, scheduleOf, fallback);
export const conceptsOf = (v: unknown): Record<string, Concept> => dictOf(v, conceptOf);
export const overridesOf = (v: unknown): Record<string, ConceptOverride> => dictOf(v, (_id, x) => overrideOf(x));

export function helpOf(v: unknown, base: HelpConfig): HelpConfig {
  if (!isObj(v)) return base;
  const h = v as unknown as HelpConfig;
  const m = isObj(h.message) ? (h.message as Obj) : {};
  const message = { fr: str(m.fr) ? m.fr : base.message.fr, en: str(m.en) ? m.en : base.message.en, ar: str(m.ar) ? m.ar : base.message.ar };
  return {
    ...base,
    ...h,
    message,
    options: Array.isArray(h.options) ? h.options.filter(idOk) : base.options,
    howICommunicate: str(h.howICommunicate) ? h.howICommunicate : '',
    emergencyContact: str(h.emergencyContact) ? h.emergencyContact : '',
  };
}

export const demosOf = (v: unknown): Demo[] =>
  listOf(v, (x) => (isObj(x) && str(x.id) && str(x.title) && LANGS.includes(x.lang as Lang) && Array.isArray(x.steps) && x.steps.every((s) => isObj(s) && str(s.kind)) ? (x as unknown as Demo) : null), []);

export function weekPlanOf(v: unknown): Record<string, PlanItem[]> {
  return dictOf(v, (_day, x) => listOf(x, (i) => (isObj(i) && str(i.id) && idOk(i.concept) ? (i as unknown as PlanItem) : null), []));
}
export function monthPlanOf(v: unknown): Record<string, MonthEvent> {
  return dictOf(v, (_id, x) => (isObj(x) && str(x.id) && str(x.date) && idOk(x.concept) ? (x as unknown as MonthEvent) : null));
}

export function binOf(v: unknown): BinItem[] | undefined {
  if (v === undefined) return undefined;
  const out = listOf<BinItem>(
    v,
    (x) => {
      if (!isObj(x) || !str(x.id) || !num(x.at)) return null;
      if (x.kind === 'cell') return str(x.board) && Number.isInteger(x.index) && cellOf(x.cell) === x.cell ? (x as unknown as BinItem) : null;
      if (x.kind === 'board') return isObj(x.board) && str((x.board as Obj).id) && boardOf((x.board as Obj).id as string, x.board) === (x.board as unknown) && num(x.tlaIndex) ? (x as unknown as BinItem) : null;
      return null;
    },
    [],
  );
  return out.length ? out : undefined;
}

export function guideOf(v: unknown): Profile['guide'] {
  if (!isObj(v)) return undefined;
  const g = v as NonNullable<Profile['guide']>;
  const out: NonNullable<Profile['guide']> = {};
  if (typeof g.seen === 'boolean') out.seen = g.seen;
  if (Array.isArray(g.read)) out.read = g.read.filter(str);
  if (typeof g.openOnStart === 'boolean') out.openOnStart = g.openOnStart;
  if (isObj(g.tailored)) out.tailored = { newToAac: g.tailored.newToAac === true, ...(str(g.tailored.speech) ? { speech: g.tailored.speech } : {}) };
  return out;
}

/** Choices that are one word of a list: a word the app does not know becomes the usual choice. */
const CHOICES: Partial<Record<keyof Settings, readonly unknown[]>> = {
  uiLang: ['fr', 'en', 'ar'],
  gender: ['m', 'f'],
  revealLevel: [1, 2, 3],
  wordPlaces: ['compact', 'final', undefined],
  voiceKind: ['device', 'f', 'm'],
  voiceAge: ['adult', 'child'],
  visual: ['standard', 'large', 'contrast'],
  pictoSize: ['normal', 'large'],
  access: ['release', 'press', 'hold'],
  touchPoint: ['lift', 'land', undefined],
  dataCollection: ['off', 'usage', 'vocabulary', 'language'],
  shareStats: ['none', 'anonymous'],
  arabic: ['none', 'lb', 'sy', 'jo', 'eg', 'sa', 'gulf', 'iq', 'msa'],
};

/**
 * The settings, each of the kind the screens expect (a switch is yes or no, a speed is a number,
 * a choice is one of its list): one that is not gets the usual value, the others are untouched.
 */
export function settingsOf(v: unknown, defaults: Settings): Record<string, unknown> {
  const given = isObj(v) ? plain(v) : {};
  const d = defaults as unknown as Obj;
  const out: Obj = { ...given };
  for (const k of Object.keys(given)) {
    const val = given[k];
    const choices = CHOICES[k as keyof Settings];
    if (choices) {
      if (!choices.includes(val)) delete out[k];
      continue;
    }
    if (!(k in d) || d[k] === undefined || val === undefined) continue;
    const want = d[k];
    const ok = Array.isArray(want) ? Array.isArray(val) : isObj(want) ? isObj(val) : typeof val === typeof want && (typeof val !== 'number' || Number.isFinite(val));
    if (!ok) delete out[k];
  }
  if (out.pin !== undefined && !(str(out.pin) && /^\d{4}$/.test(out.pin))) delete out.pin;
  for (const k of ['shareTerms', 'voicePitch']) if (out[k] !== undefined && !num(out[k])) delete out[k];
  if (out.dialectVoice !== undefined && typeof out.dialectVoice !== 'boolean') delete out.dialectVoice;
  if (out.langs !== undefined) {
    const langs = (out.langs as unknown[]).filter((l): l is Lang => LANGS.includes(l as Lang));
    if (!langs.length) delete out.langs;
    else if (langs.length !== (out.langs as unknown[]).length) out.langs = langs;
  }
  if (isObj(out.voices) && !Object.values(out.voices).every(str)) out.voices = Object.fromEntries(Object.entries(out.voices).filter(([, x]) => str(x)));
  if (isObj(out.timer)) {
    const t = out.timer;
    const shows = ['circle', 'bar', 'digits'];
    if (t.display !== undefined && !(Array.isArray(t.display) && t.display.every((x) => shows.includes(x as string)))) {
      out.timer = { ...t, display: Array.isArray(t.display) ? t.display.filter((x) => shows.includes(x as string)) : (d.timer as Obj).display };
    }
    if (t.sound !== undefined && typeof t.sound !== 'boolean') out.timer = { ...(out.timer as Obj), sound: (d.timer as Obj).sound };
  }
  for (const k of ['bar', 'plans'] as const) {
    if (!isObj(out[k])) continue;
    const o = out[k] as Obj;
    if (!Object.values(o).every((x) => typeof x === 'boolean')) out[k] = Object.fromEntries(Object.entries(o).filter(([, x]) => typeof x === 'boolean'));
  }
  return out;
}
