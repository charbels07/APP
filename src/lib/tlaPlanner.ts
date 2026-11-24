/**
 * Plans a TLA (and its steps) for a situation the family types (spec §20–21):
 *   1. the situation library (data/situations.ts) when the topic is recognised;
 *   2. otherwise an AI proposal, when available (see aiPlanner);
 *   3. otherwise suggestions from the library's categories.
 * Everything stays a proposal: the family removes, adds and edits before creating.
 */
import { situationWordKind } from '../data/situationKinds';
import { SITUATIONS, type Situation } from '../data/situations';
import type { Lang, WordClass } from '../model/types';
import { exactPicto, fuzzyPictos, keywordPicto, keywordWords, relatedPictos, searchPictos, suggestForTopic, type PreparedIndex } from './pictoSearch';
import { normalize } from './search';
import { levenshtein, wordForms } from './spelling';

export interface PlanItem {
  /** Pictogram id in the offline library. */
  id: number;
  /** Labels proposed by the AI (otherwise the library's keywords are used). */
  labels?: Partial<Record<Lang, string>>;
  cls?: WordClass;
  timerMin?: number;
}

export interface TlaPlan {
  anchor?: number;
  title?: Partial<Record<Lang, string>>;
  words: PlanItem[];
  steps: PlanItem[];
  source: 'library' | 'ai' | 'auto';
  situation?: string;
  /** The topic was a sentence: a picture for each of its words, then pictures related to them. */
  sentence?: boolean;
}

/**
 * A trigger stem matches a topic word: whole word if short, word start if 5+ letters. A long stem
 * also matches a word typed with one mistake ("pisine" is "piscine").
 */
const stemMatches = (stem: string, word: string) => {
  if (stem.length < 5) return word === stem;
  if (word.startsWith(stem)) return true;
  if (stem.length < 6 || word.length < 5 || word[0] !== stem[0]) return false;
  return levenshtein(stem, word, 1) <= 1 || levenshtein(stem, word.slice(0, stem.length), 1) <= 1;
};

/** The situation recognised in what was typed, with the words of the topic its trigger used. */
function matchSituationWords(topic: string): { situation: Situation; used: string[] } | undefined {
  const words = keywordWords(topic);
  let best: { situation: Situation; used: string[] } | undefined;
  let bestScore = 0;
  for (const s of SITUATIONS)
    for (const trig of s.triggers) {
      const stems = trig.map(normalize);
      if (!stems.every((st) => words.some((w) => stemMatches(st, w)))) continue;
      // More words in the trigger = more specific ("gâteau" + "préparer" beats "anniversaire").
      const score = stems.length * 100 + stems.join('').length;
      if (score > bestScore) {
        best = { situation: s, used: words.filter((w) => stems.some((st) => stemMatches(st, w))) };
        bestScore = score;
      }
    }
  return best;
}

export function matchSituation(topic: string): Situation | undefined {
  return matchSituationWords(topic)?.situation;
}

/**
 * Little words of a sentence that need no picture of their own (pronouns, articles, "is", "very"…;
 * the core words of every activity board already hold the useful ones).
 */
const FUNCTION_WORDS = new Set(
  (
    "je j tu il elle on nous vous ils elles me m te t se s lui leur leurs mon ma mes ton ta tes son sa ses notre nos votre vos " +
    'ce cet cette ces c ca qui que qu quoi dont ou y ne n pas plus tres bien tout tous toute toutes dans par chez vers sous ' +
    'entre comme mais donc car si alors puis de du des d la le les l un une et a au aux en pour avec sur ' +
    'est sont etait etaient suis es sommes etes as ai avons avez ont avait avaient va vais vas vont allons ' +
    'i you he she it we they him us them my your his her its our their is are was were be been am this that these those ' +
    'there here very not no do does did have has had will would can could at by from as so but or if then into up out over just ' +
    'the an of to and for with in on'
  ).split(' '),
);

