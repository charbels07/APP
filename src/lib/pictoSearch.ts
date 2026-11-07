/** Keyword search over the offline ARASAAC library index (pure, no I/O). */
import type { Lang } from '../model/types';
import { normalize } from './search';

/** [id, pack, offset, length, fr keywords, en keywords, ar keywords, ARASAAC categories + tags, sensitive (1)] */
export type PictoItem = [number, number, number, number, string[], string[], string[], string[]?, number?];

export interface PictoIndex {
  size: number;
  packs: string[];
  items: PictoItem[];
}

interface Keyword {
  /** Normalised keyword ("bulle de savon"). */
  k: string;
  /** Meaningful words, singular ("bulle", "savon"). */
  words: string[];
}

export interface PreparedIndex {
  raw: PictoIndex;
  byId: Map<number, PictoItem>;
  norm: { id: number; kw: [Keyword[], Keyword[], Keyword[]] }[];
}

/** Little words ignored when comparing phrases ("bulles de savon" ≈ "bulle savon"). */
const STOP = new Set(
  "de du des d' la le les l' un une et a au aux en pour avec sur the a an of to and for with in on".split(' '),
);

/** Very light singular form: "bulles" → "bulle", "jeux" → "jeu". Same rule on both sides. */
const singular = (w: string) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w);

