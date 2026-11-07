/**
 * Plans a TLA (and its steps) for a situation the family types (spec §20–21):
 *   1. the situation library (data/situations.ts) when the topic is recognised;
 *   2. otherwise an AI proposal, when available (see aiPlanner);
 *   3. otherwise suggestions from ARASAAC categories.
 * Everything stays a proposal: the family removes, adds and edits before creating.
 */
import { SITUATIONS, type Situation } from '../data/situations';
import type { Lang, WordClass } from '../model/types';
import { exactPicto, keywordWords, searchPictos, suggestForTopic, type PreparedIndex } from './pictoSearch';
import { normalize } from './search';

export interface PlanItem {
  /** ARASAAC pictogram id. */
  id: number;
  /** Labels proposed by the AI (otherwise ARASAAC keywords are used). */
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
}

/** A trigger stem matches a topic word: whole word if short, word start if 5+ letters. */
const stemMatches = (stem: string, word: string) => (stem.length >= 5 ? word.startsWith(stem) : word === stem);

export function matchSituation(topic: string): Situation | undefined {
  const words = keywordWords(topic);
  let best: Situation | undefined;
  let bestScore = 0;
  for (const s of SITUATIONS)
    for (const trig of s.triggers) {
      const stems = trig.map(normalize);
      if (!stems.every((st) => words.some((w) => stemMatches(st, w)))) continue;
      // More words in the trigger = more specific ("gâteau" + "préparer" beats "anniversaire").
      const score = stems.length * 100 + stems.join('').length;
      if (score > bestScore) {
        best = s;
        bestScore = score;
      }
    }
  return best;
}

function dedupe(items: PlanItem[]): PlanItem[] {
  const seen = new Set<number>();
  return items.filter((it) => (seen.has(it.id) ? false : (seen.add(it.id), true)));
}

/**
 * A situation word: « farine », or « moule#15459 » to pin the pictogram when the
 * keyword alone picks the wrong meaning (« moule » is also the mussel).
 */
export function resolveSituationWord(index: PreparedIndex, entry: string): { label: string; id?: number } {
  const [label, pinned] = entry.split('#');
  const pin = Number(pinned);
  if (pinned && index.byId.has(pin)) return { label, id: pin };
  return { label, id: exactPicto(index, label) };
}

export function planFromLibrary(index: PreparedIndex, topic: string, lang: Lang): TlaPlan | undefined {
  const s = matchSituation(topic);
  if (!s) return undefined;
  // Keep the situation's own word as the French label ("fouet", even if ARASAAC files it under "batteur").
  const words: PlanItem[] = [];
  for (const w of s.words) {
    const { label, id } = resolveSituationWord(index, w);
    if (id !== undefined) words.push({ id, labels: { fr: label } });
  }
  // Steps may repeat a pictogram (e.g. "douche" twice): keep the order as written.
  const steps: PlanItem[] = [];
  for (const st of s.steps ?? []) {
    const { w, timer } = typeof st === 'string' ? { w: st, timer: 0 } : st;
    const { label, id } = resolveSituationWord(index, w);
    if (id !== undefined) steps.push({ id, labels: { fr: label }, timerMin: timer || undefined });
  }
  const anchor = searchPictos(index, topic, lang, 1)[0] ?? words[0]?.id;
  return { anchor, words: dedupe(words), steps, source: 'library', situation: s.id };
}

export function planAutomatically(index: PreparedIndex, topic: string, lang: Lang): TlaPlan {
  const r = suggestForTopic(index, topic, lang, 16);
  return { anchor: r.anchor, words: r.ids.map((id) => ({ id })), steps: [], source: 'auto' };
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
