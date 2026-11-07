/**
 * Universal search (spec §11): finds a word in any language, tolerates typos,
 * understands simple "how do I say…" questions through tags, and returns where
 * the word lives so the app can guide the user to it ("show me where").
 */
import { BUILTIN_CONCEPTS } from '../data/concepts';
import { LANGS, type Lang, type Profile } from '../model/types';
import { allConceptIds, getConcept, label } from './lexicon';

export interface Location {
  /** Board that contains the word. */
  board: string;
  index: number;
  /** Boards to open from the root, e.g. ['core', 'food']; for TLAs ['tla_meal']. */
  path: string[];
  /** Visible at the current progressive-reveal level? */
  visible: boolean;
}

export interface SearchResult {
  concept: string;
  score: number;
  locations: Location[];
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // alef variants → ا (before NFD splits off the hamza)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Latin diacritics
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '') // Arabic tashkeel, shadda, hamza marks, tatweel
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[’`]/g, "'")
    .replace(/[!?¿¡.,;:…«»"()؟]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Words ignored in sentence-like queries ("comment dire qu'il y a trop de bruit"). */
const STOP = new Set(
  (
    "comment dire dit dis qu qu' que qui il y a de du des le la les l' un une je j' me m' est c' ce " +
    "pour mot veut veux trouver how do i say to the a an is it there that what word of too trop " +
    'كيف بقول قول شو في'
  ).split(' '),
);

export function locate(profile: Profile): Map<string, Location[]> {
  const map = new Map<string, Location[]>();
  const add = (concept: string, loc: Location) => {
    const list = map.get(concept) ?? [];
    list.push(loc);
    map.set(concept, list);
  };
  const level = profile.settings.revealLevel;
  const core = profile.boards.core;
  core.cells.forEach((cell, index) => {
    if (!cell) return;
    const visible = (cell.level ?? 1) <= level;
    add(cell.concept, { board: 'core', index, path: ['core'], visible });
    if (cell.folder && profile.boards[cell.folder]) {
      profile.boards[cell.folder].cells.forEach((sub, subIndex) => {
        if (sub) add(sub.concept, { board: cell.folder!, index: subIndex, path: ['core', cell.folder!], visible });
      });
    }
  });
  for (const tlaId of profile.tlaOrder) {
    profile.boards[tlaId]?.cells.forEach((cell, index) => {
      if (cell) add(cell.concept, { board: tlaId, index, path: [tlaId], visible: true });
    });
  }
  return map;
}

export function search(profile: Profile, query: string, max = 24): SearchResult[] {
  const q = normalize(query);
  if (!q) return [];
  const words = q.split(' ');
  const sentence = words.length >= 3;
  const terms = sentence ? words.filter((w) => !STOP.has(w) && w.length > 1) : [q];
  if (!terms.length) return [];

  const where = locate(profile);
  const results: SearchResult[] = [];
  for (const id of allConceptIds(profile)) {
    const c = getConcept(profile, id);
    if (!c) continue;
    // Names in the active language weigh more than the other languages.
    const active = profile.settings.lang;
    const names: { n: string; w: number }[] = [];
    for (const l of LANGS) {
      const w = l === active ? 1 : 0.85;
      names.push({ n: normalize(label(profile, id, l)), w }, { n: normalize(c.labels[l]), w });
      const f = c.labelsF?.[l];
      if (f) names.push({ n: normalize(f), w });
    }
    const tags = (c.tags ?? BUILTIN_CONCEPTS[id]?.tags ?? []).map(normalize);

    let score = 0;
    for (const t of terms) {
      let best = 0;
      for (const { n, w } of names) {
        let v = 0;
        if (n === t) v = 100;
        else if (n.startsWith(t)) v = 80 - Math.min(20, n.length - t.length);
        else if (t.length >= 3 && n.includes(t)) v = 55;
        else if (t.length >= 4) {
          const d = levenshtein(t, n);
          if (d === 1) v = 50;
          else if (d === 2 && t.length >= 7) v = 35;
        }
        best = Math.max(best, v * w);
      }
      for (const tag of tags) {
        if (tag === t) best = Math.max(best, 60);
        else if (t.length >= 4 && tag.startsWith(t)) best = Math.max(best, 40);
      }
      score += best;
    }
    if (c.cls === 'folder') score -= 5;
    const locations = where.get(id) ?? [];
    if (!locations.length) score -= 30;
    if (score > 30) results.push({ concept: id, score, locations });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, max);
}
