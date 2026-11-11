/**
 * Example "Suivi" data for the demonstration (browser demo, no server): about two months of
 * plausible use by a child who progresses from single words to short sentences.
 * Never used with a real account (only the local demo backend offers it).
 */
import type { Observation, UsageDay, UtteranceSample } from '../backend/types';
import { emptyDay } from '../state/usageTracker';
import { dayKey } from './analytics';

// Small deterministic random generator (the same example every time).
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const SENTENCES: string[][][] = [
  // Early weeks: mostly one word.
  [['more'], ['no'], ['eat'], ['apple'], ['help_me'], ['water'], ['stop'], ['yes'], ['ball'], ['want'], ['hello'], ['done']],
  // Then two words.
  [['want', 'apple'], ['more', 'juice'], ['no', 'bath'], ['go', 'park'], ['mom', 'come'], ['big', 'ball'], ['help_me', 'open'], ['i_like_it'], ['look_at', 'car'], ['need_break'], ['where', 'dad']],
  // Last weeks: three words and more.
  [['i', 'want', 'eat'], ['i', 'want', 'pasta'], ['you', 'give', 'water'], ['i', 'not', 'want'], ['i', 'like', 'pizza'], ['yesterday', 'i', 'go', 'pool'], ['what', 'we', 'do', 'now'], ['i', 'happy'], ['it_hurts', 'tummy'], ['funny'], ['not_that'], ['i', 'want', 'play', 'tablet']],
];
const EXTRA_WORDS = ['chicken', 'bread', 'swing', 'slide', 'music', 'book', 'bike', 'grandma', 'friend', 'cake', 'chips', 'tv', 'sad', 'tired', 'outside', 'home', 'school', 'teacher', 'please', 'thanks'];

export function demoUsage(deviceId: string, platform: string, days = 60, now = new Date()): UsageDay[] {
  const r = rng(42);
  const out: UsageDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const weekend = date.getDay() === 0 || date.getDay() === 6;
    if (r() < (weekend ? 0.12 : 0.18)) continue; // some days without use
    const stage = i > days * 0.6 ? 0 : i > days * 0.25 ? 1 : 2;
    const d = emptyDay(dayKey(date), deviceId, platform, 'language');
    const sessionCount = 1 + Math.floor(r() * (weekend ? 4 : 3));
    const startHours = [7.5, 12.5, 16.5, 19, 10].sort(() => r() - 0.5).slice(0, sessionCount).sort((a, b) => a - b);
    const concepts: Record<string, number> = {};
    const samples: UtteranceSample[] = [];
    for (const h of startHours) {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(h), Math.floor((h % 1) * 60 + r() * 20)).getTime();
      const n = 2 + Math.floor(r() * (4 + stage * 3));
      let t = start;
      let sel = 0;
      for (let k = 0; k < n; k++) {
        const pool = r() < 0.75 ? SENTENCES[stage] : SENTENCES[Math.max(0, stage - 1)];
        const words = r() < 0.15 ? [EXTRA_WORDS[Math.floor(r() * EXTRA_WORDS.length)]] : pool[Math.floor(r() * pool.length)];
        for (const w of words) concepts[w] = (concepts[w] ?? 0) + 1;
        sel += words.length;
        samples.push({ t, tokens: words.map((c) => ({ c })) });
        d.stats.tokens += words.length;
        if (words.length === 1) d.stats.len1++;
        else if (words.length === 2) d.stats.len2++;
        else d.stats.len3plus++;
        t += (20 + r() * 50) * 1000;
      }
      const activeMs = t - start;
      d.sessions.push({ start, end: t + 30000, activeMs, selections: sel, utterances: n });
      d.selections += sel;
      d.utterances += n;
      d.hours[new Date(start).getHours()] += sel;
      d.modes.core += Math.round(sel * 0.55);
      d.modes.folder += Math.round(sel * 0.25);
      d.modes.tla += Math.round(sel * 0.12);
      d.modes.quick += sel - Math.round(sel * 0.55) - Math.round(sel * 0.25) - Math.round(sel * 0.12);
      d.pages.core = { opens: (d.pages.core?.opens ?? 0) + 1, ms: (d.pages.core?.ms ?? 0) + activeMs * 0.6 };
      d.pages.food = { opens: (d.pages.food?.opens ?? 0) + 1, ms: (d.pages.food?.ms ?? 0) + activeMs * 0.2 };
      if (r() < 0.5) d.pages.tla_meal = { opens: (d.pages.tla_meal?.opens ?? 0) + 1, ms: (d.pages.tla_meal?.ms ?? 0) + activeMs * 0.2 };
      if (r() < 0.3) d.pages.activities = { opens: (d.pages.activities?.opens ?? 0) + 1, ms: (d.pages.activities?.ms ?? 0) + 40000 };
    }
    d.concepts = concepts;
    d.samples = samples;
    d.stats.distinctConcepts = Object.keys(concepts).length;
    if (r() < 0.2) {
      d.searches = 1 + Math.floor(r() * 2);
      d.searched = { [EXTRA_WORDS[Math.floor(r() * EXTRA_WORDS.length)]]: d.searches };
    }
    if (r() < 0.1) d.offlineMs = Math.round(r() * 30) * 60000;
    if (r() < 0.03) d.errors = 1;
    if (i === Math.floor(days / 2)) d.tlaCreated = 1;
    out.push(d);
  }
  return out;
}

/** A few adults' notes to go with the example. */
export function demoObservations(days: UsageDay[], label: (id: string) => string): Omit<Observation, 'id' | 'profileId' | 'createdBy' | 'authorName' | 'createdAt'>[] {
  const recent = days.slice(-12).flatMap((d) => d.samples ?? []);
  const pick = (ids: string) => recent.find((s) => s.tokens.map((t) => t.c).join(' ') === ids);
  const notes: [string, Partial<Observation>][] = [
    ['i not want', { function: 'refuse', context: 'Bain', partner: 'Maman', autonomy: 'spontaneous', result: 'Refus respecté' }],
    ['help_me open', { function: 'request_help', context: 'Goûter', partner: 'Papa', autonomy: 'spontaneous', result: 'Aide obtenue' }],
    ['what we do now', { function: 'request_info', context: 'École', partner: 'Enseignante', autonomy: 'prompted', result: 'Réponse obtenue' }],
    ['yesterday i go pool', { function: 'narrate', context: 'Séance', partner: 'Orthophoniste', autonomy: 'modelled', result: 'Récit compris' }],
  ];
  return notes.map(([ids, o], k) => {
    const s = pick(ids);
    return {
      at: s?.t ?? Date.now() - (k + 1) * 86400000,
      sampleT: s?.t,
      utterance: ids.split(' ').map(label).join(' '),
      ...o,
    };
  });
}
