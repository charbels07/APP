/**
 * Keyboard → sentence: what is typed becomes picture cards. Each word keeps exactly what was
 * typed (it is said as written) and gets a picture: the one of the matching word of the child's
 * boards (« veux » → vouloir, « brosse à dents » → one card), else one from the offline
 * pictogram library, else none (little words such as « une », « de »).
 */
import type { Lang, Profile } from '../model/types';
import { inflectedForms } from './grammar';
import { getConcept, label } from './lexicon';
import { buildDictionary, tokenize } from './parseSentence';
import { PICTO_AMBIGUOUS, PICTO_AR_AUTO, PICTO_FR_AUTO, PICTO_SENSITIVE, type PreparedIndex } from './pictoSearch';
import { normalize } from './search';

export interface TypedChip {
  /** Exactly what was typed for this card. */
  text: string;
  /** Word of the boards (concept id) whose picture is shown. */
  word?: string;
  /** Pictogram of the offline library (key `library/file`), when the boards do not have the word. */
  picto?: string;
}

/**
 * Little words that look like another word once accents are removed (« ou » / « où », « à » / « a »,
 * « la » / « là »…), or that would get a meaningless picture: they only match when written exactly.
 */
const LITTLE: Record<Lang, Set<string>> = {
  fr: new Set(
    "le la les l' un une des du de d' à au aux ou or ni car que qu' qui ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs en y se s' me m' te t' lui on si ne n' c' j'".split(' '),
  ),
  en: new Set('a an the of or to as at by it is'.split(' ')),
  ar: new Set('و في من على الى إلى عن أو ان أن'.split(' ')),
};

const fold = (s: string) => s.toLowerCase().replace(/[’`]/g, "'").trim();
const hasAccent = (s: string) => /[̀-ͯ]/.test(s.normalize('NFD'));
const singular = (w: string) => (w.length > 3 && /[sx]$/.test(w) ? w.slice(0, -1) : w);
/** Punctuation around a word is kept on the card but ignored to find the picture. */
const bare = (s: string) => s.replace(/^[\s«"“”(¿¡]+|[\s.,;:!?»"“”)…]+$/g, '');
const ELISION = /^(qu|[jlmntsdc])['’](.+)$/i;

const SLOT: Record<Lang, 4 | 5 | 6> = { fr: 4, en: 5, ar: 6 };

/** Picture of the library whose own name is this word, in the language being typed. */
function libraryPicture(index: PreparedIndex, word: string, lang: Lang): string | undefined {
  const typed = fold(word);
  if (typed.length < 2 || LITTLE[lang].has(typed)) return undefined;
  const q = normalize(word);
  const qs = singular(q);
  const slot = SLOT[lang] - 4;
  const auto = lang === 'fr' ? PICTO_FR_AUTO : lang === 'ar' ? PICTO_AR_AUTO : 0;
  let best: string | undefined;
  let bestScore = Infinity;
  for (const { id, kw } of index.norm) {
    const list = kw[slot];
    if (!list.length) continue;
    const pos = list.findIndex((x) => x.k === q || x.k === qs);
    if (pos === -1) continue;
    const it = index.byId.get(id);
    const key = it?.[10];
    if (!it || !key) continue;
    const flags = it[8] ?? 0;
    if (flags & PICTO_SENSITIVE) continue;
    // The pictogram's own name only; Mulberry also lists real synonyms (not loose keywords).
    const mulberry = key.startsWith('mulberry/');
    if (pos > 0 && !(mulberry && (lang !== 'en' || pos <= 1))) continue;
    const written = fold((it[SLOT[lang]] as string[])[pos] ?? '');
    const exact = written === typed || written === singular(typed);
    // Accents typed on purpose must match: « maïs » is not « mais ».
    if (!exact && hasAccent(word)) continue;
    const score = pos * 2 + (exact ? 0 : 30) + (flags & PICTO_AMBIGUOUS ? 20 : 0) + (flags & auto ? 5 : 0) + (it[9] ?? 0) * 0.1;
    if (score < bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

export function typedChips(profile: Profile, text: string, lang: Lang, index?: PreparedIndex | null): TypedChip[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const dict = buildDictionary(profile, lang);
  const forms = inflectedForms(lang);

  /** Word of the boards written this way (plural and missing accents accepted, see LITTLE). */
  const boardWord = (phrase: string, single: boolean): string | undefined => {
    const key = tokenize(phrase).join(' ');
    if (!key) return undefined;
    const id = (dict.get(key) ?? (single ? dict.get(singular(key)) : undefined))?.id;
    if (!id) return undefined;
    const c = getConcept(profile, id);
    const typed = fold(phrase);
    const known = [label(profile, id, lang), c?.labels[lang], c?.labelsF?.[lang], ...[...forms].filter(([, x]) => x === id).map(([f]) => f)]
      .filter((x): x is string => !!x)
      .map(fold);
    if (known.includes(typed) || known.includes(singular(typed))) return id;
    if (LITTLE[lang].has(typed) || hasAccent(phrase)) return undefined;
    return id;
  };

  const chips: TypedChip[] = [];
  let i = 0;
  while (i < words.length) {
    let done = false;
    for (let n = Math.min(4, words.length - i); n >= 1 && !done; n--) {
      const typed = words.slice(i, i + n).join(' ');
      const phrase = bare(typed);
      if (!phrase) continue;
      // « j'aime », « l'école »: the picture is the one of the word after the apostrophe.
      const rest = n === 1 ? ELISION.exec(phrase)?.[2] : undefined;
      const word = boardWord(phrase, n === 1) ?? (rest ? boardWord(rest, true) : undefined);
      const picto = word || !index ? undefined : (libraryPicture(index, phrase, lang) ?? (rest ? libraryPicture(index, rest, lang) : undefined));
      if (word || picto) {
        chips.push({ text: typed, ...(word ? { word } : { picto }) });
        i += n;
        done = true;
      }
    }
    if (!done) chips.push({ text: words[i++] });
  }
  return chips;
}
