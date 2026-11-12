/**
 * The Arabic of the child's words: one dialect chosen by the family at set-up (or no Arabic at
 * all). The built-in vocabulary (src/data/concepts.ts) is written in Lebanese; each other
 * dialect lists only the words that differ from it.
 *
 * FIRST VERSION — every list below must be checked by a native speaker (and the speech
 * therapist) of that country before the app is sold there. Verbs follow the same convention as
 * the Lebanese list: the short form used when telling someone ("eat", "open"), and "I want",
 * "I have", "I can" in the first person.
 *
 * A word is written `masculine|feminine` when the speaker's gender changes it.
 */
import type { ArabicDialect, Concept, UiLang } from '../model/types';
import { BUILTIN_CONCEPTS } from './concepts';
import { DIALECT_WORDS } from './dialectWords';

export { DIALECT_WORDS };

export type SpokenArabic = Exclude<ArabicDialect, 'none'>;

export interface DialectInfo {
  /** Name shown in menus, in each navigation language. */
  name: Record<UiLang, string>;
  /** Name of the communication language on the board: « عربي (مصري) ». */
  langName: string;
  /** Voice and speech-recognition locale to prefer (falls back to any Arabic voice). */
  locale: string;
  /** Month names: كانون الثاني… (Levant, Iraq) or يناير… (Egypt, Gulf, Saudi Arabia). */
  months: 'levant' | 'gregorian';
  /** Day names as spoken (Levant) or as written everywhere. */
  days: 'levant' | 'standard';
}

export const DIALECTS: Record<SpokenArabic, DialectInfo> = {
  lb: {
    name: { fr: 'Libanais', en: 'Lebanese', ar: 'اللبنانية' },
    langName: 'عربي (لبناني)',
    locale: 'ar-LB',
    months: 'levant',
    days: 'levant',
  },
  sy: {
    name: { fr: 'Syrien', en: 'Syrian', ar: 'السورية' },
    langName: 'عربي (سوري)',
    locale: 'ar-SY',
    months: 'levant',
    days: 'levant',
  },
  jo: {
    name: { fr: 'Jordanien / palestinien', en: 'Jordanian / Palestinian', ar: 'الأردنية / الفلسطينية' },
    langName: 'عربي (أردني / فلسطيني)',
    locale: 'ar-JO',
    months: 'levant',
    days: 'levant',
  },
  eg: {
    name: { fr: 'Égyptien', en: 'Egyptian', ar: 'المصرية' },
    langName: 'عربي (مصري)',
    locale: 'ar-EG',
    months: 'gregorian',
    days: 'standard',
  },
  sa: {
    name: { fr: 'Saoudien', en: 'Saudi', ar: 'السعودية' },
    langName: 'عربي (سعودي)',
    locale: 'ar-SA',
    months: 'gregorian',
    days: 'standard',
  },
  gulf: {
    name: { fr: 'Golfe (Émirats, Koweït, Qatar, Bahreïn, Oman)', en: 'Gulf (UAE, Kuwait, Qatar, Bahrain, Oman)', ar: 'الخليجية (الإمارات، الكويت، قطر، البحرين، عُمان)' },
    langName: 'عربي (خليجي)',
    locale: 'ar-AE',
    months: 'gregorian',
    days: 'standard',
  },
  iq: {
    name: { fr: 'Irakien', en: 'Iraqi', ar: 'العراقية' },
    langName: 'عربي (عراقي)',
    locale: 'ar-IQ',
    months: 'levant',
    days: 'standard',
  },
  msa: {
    name: { fr: 'Arabe standard (fos’ha)', en: 'Modern Standard Arabic (fus’ha)', ar: 'العربية الفصحى' },
    langName: 'العربية الفصحى',
    locale: 'ar-SA',
    months: 'gregorian',
    days: 'standard',
  },
};

/** Order of the choices offered to the family. */
export const DIALECT_ORDER: SpokenArabic[] = ['lb', 'sy', 'jo', 'eg', 'sa', 'gulf', 'iq', 'msa'];

/** "None": no Arabic in the child's app. */
export const NO_ARABIC: Record<UiLang, string> = {
  fr: 'Aucun (pas d’arabe dans l’application)',
  en: 'None (no Arabic in the app)',
  ar: 'لا شيء (دون عربية في التطبيق)',
};

export const dialectName = (d: ArabicDialect | undefined, ui: UiLang): string => (!d || d === 'none' ? NO_ARABIC[ui] : DIALECTS[d].name[ui]);

const cache = new Map<ArabicDialect, Record<string, Concept>>();

/** The built-in vocabulary with its Arabic words in the chosen dialect. */
export function conceptsFor(dialect: ArabicDialect | undefined): Record<string, Concept> {
  const d = dialect ?? 'lb';
  if (d === 'lb' || d === 'none') return BUILTIN_CONCEPTS;
  let map = cache.get(d);
  if (!map) {
    map = { ...BUILTIN_CONCEPTS };
    for (const [id, word] of Object.entries(DIALECT_WORDS[d])) {
      const c = BUILTIN_CONCEPTS[id];
      if (!c) continue;
      const [m, f] = word.split('|');
      const labelsF = { ...(c.labelsF ?? {}) };
      // A changed word never keeps the Lebanese feminine form.
      if (f) labelsF.ar = f;
      else delete labelsF.ar;
      map[id] = { ...c, labels: { ...c.labels, ar: m }, labelsF: Object.keys(labelsF).length ? labelsF : undefined };
    }
    cache.set(d, map);
  }
  return map;
}

/** Every way the built-in word is said across the dialects (search aid for the pictogram library). */
export function arabicVariants(id: string): string[] {
  const out = new Set<string>();
  for (const d of DIALECT_ORDER) {
    const c = conceptsFor(d)[id];
    if (c?.labels.ar) out.add(c.labels.ar);
    if (c?.labelsF?.ar) out.add(c.labelsF.ar);
  }
  return [...out];
}

const MONTHS_LEVANT = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
const MONTHS_GREGORIAN = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
const DAYS_LEVANT = ['الإثنين', 'التلاتا', 'الأربعا', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const DAYS_STANDARD = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];

const info = (d: ArabicDialect | undefined) => DIALECTS[!d || d === 'none' ? 'lb' : d];
export const arabicMonths = (d: ArabicDialect | undefined) => (info(d).months === 'levant' ? MONTHS_LEVANT : MONTHS_GREGORIAN);
/** Monday first. */
export const arabicDays = (d: ArabicDialect | undefined) => (info(d).days === 'levant' ? DAYS_LEVANT : DAYS_STANDARD);
export const arabicDaysShort = (d: ArabicDialect | undefined) => arabicDays(d).map((x) => x.replace(/^ال/, ''));
