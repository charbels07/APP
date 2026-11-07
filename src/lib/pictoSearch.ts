/** Keyword search over the offline ARASAAC library index (pure, no I/O). */
import type { Lang } from '../model/types';
import { normalize } from './search';

/** [id, pack, offset, length, fr keywords, en keywords, ar keywords, ARASAAC categories + tags] */
export type PictoItem = [number, number, number, number, string[], string[], string[], string[]?];

export interface PictoIndex {
  size: number;
  packs: string[];
  items: PictoItem[];
}

export interface PreparedIndex {
  raw: PictoIndex;
  byId: Map<number, PictoItem>;
  norm: { id: number; kw: [string[], string[], string[]] }[];
}

export function prepareIndex(raw: PictoIndex): PreparedIndex {
  return {
    raw,
    byId: new Map(raw.items.map((it) => [it[0], it])),
    norm: raw.items.map((it) => ({ id: it[0], kw: [it[4].map(normalize), it[5].map(normalize), it[6].map(normalize)] })),
  };
}

const LANG_SLOT: Record<Lang, 0 | 1 | 2> = { fr: 0, en: 1, ar: 2 };

export function searchPictos(index: PreparedIndex, query: string, lang: Lang, max = 24): number[] {
  const q = normalize(query);
  if (!q) return [];
  const slot = LANG_SLOT[lang];
  const scored: { id: number; s: number; len: number }[] = [];
  for (const { id, kw } of index.norm) {
    let best = 0;
    let len = 99;
    kw.forEach((list, l) => {
      const w = l === slot ? 1 : 0.8;
      list.forEach((k, pos) => {
        let v = 0;
        if (k === q) v = 100 - pos * 5;
        else if (k.startsWith(q)) v = 70 - pos * 3;
        else if (q.length >= 3 && k.split(' ').includes(q)) v = 60;
        else if (q.length >= 4 && k.includes(q)) v = 30;
        if (v * w > best) {
          best = v * w;
          len = k.length;
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
    const pos = kw[0].indexOf(q);
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
    if (it[0] === anchor) continue;
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
