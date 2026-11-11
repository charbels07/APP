/**
 * The child's profile questionnaire and set-up journey → the first board.
 *
 * The answers about how the child communicates today choose how many words the board shows
 * first (its "reveal level"): hidden words keep their place and appear later without anything
 * moving, so the child's motor memory is never broken.
 */
import type { Intake } from '../backend/types';
import type { Lang, Profile } from '../model/types';

export type Speech = Intake['speech'];
export type OtherWay = Intake['otherWays'][number];
export type AacBefore = Intake['aacBefore'];
export type VisualChoice = 'standard' | 'large' | 'contrast' | 'unsure';
export type FeedbackChoice = 'standard' | 'reduced' | 'later';
export type StartVocab = 'core' | 'legacy' | 'copy' | 'file';

export const SPEECH: Speech[] = ['none', 'some_words', 'speech_support', 'varies', 'unsure'];
export const OTHER_WAYS: OtherWay[] = ['gestures', 'pictures', 'other_aac', 'typing', 'expressions', 'other'];
export const AAC_BEFORE: AacBefore[] = ['new', 'cards', 'app', 'unsure'];

/** Activities offered as favourites (they go in the « mes mots » folder). */
export const ACTIVITY_CHOICES = [
  'music', 'ball', 'swing', 'slide', 'bath', 'tablet', 'tv', 'draw', 'puzzle', 'book',
  'bike', 'dance', 'sing', 'sand', 'walk', 'toys', 'read', 'park',
];

export interface Answers {
  name: string;
  age?: number;
  /** For word agreement (« content / contente »). */
  gender: 'm' | 'f';
  /** Communication languages, the first is the main one. */
  langs: Lang[];
  voiceKind: 'device' | 'f' | 'm';
  voiceAge: 'adult' | 'child';
  speech?: Speech;
  otherWays: OtherWay[];
  aacBefore?: AacBefore;
  /** Favourite activities: built-in words… */
  activities: string[];
  /** …and the family's own (new words). */
  customActivities: string[];
  visual: VisualChoice;
  feedback: FeedbackChoice;
  vocab: StartVocab;
  copyFrom?: string;
  /** Chosen in "board layout"; empty = the recommended one. */
  level?: 1 | 2 | 3;
  pictoSize: 'normal' | 'large';
  showLabels: boolean;
  access: 'release' | 'press' | 'hold';
  holdTime: number;
  repeatDelay: number;
  /** Optional plans next to the day plan. */
  planWeek: boolean;
  planMonth: boolean;
  /** Communication follow-up: nothing is pre-chosen; not answered = off. */
  dataCollection?: 'off' | 'usage' | 'vocabulary' | 'language';
}

export function emptyAnswers(lang: Lang): Answers {
  return {
    name: '',
    gender: 'm',
    langs: [lang],
    voiceKind: 'device',
    voiceAge: 'child',
    otherWays: [],
    activities: [],
    customActivities: [],
    visual: 'standard',
    feedback: 'standard',
    vocab: 'core',
    pictoSize: 'normal',
    showLabels: true,
    access: 'release',
    holdTime: 1,
    repeatDelay: 2,
    planWeek: false,
    planMonth: false,
  };
}

/** How many words the first board shows: 1 ≈ 25 first words, 2 ≈ 60, 3 = all 84. */
export function recommendedLevel(a: Pick<Answers, 'speech' | 'aacBefore'>): 1 | 2 | 3 {
  if (a.aacBefore === 'app') return 3;
  if (a.aacBefore === 'cards') return 2;
  if (a.speech === 'speech_support' || a.speech === 'varies') return 2;
  return 1;
}

/** Number of words visible on the main board at a level (for the layout screen). */
export function wordsAtLevel(p: Profile, level: 1 | 2 | 3): number {
  return p.boards.core.cells.filter((c) => c && (c.level ?? 1) <= level).length;
}

export const isNewToAac = (a: Pick<Answers, 'aacBefore'>) => a.aacBefore !== 'app' && a.aacBefore !== 'cards';

export function intakeOf(a: Answers): Intake {
  return {
    speech: a.speech ?? 'unsure',
    otherWays: a.otherWays,
    aacBefore: a.aacBefore ?? 'unsure',
    activities: [...a.activities, ...a.customActivities],
  };
}

/**
 * Applies the answers to a starting profile. `custom` are the family's own activities, already
 * turned into words (id, label and, when found, a pictogram stored on the device).
 */
export function applyAnswers(base: Profile, a: Answers, custom: { id: string; label: string; media?: string }[] = []): Profile {
  const p: Profile = JSON.parse(JSON.stringify(base));
  const st = p.settings;
  st.langs = a.langs.length ? [...a.langs] : [st.lang];
  st.lang = st.langs[0];
  st.gender = a.gender;
  st.voiceKind = a.voiceKind;
  st.voiceAge = a.voiceAge;
  st.revealLevel = a.level ?? recommendedLevel(a);
  st.visual = a.visual === 'unsure' ? 'standard' : a.visual;
  if (a.feedback === 'standard') {
    st.wiggle = true;
    st.haptics = true;
    st.reduceMotion = false;
  } else if (a.feedback === 'reduced') {
    st.wiggle = false;
    st.haptics = false;
    st.reduceMotion = true;
    st.timer = { ...st.timer, sound: false };
  }
  st.pictoSize = a.pictoSize;
  st.showLabels = a.showLabels;
  st.access = a.access;
  st.holdTime = a.holdTime;
  st.repeatDelay = a.repeatDelay;
  st.plans = { week: !!a.planWeek, month: !!a.planMonth };
  st.dataCollection = a.dataCollection ?? 'off';

  for (const c of custom) {
    p.customConcepts[c.id] = {
      id: c.id,
      cls: 'noun',
      labels: { fr: c.label, en: c.label, ar: c.label },
      emoji: '⭐',
      custom: true,
    };
    if (c.media) p.overrides[c.id] = { ...(p.overrides[c.id] ?? {}), symbol: { kind: 'media', name: c.media } };
  }
  // Favourites go into « mes mots », in the free slots only (nothing already there moves).
  const mine = p.boards.mine;
  if (mine) {
    const present = new Set(mine.cells.filter(Boolean).map((c) => c!.concept));
    const wanted = [...a.activities, ...custom.map((c) => c.id)].filter((id) => !present.has(id));
    for (let i = 0; i < mine.cells.length && wanted.length; i++) {
      if (!mine.cells[i]) mine.cells[i] = { concept: wanted.shift()! };
    }
  }
  p.guide = { ...(p.guide ?? {}), seen: false, openOnStart: true, tailored: { newToAac: isNewToAac(a), speech: a.speech } };
  return p;
}
