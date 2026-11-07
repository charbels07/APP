import type { WordClass } from '../model/types';

export const C = {
  bg: '#EEF1F5',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F8FA',
  text: '#1B2430',
  textMuted: '#5B6675',
  border: '#D5DBE3',
  rail: '#1F2A37',
  railActive: '#33475E',
  railText: '#E8EEF5',
  accent: '#2563EB',
  accentSoft: '#DBE7FF',
  help: '#D92D20',
  helpSoft: '#FEE4E2',
  edit: '#B54708',
  editSoft: '#FEF0C7',
  success: '#12805C',
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

export const CLASS_NAMES: Record<WordClass, { fr: string; en: string }> = {
  pronoun: { fr: 'Pronoms', en: 'Pronouns' },
  people: { fr: 'Personnes', en: 'People' },
  verb: { fr: 'Verbes', en: 'Verbs' },
  descriptor: { fr: 'Descripteurs', en: 'Describing' },
  noun: { fr: 'Noms', en: 'Nouns' },
  little: { fr: 'Petits mots', en: 'Little words' },
  question: { fr: 'Questions', en: 'Questions' },
  social: { fr: 'Social', en: 'Social' },
  negation: { fr: 'Négation', en: 'Negation' },
  folder: { fr: 'Dossier', en: 'Folder' },
};

export const radius = { sm: 8, md: 12, lg: 16 };