export function keywordWords(s: string): string[] {
  return normalize(s)
    .replace(/\b(qu|[jlmntsdc])'/g, "$1' ")
    .split(/[\s-]+/)
    .filter((w) => w && !STOP.has(w))
    .map(singular);
}

const prep = (list: string[]): Keyword[] => list.map((x) => ({ k: normalize(x), words: keywordWords(x) }));

export function prepareIndex(raw: PictoIndex): PreparedIndex {
  return {
    raw,
    byId: new Map(raw.items.map((it) => [it[0], it])),
    norm: raw.items.map((it) => ({ id: it[0], kw: [prep(it[4]), prep(it[5]), prep(it[6])] })),
  };
}

const LANG_SLOT: Record<Lang, 0 | 1 | 2> = { fr: 0, en: 1, ar: 2 };

/** Scores one keyword against the query (0 = no match). */
function score(kw: Keyword, q: string, qWords: string[], pos: number): number {
  if (kw.k === q) return 100 - pos * 4;
  if (qWords.length && kw.words.join(' ') === qWords.join(' ')) return 95 - pos * 4; // plural / little words differ
  if (kw.k.startsWith(q)) return 72 - pos * 3;
  if (qWords.length) {
    const hits = qWords.filter((w) => kw.words.includes(w)).length;
    if (hits === qWords.length) return 58 + 20 * (qWords.length / Math.max(kw.words.length, 1)) - pos;
    if (qWords.length >= 2 && hits * 2 >= qWords.length) return 24 + hits * 4;
    // Prefix of a word while typing: "savo" → "savon".
    const last = qWords[qWords.length - 1];
    if (last.length >= 3 && qWords.slice(0, -1).every((w) => kw.words.includes(w)) && kw.words.some((w) => w.startsWith(last)))
      return 45;
  }
  if (q.length >= 4 && kw.k.includes(q)) return 30;
  return 0;
}

export function searchPictos(index: PreparedIndex, query: string, lang: Lang, max = 24): number[] {
  const q = normalize(query);
  if (!q) return [];
  const qWords = keywordWords(query);
  const slot = LANG_SLOT[lang];
  const scored: { id: number; s: number; len: number }[] = [];
  for (const { id, kw } of index.norm) {
    let best = 0;
    let len = 99;
    kw.forEach((list, l) => {
      const w = l === slot ? 1 : 0.8;
      list.forEach((k, pos) => {
        const v = score(k, q, qWords, pos) * w;
        if (v > best || (v === best && v > 0 && k.k.length < len)) {
          best = v;
          len = k.k.length;
        }
      });
    });
    if (best > 0) scored.push({ id, s: best, len });
  }
  scored.sort((a, b) => b.s - a.s || a.len - b.len || a.id - b.id);
  return scored.slice(0, max).map((x) => x.id);
}

/** Topics too broad to say two pictograms belong to the same situation. */
const BROAD = new Set([
  'verb', 'usual verbs', 'core vocabulary', 'core vocabulary-communication', 'core vocabulary-knowledge',
  'qualifying adjective', 'adjective', 'noun', 'object', 'communication', 'language', 'person', 'people',
  'activity', 'action', 'thing', 'concept', 'place', 'leisure', 'daily life',
]);

/** Finds the pictogram for one exact keyword (used by the starter word lists). */
export function exactPicto(index: PreparedIndex, keyword: string): number | undefined {
  const q = normalize(keyword);
  let best: number | undefined;
  let bestPos = 99;
  for (const { id, kw } of index.norm) {
    const pos = kw[0].findIndex((x) => x.k === q);
    if (pos !== -1 && pos < bestPos) {
      best = id;
      bestPos = pos;
      if (pos === 0) break;
    }
  }
  return best ?? searchPictos(index, keyword, 'fr', 1)[0];
}

/**
 * Suggests pictograms for a situation (TLA topic).
 * 1. Starter word lists for common situations (see data/tlaSeeds.ts).
 * 2. Otherwise: the pictogram that matches the topic, then others that share its
 *    most specific ARASAAC categories/tags (rarest first) or mention the topic.
 */
export function suggestForTopic(
  index: PreparedIndex,
  topic: string,
  lang: Lang,
  count = 16,
  seeds?: { lists: Record<string, string[]>; aliases: Record<string, string> },
): { anchor?: number; ids: number[] } {
  const anchors = searchPictos(index, topic, lang, 3);
  const anchor = anchors[0];
  const ids: number[] = [];
  const push = (id: number | undefined) => {
    if (id !== undefined && id !== anchor && !ids.includes(id) && ids.length < count) ids.push(id);
  };

  const key = normalize(topic).replace(/[^a-z0-9 ]/g, '');
  const seedKey = seeds && (seeds.lists[key] ? key : seeds.aliases[key] ?? Object.keys(seeds.lists).find((k) => key.includes(k)));
  if (seeds && seedKey) for (const w of seeds.lists[seedKey]) push(exactPicto(index, w));
  if (anchor === undefined || ids.length >= count) return { anchor, ids };

  const df = new Map<string, number>();
  for (const it of index.raw.items) for (const t of it[7] ?? []) df.set(t, (df.get(t) ?? 0) + 1);
  // The anchor's specific topics, rarest first ("birthday" before "event").
  const specific = [...new Set(anchors.flatMap((id) => index.byId.get(id)?.[7] ?? []))]
    .filter((t) => !BROAD.has(t) && (df.get(t) ?? 0) <= 150)
    .sort((a, b) => (df.get(a) ?? 0) - (df.get(b) ?? 0));
  const q = normalize(topic);
  const tiers: number[][] = [[], ...specific.map(() => [] as number[])];
  for (const it of index.raw.items) {
    if (it[0] === anchor || it[8]) continue;
    if (q.length >= 3 && it[4].some((k) => normalize(k).split(' ').includes(q))) {
      tiers[0].push(it[0]);
      continue;
    }
    const topics = it[7] ?? [];
    const tier = specific.findIndex((t) => topics.includes(t));
    if (tier !== -1) tiers[tier + 1].push(it[0]);
  }
  // Within a tier, keep a few actions (verbs) so the board supports more than naming things.
  for (const tier of tiers) {
    const verbs = tier.filter((id) => (index.byId.get(id)?.[7] ?? []).includes('verb')).slice(0, 4);
    for (const id of [...tier.filter((id) => !verbs.includes(id)).slice(0, count), ...verbs]) push(id);
    if (ids.length >= count) break;
  }
  return { anchor, ids };
}
