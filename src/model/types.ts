/**
 * Core data model.
 *
 * Every word is a language-independent *concept* (spec §24). A concept keeps the
 * same position on a board whatever the active language; only its label, voice
 * and grammar change.
 */

export type Lang = 'fr' | 'en' | 'ar';
export const LANGS: Lang[] = ['fr', 'en', 'ar'];

/** Navigation language (menus, buttons, guide) — chosen separately from the words' language. */
export type UiLang = 'fr' | 'en' | 'ar';

/** Modified Fitzgerald key categories, used for cell colours. */
export type WordClass =
  | 'pronoun'
  | 'people'
  | 'verb'
  | 'descriptor'
  | 'noun'
  | 'little'
  | 'question'
  | 'social'
  | 'negation'
  | 'folder';

export type Gender = 'm' | 'f';

/** How a symbol is drawn. */
export type SymbolRef =
  | { kind: 'arasaac'; id: number }
  | { kind: 'emoji'; value: string }
  /** A personal photo stored in the media store (see lib/media). */
  | { kind: 'media'; name: string };

export type CellDisplay = 'both' | 'image' | 'text';

/** A pictogram that opens another app (YouTube, WhatsApp, Spotify…). */
export interface AppLink {
  /** Web or app link; empty = not set up yet (the family is asked to add it). */
  url: string;
  /** Words that open the app when the spoken sentence mentions them (any language). */
  triggers: string[];
}

export interface Concept {
  id: string;
  cls: WordClass;
  labels: Record<Lang, string>;
  /** Feminine forms, used when the user's profile is set to feminine. */
  labelsF?: Partial<Record<Lang, string>>;
  emoji: string;
  /** Extra search words (synonyms, semantic tags), any language. */
  tags?: string[];
  /** Set for concepts created by the family / professional. */
  custom?: boolean;
  /** This word opens an app. */
  app?: AppLink;
}

/** User edits layered on top of a built-in concept (never mutates the default). */
export interface ConceptOverride {
  labels?: Partial<Record<Lang, string>>;
  symbol?: SymbolRef;
  /** Recorded audio per language: media-store file names. */
  audio?: Partial<Record<Lang, string>>;
  display?: CellDisplay;
  cls?: WordClass;
  /** App link set by the family; `false` turns a built-in app word back into a plain word. */
  app?: AppLink | false;
  /** Author and licence of a picture taken from the web. */
  credit?: string;
}

export interface Cell {
  concept: string;
  /** If set, the cell is a folder that opens this board. */
  folder?: string;
  /** Progressive reveal: the cell is visible from this level (1–3). */
  level?: 1 | 2 | 3;
  /** Card size inside its slot (0.6–1). Default 1. */
  size?: number;
  /** Spread over neighbouring empty slots: [columns, rows]. Default [1, 1]. */
  span?: [number, number];
  /** Strength of the background colour (0 = white … 1 = full colour). Default: soft tint. */
  intensity?: number;
}

export type BoardKind = 'core' | 'folder' | 'tla';

export interface Board {
  id: string;
  kind: BoardKind;
  /** Concept used for the board's title and icon. */
  concept: string;
  rows: number;
  cols: number;
  /** Row-major, length rows*cols. `null` = empty slot. */
  cells: (Cell | null)[];
}

export interface ScheduleStep {
  id: string;
  concept: string;
  done: boolean;
  /** Opens this TLA when the step is touched. */
  tla?: string;
  /** Suggested timer duration for this step, in minutes. */
  timerMin?: number;
}

export interface Schedule {
  id: string;
  /** Custom name; empty = use the concept's label in the active language. */
  title: string;
  /** Concept used as the schedule's icon. */
  concept: string;
  recurring: boolean;
  steps: ScheduleStep[];
}

export type TimerDisplay = 'circle' | 'bar' | 'digits';

