import type { WordClass, UiLang } from '../model/types';

export const C = {
  bg: '#EEF1F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FA',
  text: '#1B2430',
  textMuted: '#5B6675',
  border: '#D5DBE3',
  /** Edge of a field to type in, and the "off" track of a switch: at least 3:1 against the page (WCAG 1.4.11). */
  inputBorder: '#748093',
  /** Example text inside an empty field: at least 4.5:1 (WCAG 1.4.3). */
  placeholder: '#667085',
  rail: '#1F2A37',
  railActive: '#33475E',
  railText: '#E8EEF5',
  accent: '#1D4ED8',
  accentSoft: '#DBE7FF',
  help: '#C4241A',
  helpSoft: '#FEE4E2',
  edit: '#B54708',
  editSoft: '#FEF0C7',
  success: '#0E6E4F',
  successSoft: '#D1FADF',
  highlight: '#F79009',
  overlay: 'rgba(16, 24, 40, 0.35)',
};

/** Modified Fitzgerald key (adjustable by the therapist). */
export const CLASS_COLORS: Record<WordClass, { bg: string; border: string }> = {
  pronoun: { bg: '#FFF3BF', border: '#E0B400' },
  people: { bg: '#FFF3BF', border: '#E0B400' },
  verb: { bg: '#DDF4DA', border: '#3E9B4F' },
  descriptor: { bg: '#DCEAFF', border: '#3B78D8' },
  noun: { bg: '#FFE6CF', border: '#E9822B' },
  little: { bg: '#F2F4F7', border: '#98A2B3' },
  question: { bg: '#EEE1FF', border: '#8B5CD6' },
  social: { bg: '#FFE0EC', border: '#DD4C8F' },
  negation: { bg: '#FFDEDE', border: '#D63B3B' },
  folder: { bg: '#FFFFFF', border: '#667085' },
};

export const CLASS_ORDER: WordClass[] = [
  'pronoun', 'people', 'verb', 'descriptor', 'noun', 'little', 'question', 'social', 'negation', 'folder',
];

export const CLASS_NAMES: Record<WordClass, Record<UiLang, string>> = {
  pronoun: { fr: 'Pronoms', en: 'Pronouns', ar: 'ضمائر' },
  people: { fr: 'Personnes', en: 'People', ar: 'أشخاص' },
  verb: { fr: 'Verbes', en: 'Verbs', ar: 'أفعال' },
  descriptor: { fr: 'Descripteurs', en: 'Describing', ar: 'صفات' },
  noun: { fr: 'Noms', en: 'Nouns', ar: 'أسماء' },
  little: { fr: 'Petits mots', en: 'Little words', ar: 'كلمات صغيرة' },
  question: { fr: 'Questions', en: 'Questions', ar: 'أسئلة' },
  social: { fr: 'Social', en: 'Social', ar: 'اجتماعي' },
  negation: { fr: 'Négation', en: 'Negation', ar: 'نفي' },
  folder: { fr: 'Dossier', en: 'Folder', ar: 'مجلد' },
};

export const radius = { sm: 8, md: 12, lg: 16 };

const hex = (h: string) => {
  const v = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};

/** Mixes white with `color`: 0 = white, 1 = the full colour. Used for per-card colour strength. */
export function tint(color: string, strength: number): string {
  const k = Math.max(0, Math.min(1, strength));
  return (
    '#' +
    hex(color)
      .map((c) => Math.round(255 + (c - 255) * k).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** True when white text reads better than dark text on this background. */
export function isDarkColor(color: string): boolean {
  if (!color.startsWith('#') || color.length !== 7) return false;
  const [r, g, b] = hex(color).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.28;
}
