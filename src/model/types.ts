/**
 * Core data model.
 *
 * Every word is a language-independent *concept* (spec §24). A concept keeps the
 * same position on a board whatever the active language; only its label, voice
 * and grammar change.
 */

export type Lang = 'fr' | 'en' | 'ar';
export const LANGS: Lang[] = ['fr', 'en', 'ar'];

export type UiLang = 'fr' | 'en';

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
}

/** User edits layered on top of a built-in concept (never mutates the default). */
export interface ConceptOverride {
  labels?: Partial<Record<Lang, string>>;
  symbol?: SymbolRef;
  /** Recorded audio per language: media-store file names. */
  audio?: Partial<Record<Lang, string>>;
  display?: CellDisplay;
  cls?: WordClass;
}

export interface Cell {
  concept: string;
  /** If set, the cell is a folder that opens this board. */
  folder?: string;
  /** Progressive reveal: the cell is visible from this level (1–3). */
  level?: 1 | 2 | 3;
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
}

/** An item in the sentence strip. */
export type StripItem =
  | { key: string; kind: 'concept'; concept: string; lang: Lang }
  | { key: string; kind: 'text'; text: string; lang: Lang };
