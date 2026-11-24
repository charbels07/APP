/**
 * Words typed with a spelling mistake (pure, no I/O): "trotinette", "elefan", "chocola" still find
 * "trottinette", "éléphant", "chocolat".
 *
 * - `soundKey`: what a word sounds like, roughly (French first: "ph" = "f", "eau" = "o", silent
 *   endings…). Two spellings of the same sound give the same key.
 * - `levenshtein`: how many letters differ (for a letter typed twice, forgotten or swapped).
 * - `wordForms`: the dictionary forms a word of a sentence may come from ("verte" → "vert",
 *   "courait" → "courir", "playing" → "play"), to find its picture.
 */
import { normalize } from './search';

/** Letters to change between `a` and `b` (stops early: anything above `limit` answers `limit + 1`). */
export function levenshtein(a: string, b: string, limit = 2): number {
  if (Math.abs(a.length - b.length) > limit) return limit + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const row = [i];
    let best = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row.push(v);
      if (v < best) best = v;
    }
    if (best > limit) return limit + 1;
    prev = row;
  }
  return prev[b.length];
}

const ARABIC = /[؀-ۿ]/;

/**
 * What a word sounds like, roughly: the same key for "trottinette" and "trotinette", "éléphant" and
 * "elefan", "chocolat" and "chocola", "vert" and "verte". Arabic words keep their letters (already
 * simplified by `normalize`).
 */
export function soundKey(word: string): string {
  const w = normalize(word).replace(/[^a-z؀-ۿ]/g, '');
  if (!w || ARABIC.test(w)) return w;
  let s = w
    .replace(/ph/g, 'f')
    .replace(/qu|ck|q/g, 'k')
    .replace(/gu(?=[eiy])/g, 'g')
    .replace(/g(?=[eiy])/g, 'j')
    .replace(/c(?=[eiy])/g, 's')
    .replace(/sch|ch|sh/g, 'S')
    .replace(/c/g, 'k')
    .replace(/h/g, '')
    .replace(/y/g, 'i')
    .replace(/w/g, 'v')
    .replace(/z/g, 's')
    .replace(/eaux?|aux?/g, 'o')
    // Nasal sounds ("ain", "ein", "in" / "an", "en"), before "ai" and "ei" become "e".
    .replace(/(?:ain|ein|aim|in|im|un|um)(?=[^aeiou]|$)/g, 'I')
    .replace(/(?:an|am|en|em)(?=[^aeiou]|$)/g, 'A')
    .replace(/ai|ei/g, 'e')
    .replace(/(?:er|ez|et)$/, 'e')
    .replace(/(.)\1+/g, '$1');
  // Letters not heard at the end of a word ("souris", "vert", "verte", "chocolat").
  const end = s.replace(/[estdxp]+$/, '');
  if (end.length >= 2) s = end;
  return s;
}

/**
 * The forms a word of a sentence may have in the dictionary, the word itself first: feminine and
 * plural to the masculine singular, a conjugated verb to its infinitive (French), "-ing" / "-ed"
 * (English). Some of these forms do not exist; the search keeps the ones that find a picture.
 */
export function wordForms(word: string): string[] {
  const w = normalize(word);
  const out = [w];
  const add = (x: string) => {
    if (x.length >= 2 && !out.includes(x)) out.push(x);
  };
  if (ARABIC.test(w) || w.length < 4) return out;
  // Plural.
  if (/[sx]$/.test(w)) add(w.slice(0, -1));
  const base = out[out.length - 1];
  // Feminine → masculine.
  const fem: [RegExp, string][] = [
    [/euse$/, 'eux'],
    [/rice$/, 'eur'],
    [/ive$/, 'if'],
    [/enne$/, 'en'],
    [/onne$/, 'on'],
    [/ette$/, 'et'],
    [/elle$/, 'el'],
    [/ere$/, 'er'],
    [/e$/, ''],
  ];
  for (const [end, to] of fem) if (end.test(base)) add(base.replace(end, to));
  // A conjugated French verb → its infinitive ("courait" → "courir", "mange" → "manger").
  const verb = /(aient|ais|ait|ant|ons|ez|ent|ees|ee|es|e|is|it|i)$/.exec(base);
  if (verb) {
    const stem = base.slice(0, -verb[1].length);
    if (stem.length >= 2) for (const end of ['er', 'ir', 're']) add(stem + end);
  }
  // English.
  const en = /(ing|ed)$/.exec(base);
  if (en && base.length > 5) {
    const stem = base.slice(0, -en[1].length);
    add(stem);
    add(stem + 'e');
    if (/(.)\1$/.test(stem)) add(stem.slice(0, -1));
  }
  return out;
}