export interface Settings {
  lang: Lang;
  uiLang: UiLang;
  gender: Gender;
  revealLevel: 1 | 2 | 3;
  symbolSet: 'arasaac' | 'emoji';
  showLabels: boolean;
  /** Speak each word when it is touched. */
  speakOnTap: boolean;
  /** Add touched words to the sentence strip (off = speak immediately only). */
  addToStrip: boolean;
  /** Automatic agreement (conjugation, elision, negation) in the strip. */
  grammar: boolean;
  /** Fixed zone with urgent/repair messages (spec §7). */
  quickZone: boolean;
  /** Optional universal-bar buttons (CAA and Help can never be hidden). */
  bar: { tla: boolean; schedule: boolean; timer: boolean };
  speechRate: number;
  voices: Partial<Record<Lang, string>>;
  pin: string;
  timer: { display: TimerDisplay[]; sound: boolean; haptic: boolean };
  /** Speed of demonstrations and dictation replays (1 = normal, higher = slower). */
  modelPace: number;
  /** Let the app ask an AI for TLA proposals and to recognise drawings (only the topic or drawing is sent). */
  aiSuggestions: boolean;
  /** Pictograms wiggle when touched and while they are being said. */
  wiggle: boolean;
  /** Open an app when the spoken sentence mentions it ("je veux écouter de la musique" → Spotify). */
  autoOpenApps: boolean;
  /** Synthetic voice: the device's default, a woman's or a man's (picked per language, see lib/voices). */
  voiceKind: 'device' | 'f' | 'm';
  /** Child voice = the chosen voice, higher pitched (tablets have no real child voices). */
  voiceAge: 'adult' | 'child';
  /** Seconds before the same pictogram can be pressed again (0 = no limit). */
  repeatDelay: number;
  /** Languages the child communicates in (the first is the main one); `lang` is the one in use. */
  langs: Lang[];
  /** Standard, larger text and buttons, or high contrast (dark cards, bright borders). */
  visual: 'standard' | 'large' | 'contrast';
  /** Picture size inside the cards: normal, or larger (with a smaller label). */
  pictoSize: 'normal' | 'large';
  /** Fewer animations (no pulsing highlights, no wiggling). */
  reduceMotion: boolean;
  /** Small vibration when a pictogram is touched (phones; iPads have no vibration motor). */
  haptics: boolean;
  /**
   * How the child selects a pictogram: when the finger lifts (standard), as soon as it touches
   * (for children who slide), or by holding it (`holdTime` seconds: avoids accidental touches).
   */
  access: 'release' | 'press' | 'hold';
  holdTime: number;
  /** Optional plans shown in Planning, next to the day plan (chosen at set-up or in Settings). */
  plans: { week: boolean; month: boolean };
  /**
   * What the app records about the child's communication (parent's choice, off by default):
   * 'usage' = when and how much (no words), 'vocabulary' = + which words,
   * 'language' = + the sentences said (language samples). Never while an adult models or edits.
   */
  dataCollection: 'off' | 'usage' | 'vocabulary' | 'language';
  /** The family lets the app's team use anonymous statistics (no name, no words). */
  shareStats: 'none' | 'anonymous';
}

/** A picture in the week plan (for one weekday). */
export interface PlanItem {
  id: string;
  concept: string;
}

/** An event of the month plan (birthday, holiday, doctor…). */
export interface MonthEvent {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  concept: string;
}

export interface HelpConfig {
  /** Level 1: spoken immediately. */
  message: Record<Lang, string>;
  /** Level 2: quick choices (concept ids). */
  options: string[];
  /** Level 3: shown only on explicit request, never on a locked screen. */
  howICommunicate: string;
  emergencyContact: string;
}

export interface Profile {
  version: 1;
  settings: Settings;
  boards: Record<string, Board>;
  tlaOrder: string[];
  lastTla?: string;
  schedules: Schedule[];
  activeSchedule?: string;
  /** Custom First–Then pair; empty = follow the active schedule. */
  firstThen?: { first?: string; then?: string };
  overrides: Record<string, ConceptOverride>;
  customConcepts: Record<string, Concept>;
  help: HelpConfig;
  /** Recorded demonstrations (modelling), replayed with an animated pointer. */
  demos: Demo[];
  /** Week plan: pictures per weekday, '0' = Monday … '6' = Sunday. */
  weekPlan?: Record<string, PlanItem[]>;
  /** Month plan: events by id. */
  monthPlan?: Record<string, MonthEvent>;
  /** One-time additions already applied to this profile (so a removed item is not added back). */
  migrations?: string[];
  /** In-app guide: welcome card dismissed, chapters already read. */
  guide?: {
    seen?: boolean;
    read?: string[];
    /** Open the guide when the board first appears (end of the set-up journey). */
    openOnStart?: boolean;
    /** From the set-up questions: the guide starts with what matters for this child. */
    tailored?: { newToAac: boolean; speech?: string };
  };
}

/** One recorded action of a demonstration. */
export type DemoStep =
  | { kind: 'tap'; concept: string; board: string; index: number; path: string[] }
  /** A word without a known position (quick zone, dictation): replay finds it on the boards. */
  | { kind: 'word'; concept: string }
  | { kind: 'text'; text: string }
  | { kind: 'speak' }
  | { kind: 'delete' }
  | { kind: 'clear' };

export interface Demo {
  id: string;
  title: string;
  lang: Lang;
  steps: DemoStep[];
}

/** An item in the sentence strip. */
export type StripItem =
  | { key: string; kind: 'concept'; concept: string; lang: Lang }
  | { key: string; kind: 'text'; text: string; lang: Lang };
