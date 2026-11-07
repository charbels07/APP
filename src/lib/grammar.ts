/**
 * Sentence-strip grammar (spec §10, COM-03).
 *
 * The strip stores *concepts*; this module computes the surface form of each
 * word (conjugation, elision, negation). It never changes the board: a
 * conjugated word always maps back to its source concept/position.
 *
 * Scope of this draft: present tense agreement for French and English.
 * Arabic morphology (gender, person, dual…) must be specified with the
 * speech-language therapist and native speakers before it is implemented.
 */
import type { Lang, Profile, StripItem } from '../model/types';
import { audioOf, baseLabel, hasOverrideLabel, label, wordClass } from './lexicon';

/** je, tu, il/elle, nous, vous, ils/elles */
const PERSON: Record<string, number> = { i: 0, you: 1, he: 2, she: 2, we: 3, you_pl: 4, they: 5 };

const FR: Record<string, [string, string, string, string, string, string]> = {
  want: ['veux', 'veux', 'veut', 'voulons', 'voulez', 'veulent'],
  go: ['vais', 'vas', 'va', 'allons', 'allez', 'vont'],
  do: ['fais', 'fais', 'fait', 'faisons', 'faites', 'font'],
  have: ['ai', 'as', 'a', 'avons', 'avez', 'ont'],
  be: ['suis', 'es', 'est', 'sommes', 'êtes', 'sont'],
  like: ['aime', 'aimes', 'aime', 'aimons', 'aimez', 'aiment'],
  can: ['peux', 'peux', 'peut', 'pouvons', 'pouvez', 'peuvent'],
  help: ['aide', 'aides', 'aide', 'aidons', 'aidez', 'aident'],
  give: ['donne', 'donnes', 'donne', 'donnons', 'donnez', 'donnent'],
  look: ['regarde', 'regardes', 'regarde', 'regardons', 'regardez', 'regardent'],
  come: ['viens', 'viens', 'vient', 'venons', 'venez', 'viennent'],
  say: ['dis', 'dis', 'dit', 'disons', 'dites', 'disent'],
  know: ['sais', 'sais', 'sait', 'savons', 'savez', 'savent'],
  take: ['prends', 'prends', 'prend', 'prenons', 'prenez', 'prennent'],
  eat: ['mange', 'manges', 'mange', 'mangeons', 'mangez', 'mangent'],
  drink: ['bois', 'bois', 'boit', 'buvons', 'buvez', 'boivent'],
  play: ['joue', 'joues', 'joue', 'jouons', 'jouez', 'jouent'],
  put: ['mets', 'mets', 'met', 'mettons', 'mettez', 'mettent'],
  open: ['ouvre', 'ouvres', 'ouvre', 'ouvrons', 'ouvrez', 'ouvrent'],
  stop_v: ['arrête', 'arrêtes', 'arrête', 'arrêtons', 'arrêtez', 'arrêtent'],
  finish: ['finis', 'finis', 'finit', 'finissons', 'finissez', 'finissent'],
  read: ['lis', 'lis', 'lit', 'lisons', 'lisez', 'lisent'],
  write: ['écris', 'écris', 'écrit', 'écrivons', 'écrivez', 'écrivent'],
  wait: ['attends', 'attends', 'attend', 'attendons', 'attendez', 'attendent'],
  sing: ['chante', 'chantes', 'chante', 'chantons', 'chantez', 'chantent'],
  dance: ['danse', 'danses', 'danse', 'dansons', 'dansez', 'dansent'],
  draw: ['dessine', 'dessines', 'dessine', 'dessinons', 'dessinez', 'dessinent'],
  spit: ['crache', 'craches', 'crache', 'crachons', 'crachez', 'crachent'],
  wake_up: ['me réveille', 'te réveilles', 'se réveille', 'nous réveillons', 'vous réveillez', 'se réveillent'],
  get_dressed: ["m'habille", "t'habilles", "s'habille", 'nous habillons', 'vous habillez', "s'habillent"],
  brush_teeth: [
    'me brosse les dents',
    'te brosses les dents',
    'se brosse les dents',
    'nous brossons les dents',
    'vous brossez les dents',
    'se brossent les dents',
  ],
};

/** English: [3rd person singular] (+ special forms for "be"). */
const EN_3SG: Record<string, string> = {
  want: 'wants', go: 'goes', do: 'does', have: 'has', like: 'likes', help: 'helps', give: 'gives',
  look: 'looks', come: 'comes', say: 'says', know: 'knows', take: 'takes', eat: 'eats', drink: 'drinks',
  play: 'plays', put: 'puts', open: 'opens', stop_v: 'stops', finish: 'finishes', read: 'reads',
  write: 'writes', wait: 'waits', sing: 'sings', dance: 'dances', draw: 'draws', spit: 'spits',
  wake_up: 'wakes up', get_dressed: 'gets dressed', brush_teeth: 'brushes teeth',
};
const EN_BE = ['am', 'are', 'is', 'are', 'are', 'are'];