/** The words of a topic that can have a picture ("Une souris verte" → souris, verte), in order. */
export function contentWords(topic: string): string[] {
  const out: string[] = [];
  for (const raw of normalize(topic).replace(/\b(qu|[jlmntsdc])'/g, '$1 ').split(/[\s'-]+/)) {
    const w = raw.trim();
    if (w.length < 2 || FUNCTION_WORDS.has(w) || /^\d+$/.test(w) || out.includes(w)) continue;
    out.push(w);
  }
  return out;
}

/**
 * The picture of one word of a sentence: the word itself, else its dictionary form ("verte" →
 * "vert", "courait" → "courir"), else a word that sounds like it (a spelling mistake).
 */
export function pictoForWord(index: PreparedIndex, word: string, lang: Lang): number | undefined {
  let best: { id: number; s: number } | undefined;
  wordForms(word).forEach((form, i) => {
    const hit = keywordPicto(index, form, lang);
    // The word as typed wins a tie with a form made from it.
    const s = hit ? hit.s - i * 3 : 0;
    if (hit && (!best || s > best.s)) best = { id: hit.id, s };
  });
  if (best) return best.id;
  return searchPictos(index, word, lang, 1)[0] ?? fuzzyPictos(index, word, lang, 1)[0];
}

/** How many related pictures each word of a sentence brings at most. */
const RELATED_PER_WORD = 6;

/**
 * A board for a sentence ("Une souris verte qui courait dans l'herbe"): first the picture of each
 * of its words, then, word after word in turn, pictures of the same situation as each one.
 */
export function planFromSentence(index: PreparedIndex, topic: string, lang: Lang, count = 16): TlaPlan {
  const direct: number[] = [];
  for (const w of contentWords(topic)) {
    const id = pictoForWord(index, w, lang);
    if (id !== undefined && !direct.includes(id)) direct.push(id);
  }
  const ids = direct.slice(0, count);
  const related = direct.map((id) => relatedPictos(index, [id], RELATED_PER_WORD));
  for (let round = 0; ids.length < count && related.some((r) => r.length > round); round++)
    for (const r of related) {
      const id = r[round];
      if (id !== undefined && !ids.includes(id) && ids.length < count) ids.push(id);
    }
  return { anchor: direct[0], words: ids.map((id) => ({ id })), steps: [], source: 'auto', sentence: true };
}

/**
 * The words of the sentence that the situation found does not cover yet ("à la piscine avec papa":
 * papa), added after the situation's own words.
 */
function withSentenceWords(index: PreparedIndex, plan: TlaPlan, topic: string, lang: Lang, used: string[]): TlaPlan {
  const covered = new Set(used);
  const extra: PlanItem[] = [];
  for (const w of contentWords(topic)) {
    if (covered.has(w) || keywordWords(w).some((x) => covered.has(x))) continue;
    const id = pictoForWord(index, w, lang);
    if (id === undefined || id === plan.anchor || plan.words.some((x) => x.id === id) || extra.some((x) => x.id === id)) continue;
    extra.push({ id });
  }
  return extra.length ? { ...plan, words: [...plan.words, ...extra] } : plan;
}

