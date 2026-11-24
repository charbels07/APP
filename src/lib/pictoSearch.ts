/** Keyword search over the offline pictogram library index (pure, no I/O). */
import type { Lang } from '../model/types';
import { normalize } from './search';
import { levenshtein, soundKey, wordForms } from './spelling';

/**
 * [id, pack, offset, length, fr keywords, en keywords, ar keywords, categories + tags, flags,
 *  library (position in `libs`), key (`library/name`)]
 */
export type PictoItem = [number, number, number, number, string[], string[], string[], string[]?, number?, number?, string?];

/** Flags of a pictogram (bits). */
export const PICTO_SENSITIVE = 1;
/** French / Arabic label added automatically (not given by the library): to be reviewed. */
export const PICTO_FR_AUTO = 2;
export const PICTO_AR_AUTO = 4;
/** The English word has several meanings: the translation may not fit this picture. */
export const PICTO_AMBIGUOUS = 8;

export interface PictoIndex {
  size: number;
  packs: string[];
  /** Library ids, in the order used by the items. */
  libs?: string[];
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
  byKey: Map<string, number>;
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
    byKey: new Map(raw.items.flatMap((it) => (it[10] ? [[it[10], it[0]] as [string, number]] : []))),
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

/** Library id of a pictogram ("mulberry", "openmoji"…). */
export const libraryOf = (index: PreparedIndex, id: number): string | undefined => index.raw.libs?.[index.byId.get(id)?.[9] ?? -1];

/**
 * Pictograms for what was typed, best first. When the exact spelling finds few, pictograms whose
 * words sound like it or differ by a letter or two follow ("trotinette" finds the scooter).
 */
export function searchPictos(index: PreparedIndex, query: string, lang: Lang, max = 24, library?: string): number[] {
  return searchPictosAndGuess(index, query, lang, max, library, false).ids;
}

/**
 * The same search, and, when what was typed is not a word of the library, the spelling it
 * probably meant ("Did you mean « trottinette »?").
 */
export function searchPictosAndGuess(
  index: PreparedIndex,
  query: string,
  lang: Lang,
  max = 24,
  library?: string,
  guess = true,
): { ids: number[]; guess?: string } {
  const ids = rankPictos(index, query, lang, max, library).map((x) => x.id);
  if (ids.length >= Math.min(max, FUZZY_BELOW)) return { ids };
  for (const id of fuzzyPictos(index, query, lang, max, library)) {
    if (ids.length >= max) break;
    if (!ids.includes(id)) ids.push(id);
  }
  return { ids, guess: guess ? guessSpelling(index, query, lang) : undefined };
}

/** Fewer exact results than this: spellings that sound alike are looked for too. */
const FUZZY_BELOW = 8;

/** The exact search, with each result's score (100 = the very word, first keyword). */
export function rankPictos(index: PreparedIndex, query: string, lang: Lang, max = 24, library?: string): { id: number; s: number }[] {
  const q = normalize(query);
  if (!q) return [];
  const onlyLib = library ? index.raw.libs?.indexOf(library) : undefined;
  const qWords = keywordWords(query);
  const slot = LANG_SLOT[lang];
  const scored: { id: number; s: number; len: number }[] = [];
  for (const { id, kw } of index.norm) {
    if (onlyLib !== undefined && index.byId.get(id)?.[9] !== onlyLib) continue;
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
  return scored.slice(0, max).map(({ id, s }) => ({ id, s }));
}

// ── Spelling mistakes ──

interface Fuzzy {
  /** Sound key → the rows of `norm` and languages that have a word with this key (row * 3 + language). */
  keys: Map<string, number[]>;
  /** Sound keys by length (to look for keys one or two letters away). */
  byLength: Map<number, string[]>;
  /** Per language: sound key → the library's own spellings of words with that sound, most frequent first. */
  spell: Map<string, { word: string; n: number }[]>[];
  /** Every word of the library's keywords (normalised, singular). */
  known: Set<string>;
}

const fuzzyCache = new WeakMap<PreparedIndex, Fuzzy>();

/** Built once, the first time a word is not found as typed. */
function fuzzyOf(index: PreparedIndex): Fuzzy {
  const had = fuzzyCache.get(index);
  if (had) return had;
  const keys = new Map<string, number[]>();
  const counts: Map<string, Map<string, number>>[] = [new Map(), new Map(), new Map()];
  const known = new Set<string>();
  const soundOf = new Map<string, string>();
  index.norm.forEach(({ id, kw }, row) => {
    kw.forEach((list, l) => {
      const code = row * 3 + l;
      list.forEach((k, pos) => {
        for (const w of k.words) {
          known.add(w);
          if (w.length < 3) continue;
          let key = soundOf.get(w);
          if (key === undefined) soundOf.set(w, (key = soundKey(w)));
          if (key.length < 3) continue;
          const at = keys.get(key);
          if (!at) keys.set(key, [code]);
          else if (at[at.length - 1] !== code) at.push(code);
          // The library's own spelling of a one-word keyword (with its accents), for "Did you mean…".
          if (k.words.length === 1) {
            const spelt = ((index.byId.get(id)?.[4 + l] as string[] | undefined)?.[pos] ?? '').trim().toLowerCase();
            if (!spelt || /\s/.test(spelt)) continue;
            let m = counts[l].get(key);
            if (!m) counts[l].set(key, (m = new Map()));
            m.set(spelt, (m.get(spelt) ?? 0) + 1);
          }
        }
      });
    });
  });
  const byLength = new Map<number, string[]>();
  for (const key of keys.keys()) {
    const list = byLength.get(key.length);
    if (list) list.push(key);
    else byLength.set(key.length, [key]);
  }
  const spell = counts.map((m) => {
    const out = new Map<string, { word: string; n: number }[]>();
    for (const [key, words] of m)
      out.set(
        key,
        [...words].map(([word, n]) => ({ word, n })).sort((a, b) => b.n - a.n).slice(0, 6),
      );
    return out;
  });
  const f = { keys, byLength, spell, known };
  fuzzyCache.set(index, f);
  return f;
}

/** Keys that sound like `key`, with how close they are (1 = the same sound). */
function nearKeys(f: Fuzzy, key: string): [string, number][] {
  if (key.length < 3) return [];
  const out: [string, number][] = [];
  if (f.keys.has(key)) out.push([key, 1]);
  // A letter forgotten, added or changed; two for a long word.
  const limit = key.length >= 6 ? 2 : 1;
  for (let len = key.length - limit; len <= key.length + limit; len++)
    for (const other of f.byLength.get(len) ?? []) {
      // A mistake rarely changes both of the first two letters: most keys are left out at once.
      if (other === key || (other[0] !== key[0] && other[1] !== key[1])) continue;
      const d = levenshtein(key, other, limit);
      if (d <= limit) out.push([other, d === 1 ? 0.75 : 0.55]);
    }
  return out;
}

/** Pictograms whose words sound like the words typed (all of them for a short query). */
export function fuzzyPictos(index: PreparedIndex, query: string, lang: Lang, max = 24, library?: string): number[] {
  const words = keywordWords(query).filter((w) => w.length >= 3);
  if (!words.length) return [];
  const f = fuzzyOf(index);
  const slot = LANG_SLOT[lang];
  const onlyLib = library ? index.raw.libs?.indexOf(library) : undefined;
  // Row → the best closeness found for each word of the query.
  const rows = new Map<number, number[]>();
  words.forEach((w, i) => {
    for (const [key, near] of nearKeys(f, soundKey(w)))
      for (const code of f.keys.get(key) ?? []) {
        const row = Math.floor(code / 3);
        const v = near * (code % 3 === slot ? 1 : 0.8);
        const got = rows.get(row) ?? words.map(() => 0);
        if (v > got[i]) got[i] = v;
        rows.set(row, got);
      }
  });
  const scored: { id: number; s: number; lib: number }[] = [];
  for (const [row, got] of rows) {
    const hits = got.filter((v) => v > 0).length;
    if (hits < words.length && (words.length < 2 || hits * 2 < words.length)) continue;
    const id = index.norm[row].id;
    const it = index.byId.get(id);
    if (onlyLib !== undefined && it?.[9] !== onlyLib) continue;
    const s = (got.reduce((a, b) => a + b, 0) / words.length) * (hits === words.length ? 1 : 0.5);
    scored.push({ id, s, lib: it?.[9] ?? 99 });
  }
  scored.sort((a, b) => b.s - a.s || a.lib - b.lib || a.id - b.id);
  return scored.slice(0, max).map((x) => x.id);
}

/**
 * The words typed, spelt as the library spells them, when one of them is not a word it knows:
 * "trotinette" → "trottinette". Undefined when every word is known (or nothing close is).
 */
export function guessSpelling(index: PreparedIndex, query: string, lang: Lang): string | undefined {
  const typed = query.trim().split(/\s+/).filter(Boolean);
  if (!typed.length) return undefined;
  const f = fuzzyOf(index);
  const slot = LANG_SLOT[lang];
  let changed = false;
  const out = typed.map((token) => {
    // "l'herbe": the little word before the apostrophe stays as typed.
    const cut = /^((?:qu|[jlmntsdc])['’])(.+)$/i.exec(token);
    const head = cut ? cut[1] : '';
    const t = cut ? cut[2] : token;
    const w = singular(normalize(t));
    if (w.length < 3 || STOP.has(w) || f.known.has(w) || f.known.has(normalize(t))) return token;
    // A form of a known word ("courait" is "courir", "verte" is "vert"): spelt right.
    if (wordForms(t).some((form) => f.known.has(form) || f.known.has(singular(form)))) return token;
    let best: { word: string; score: number } | undefined;
    for (const [key, near] of nearKeys(f, soundKey(w)))
      [slot, ...[0, 1, 2].filter((l) => l !== slot)].forEach((l, rank) => {
        for (const sp of f.spell[l].get(key) ?? []) {
          // The same sound first, then the spelling closest to what was typed, then the most used.
          const score = near * (rank === 0 ? 1 : 0.8) * 1e6 - levenshtein(normalize(t), normalize(sp.word), 9) * 1e3 + Math.min(sp.n, 999);
          if (!best || score > best.score) best = { word: sp.word, score };
        }
      });
    if (!best || normalize(best.word) === normalize(t)) return token;
    changed = true;
    return head + best.word;
  });
  return changed ? out.join(' ') : undefined;
}

/** Topics too broad to say two pictograms belong to the same situation. */
const BROAD = new Set([
  'verb', 'usual verbs', 'core vocabulary', 'core vocabulary-communication', 'core vocabulary-knowledge',
  'qualifying adjective', 'adjective', 'noun', 'object', 'communication', 'language', 'person', 'people',
  'activity', 'action', 'thing', 'concept', 'place', 'leisure', 'daily life',
  'emoji', 'icon', 'health', 'symbols', 'objects', 'people-body', 'smileys-emotion', 'extras-openmoji', 'extras-unicode',
]);

const keywordCache = new WeakMap<PreparedIndex, Map<string, { id: number; l: number; pos: number; lib: number }[]>>();

/**
 * The pictogram whose keyword is exactly this word (any language; the given one first, then the
 * first keywords, then the libraries in their order), with how good the match is (100 = the
 * library's first word for it, in this language). Fast: built once.
 */
export function keywordPicto(index: PreparedIndex, word: string, lang: Lang): { id: number; s: number } | undefined {
  let map = keywordCache.get(index);
  if (!map) {
    map = new Map();
    for (const { id, kw } of index.norm) {
      const lib = index.byId.get(id)?.[9] ?? 99;
      kw.forEach((list, l) =>
        list.forEach((k, pos) => {
          for (const key of new Set([k.k, k.words.join(' ')])) {
            const at = map!.get(key);
            if (at) at.push({ id, l, pos, lib });
            else map!.set(key, [{ id, l, pos, lib }]);
          }
        }),
      );
    }
    keywordCache.set(index, map);
  }
  const slot = LANG_SLOT[lang];
  const q = normalize(word);
  let best: { id: number; s: number; lib: number } | undefined;
  for (const key of new Set([q, keywordWords(word).join(' ')]))
    for (const x of map.get(key) ?? []) {
      if ((index.byId.get(x.id)?.[8] ?? 0) & PICTO_SENSITIVE) continue;
      const s = 100 - Math.min(x.pos, 10) * 4 - (x.l === slot ? 0 : 20);
      if (!best || s > best.s || (s === best.s && (x.lib < best.lib || (x.lib === best.lib && x.id < best.id)))) best = { id: x.id, s, lib: x.lib };
    }
  return best && { id: best.id, s: best.s };
}

/** Finds the pictogram for one exact keyword (used by the starter word lists). */
export function exactPicto(index: PreparedIndex, keyword: string): number | undefined {
  const q = normalize(keyword);
  const raw = keyword.trim().toLowerCase();
  let best: number | undefined;
  let bestScore = Infinity;
  for (const { id, kw } of index.norm) {
    const pos = kw[0].findIndex((x) => x.k === q);
    if (pos === -1) continue;
    // Accents decide between homographs: « où » (where) is not « ou » (or).
    const accentsDiffer = index.byId.get(id)?.[4][pos]?.toLowerCase() !== raw;
    const score = pos + (accentsDiffer ? 50 : 0);
    if (score < bestScore) {
      best = id;
      bestScore = score;
      if (score === 0) break;
    }
  }
  return best ?? searchPictos(index, keyword, 'fr', 1)[0];
}

/**
 * Suggests pictograms for a situation (TLA topic).
 * Used when the situation library (data/situations.ts) doesn't know the topic:
 * the pictogram that matches the topic, then others that share its
 *    most specific categories/tags (rarest first) or mention the topic.
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

  for (const id of relatedPictos(index, anchors, count * 2, normalize(topic))) push(id);
  return { anchor, ids };
}

const dfCache = new WeakMap<PreparedIndex, Map<string, number>>();

/**
 * Pictograms of the same situation as these ones: those that share their most specific
 * categories or tags (rarest first), and, with `mention`, those whose French words contain it.
 */
export function relatedPictos(index: PreparedIndex, anchors: number[], count: number, mention = ''): number[] {
  let df = dfCache.get(index);
  if (!df) {
    df = new Map<string, number>();
    for (const it of index.raw.items) for (const t of it[7] ?? []) df.set(t, (df.get(t) ?? 0) + 1);
    dfCache.set(index, df);
  }
  const counts = df;
  // The anchors' specific topics, rarest first ("birthday" before "event").
  const specific = [...new Set(anchors.flatMap((id) => index.byId.get(id)?.[7] ?? []))]
    .filter((t) => !BROAD.has(t) && (counts.get(t) ?? 0) <= 150)
    .sort((a, b) => (counts.get(a) ?? 0) - (counts.get(b) ?? 0));
  const q = mention;
  const tiers: number[][] = [[], ...specific.map(() => [] as number[])];
  for (const it of index.raw.items) {
    if (it[0] === anchors[0] || (it[8] ?? 0) & PICTO_SENSITIVE) continue;
    if (q.length >= 3 && it[4].some((k) => normalize(k).split(' ').includes(q))) {
      tiers[0].push(it[0]);
      continue;
    }
    const topics = it[7] ?? [];
    const tier = specific.findIndex((t) => topics.includes(t));
    if (tier !== -1) tiers[tier + 1].push(it[0]);
  }
  // Within a tier, keep a few actions (verbs) so the board supports more than naming things.
  const ids: number[] = [];
  for (const tier of tiers) {
    const verbs = tier.filter((id) => (index.byId.get(id)?.[7] ?? []).includes('verb')).slice(0, 4);
    for (const id of [...tier.filter((id) => !verbs.includes(id)).slice(0, count), ...verbs])
      if (!ids.includes(id) && ids.length < count) ids.push(id);
    if (ids.length >= count) break;
  }
  return ids;
}