const VOWEL = /^[aeéèêëiîïoôuùûyh]/i;

export interface Token {
  key: string;
  text: string;
  lang: Lang;
  /** Concept the token came from (for "show me where" and recorded audio). */
  concept?: string;
  /** Recorded audio to play instead of synthesis, if the surface form is unchanged. */
  audio?: string;
}

export function renderStrip(items: StripItem[], profile: Profile): Token[] {
  const grammar = profile.settings.grammar;
  const tokens: Token[] = items.map((it) => {
    if (it.kind === 'text') return { key: it.key, text: it.text, lang: it.lang };
    return {
      key: it.key,
      text: label(profile, it.concept, it.lang),
      lang: it.lang,
      concept: it.concept,
      audio: audioOf(profile, it.concept, it.lang),
    };
  });
  if (!grammar) return tokens;

  const conjugated = new Set<number>();
  for (let k = 1; k < items.length; k++) {
    const prev = items[k - 1];
    const cur = items[k];
    if (prev.kind !== 'concept' || cur.kind !== 'concept' || prev.lang !== cur.lang) continue;
    const person = PERSON[prev.concept];
    if (person === undefined || wordClass(profile, cur.concept) !== 'verb') continue;
    // Respect a family override: if the label was customised, don't conjugate.
    if (hasOverrideLabel(profile, cur.concept, cur.lang)) continue;
    let form: string | undefined;
    if (cur.lang === 'fr') form = FR[cur.concept]?.[person];
    if (cur.lang === 'en') {
      if (cur.concept === 'be') form = EN_BE[person];
      else if (person === 2) form = EN_3SG[cur.concept];
    }
    if (form) {
      tokens[k].text = form;
      tokens[k].audio = undefined;
      conjugated.add(k);
    }
  }

  // French negation: pronoun + verb + "pas"  →  "ne/n'" before the verb.
  for (let k = 1; k < items.length; k++) {
    const cur = items[k];
    if (cur.kind !== 'concept' || cur.lang !== 'fr' || cur.concept !== 'not') continue;
    if (!conjugated.has(k - 1)) continue;
    const verb = tokens[k - 1];
    verb.text = VOWEL.test(verb.text) ? `n'${verb.text}` : `ne ${verb.text}`;
  }

  // French elision: "je" + vowel → "j'".
  for (let k = 0; k < items.length - 1; k++) {
    const cur = items[k];
    if (cur.kind !== 'concept' || cur.lang !== 'fr' || cur.concept !== 'i') continue;
    if (tokens[k].text !== baseLabel(profile, 'i', 'fr')) continue;
    const next = tokens[k + 1];
    if (next.lang === 'fr' && VOWEL.test(next.text) && conjugated.has(k + 1)) {
      tokens[k].text = "j'";
      tokens[k].audio = undefined;
    }
  }
  return tokens;
}

/** Joins tokens of one language into a natural string ("j'" + "aime" → "j'aime"). */
export function joinTokens(tokens: Token[]): string {
  let out = '';
  for (const t of tokens) {
    if (!out) out = t.text;
    else out += (out.endsWith("'") ? '' : ' ') + t.text;
  }
  return out;
}

/**
 * Groups tokens into speech segments: consecutive synthesised words in the same
 * language are spoken together; recorded words are played as audio clips.
 */
export type Segment = { kind: 'tts'; text: string; lang: Lang } | { kind: 'audio'; media: string };

export function toSegments(tokens: Token[]): Segment[] {
  const segs: Segment[] = [];
  let buf: Token[] = [];
  const flush = () => {
    if (buf.length) segs.push({ kind: 'tts', text: joinTokens(buf), lang: buf[0].lang });
    buf = [];
  };
  for (const t of tokens) {
    if (t.audio) {
      flush();
      segs.push({ kind: 'audio', media: t.audio });
    } else {
      if (buf.length && buf[0].lang !== t.lang) flush();
      buf.push(t);
    }
  }
  flush();
  return segs;
}

/**
 * Inflected verb forms → verb concept ("veux" → want), used to recognise
 * dictated sentences. Arabic is not covered yet (see note at the top).
 */
export function inflectedForms(lang: Lang): Map<string, string> {
  const m = new Map<string, string>();
  if (lang === 'fr') for (const [id, forms] of Object.entries(FR)) for (const f of forms) m.set(f, id);
  if (lang === 'en') {
    for (const [id, f] of Object.entries(EN_3SG)) m.set(f, id);
    for (const f of EN_BE) m.set(f, 'be');
  }
  return m;
}