function dedupe(items: PlanItem[]): PlanItem[] {
  const seen = new Set<number>();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

/**
 * A situation word: « farine », or « moule#mulberry/cake_tin » to pin the pictogram (by its key
 * in the library) when the keyword alone picks the wrong meaning (« moule » is also the mussel).
 */
export function resolveSituationWord(index: PreparedIndex, entry: string): { label: string; id?: number } {
  const at = entry.indexOf('#');
  const label = at < 0 ? entry : entry.slice(0, at);
  const pinned = at < 0 ? undefined : index.byKey.get(entry.slice(at + 1));
  return { label, id: pinned ?? exactPicto(index, label) };
}

export function planFromLibrary(index: PreparedIndex, topic: string, lang: Lang): TlaPlan | undefined {
  const found = matchSituationWords(topic);
  if (!found) return undefined;
  const s = found.situation;
  // Keep the situation's own word as the French label ("fouet", even if the library files it under "batteur").
  const words: PlanItem[] = [];
  for (const w of s.words) {
    const { label, id } = resolveSituationWord(index, w);
    // The library knows which of its words are actions or describing words (the others are things).
    if (id !== undefined) words.push({ id, labels: { fr: label }, cls: situationWordKind(label) });
  }
  // Steps may repeat a pictogram (e.g. "douche" twice): keep the order as written.
  const steps: PlanItem[] = [];
  for (const st of s.steps ?? []) {
    const { w, timer } = typeof st === 'string' ? { w: st, timer: 0 } : st;
    const { label, id } = resolveSituationWord(index, w);
    if (id !== undefined) steps.push({ id, labels: { fr: label }, cls: situationWordKind(label), timerMin: timer || undefined });
  }
  const anchor = searchPictos(index, topic, lang, 1)[0] ?? words[0]?.id;
  const plan: TlaPlan = { anchor, words: dedupe(words), steps, source: 'library', situation: s.id };
  return withSentenceWords(index, plan, topic, lang, found.used);
}

export function planAutomatically(index: PreparedIndex, topic: string, lang: Lang): TlaPlan {
  // A sentence ("Une souris verte"): pictures for its words, not for the sentence as a whole.
  if (contentWords(topic).length >= 2) {
    const fromWords = planFromSentence(index, topic, lang);
    if (fromWords.words.length) return fromWords;
  }
  const r = suggestForTopic(index, topic, lang, 16);
  // Nothing of the same situation (a picture with only broad categories): the pictures found for
  // the word itself, so the board is never empty.
  const ids = r.ids.length ? r.ids : searchPictos(index, topic, lang, 12);
  return { anchor: r.anchor, words: ids.map((id) => ({ id })), steps: [], source: 'auto' };
}

/** What the AI returns (see aiPlanner): words and steps with labels in the three languages. */
export interface AiPlan {
  title?: Partial<Record<Lang, string>>;
  words?: { fr?: string; en?: string; ar?: string; type?: string }[];
  steps?: { fr?: string; en?: string; ar?: string }[];
}

const AI_TYPE: Record<string, WordClass> = {
  nom: 'noun',
  noun: 'noun',
  verbe: 'verb',
  verb: 'verb',
  adjectif: 'descriptor',
  adjective: 'descriptor',
  social: 'social',
};

/** Finds a pictogram for an AI word: exact French keyword, then best French, then English. */
function pictoFor(index: PreparedIndex, w: { fr?: string; en?: string }): number | undefined {
  if (w.fr) {
    const exact = exactPicto(index, w.fr);
    if (exact !== undefined && index.byId.get(exact)?.[4].some((k) => normalize(k) === normalize(w.fr!))) return exact;
  }
  return (w.fr ? searchPictos(index, w.fr, 'fr', 1)[0] : undefined) ?? (w.en ? searchPictos(index, w.en, 'en', 1)[0] : undefined);
}

export function planFromAi(index: PreparedIndex, topic: string, lang: Lang, ai: AiPlan): TlaPlan {
  const clean = (l: { fr?: string; en?: string; ar?: string }) => ({
    fr: l.fr?.trim() || undefined,
    en: l.en?.trim() || undefined,
    ar: l.ar?.trim() || undefined,
  });
  const words: PlanItem[] = [];
  for (const raw of (ai.words ?? []).slice(0, 24)) {
    const labels = clean(raw);
    const id = pictoFor(index, labels);
    if (id !== undefined) words.push({ id, labels, cls: AI_TYPE[(raw.type ?? '').toLowerCase()] });
  }
  const steps: PlanItem[] = [];
  for (const raw of (ai.steps ?? []).slice(0, 12)) {
    const labels = clean(raw);
    const id = pictoFor(index, labels);
    if (id !== undefined) steps.push({ id, labels });
  }
  const anchor = searchPictos(index, topic, lang, 1)[0] ?? words[0]?.id;
  return { anchor, title: ai.title ? clean(ai.title) : undefined, words: dedupe(words), steps, source: 'ai' };
}
