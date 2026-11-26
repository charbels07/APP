import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState as DeviceState, Platform } from 'react-native';
import { strings, type UiStrings } from '../i18n/ui';
import { createRepeatGuard } from '../lib/repeatGuard';
import { APPS_NEED_TAP, appLinkOf, findAppInSentence, isIncomplete, linkNeedsCode, openAppUrl } from '../lib/appLinks';
import { codeOf, idleTooLong, isAdultPanel, lastTouchAt, opensAlone, touched } from '../lib/caregiverCode';
import { clipFor } from '../lib/dialectVoice';
import { isOutside } from '../lib/outside';
import type { Patch } from '../lib/settingsPatch';
import { joinTokens, renderStrip, tokenSegment, toSpeechPlan } from '../lib/grammar';
import { audioOf, isFolderName, label } from '../lib/lexicon';
import { countFeature, setScreen, type Screen } from '../lib/product';
import { locate, type Location } from '../lib/search';
import { beep, prepareVoices, speakSegments, speakText, stopSpeech } from '../lib/speech';
import type { Cell, DemoStep, Lang, Profile, StripItem, UiLang } from '../model/types';
import { typedChips, type TypedChip } from '../lib/typedWords';
import type { UsageEvent } from './usageTracker';
import { EMPTY_WHITEBOARD, type Whiteboard } from '../lib/whiteboard';

export type View = 'board' | 'tla' | 'schedule' | 'whiteboard';

/**
 * The word picker. Choosing a word is open to the child (the timer's picture); "Create a new
 * word" belongs to the adults: outside caregiver mode it asks the code, and the picker then opens
 * again with `adult` (and `create`: straight on the new word).
 */
export interface PickerOverlay {
  kind: 'picker';
  title?: string;
  onPick: (conceptId: string) => void;
  back?: Overlay;
  adult?: boolean;
  create?: boolean;
}

/** "Write to model". `adult`: the code was typed, a demonstration can be deleted. */
export interface ModelOverlay {
  kind: 'model';
  back?: Overlay;
  adult?: boolean;
}

/**
 * What opens once the caregiver code is right. The new-board panel and printing open in caregiver
 * mode; the settings, "Lock the screen", the guide, a new word for the timer and the demonstrations
 * open on their own (the board stays in use mode). `recordDemo`: a demonstration starts recording.
 */
export type AfterCode =
  | { kind: 'newTla'; back?: Overlay }
  | { kind: 'settings'; back?: Overlay }
  | { kind: 'lock' }
  | { kind: 'guide' }
  | { kind: 'print'; back?: Overlay }
  | PickerOverlay
  | ModelOverlay
  | { kind: 'recordDemo' }
  | OpenLinkAfterCode;

/** `back` (on the panels that have it): the panel this one was opened from. */
export type Overlay =
  | null
  | { kind: 'search'; back?: Overlay }
  | { kind: 'keyboard'; back?: Overlay }
  | { kind: 'help'; back?: Overlay }
  /** Caregiver code. `then`: what opens once the code is right. */
  | { kind: 'pin'; then?: AfterCode; back?: Overlay }
  /** After the code, the family's subscription (src/ui/Billing.tsx): `then` opens with "Later". */
  | { kind: 'payment'; then?: AfterCode }
  /** `tab`: the page it opens on ("My account" from the subscription's message). */
  | { kind: 'settings'; back?: Overlay; tab?: 'account' }
  /** "Lock the screen": how the device keeps the child in the app (Guided Access, app pinning). */
  | { kind: 'lock' }
  /** `cards`: print these words as picture cards (multi-selection). */
  | { kind: 'print'; cards?: string[]; back?: Overlay }
  /** `only`: just the picture or just the recorded pronunciation. */
  | { kind: 'editor'; board: string; index: number; only?: 'image' | 'voice'; back?: Overlay }
  /** Edit mode, double tap: actions on a card or on an activity board. */
  | { kind: 'cellMenu'; board: string; index: number }
  | { kind: 'tlaMenu'; id: string }
  /** Share an activity board (send to someone, file). */
  | { kind: 'shareTla'; id: string; back?: Overlay }
  /** Multi-selection: choose the activity board the cards go to. */
  | { kind: 'moveToTla' }
  /** Use mode, long press on a folder: its most requested words, without opening it. */
  | { kind: 'peek'; folder: string }
  | { kind: 'conceptEditor'; concept: string; back?: Overlay }
  | PickerOverlay
  | { kind: 'scheduleEditor'; id: string }
  | ModelOverlay
  | { kind: 'newTla'; back?: Overlay }
  | { kind: 'newSequence' }
  | { kind: 'guide'; back?: Overlay }
  /** Words and activity boards deleted in the last 30 days (src/lib/wordBin.ts). */
  | { kind: 'wordBin'; back?: Overlay }
  /** Use mode, long press on a word: the word big over the board part of the screen (✕ returns). */
  | { kind: 'bigWord'; concept: string }
  /** The visual scene of an activity board: its big picture, chosen or changed (caregiver mode). */
  | { kind: 'scene'; id: string; back?: Overlay };

/**
 * After the caregiver code: open another app or a web page (`name`: what the sentence of the keypad
 * names, "YouTube"). See `linkNeedsCode` in src/lib/appLinks.ts.
 */
export interface OpenLinkAfterCode {
  kind: 'openLink';
  url: string;
  name: string;
}

/** Where a touched word sits, so a demonstration can replay the exact gesture. */
export interface TapOrigin {
  board: string;
  index: number;
  path: string[];
}

export interface Slot {
  board: string;
  index: number;
  /** The demonstration hand is pushing the card right now. */
  tap?: boolean;
}

export interface Highlight {
  board: string;
  index: number;
  /** Next hop once the user opens the highlighted folder. */
  then?: { board: string; index: number };
}

/** A pictogram being touched or said: cells showing this word (or this strip item) wiggle. */
export interface Wiggle {
  concept: string;
  /** Strip item being said. */
  key?: string;
  /** Increases at each new wiggle. */
  n: number;
}

/** An app about to open (countdown), or an app word whose link is missing (notice for the family). */
export interface AppLaunch {
  concept: string;
  url: string;
  /** When it opens (ms). Not set: waiting for a tap on "Open" (browser), or link missing (url ''). */
  at?: number;
  /** The browser refused to open it (pop-up blocked). */
  blocked?: boolean;
}

export interface TimerState {
  totalMs: number;
  remainingMs: number;
  endAt: number | null;
  finished: boolean;
  open: boolean;
  /** What the child is waiting for (a word shown next to the timer, said when time is up). */
  concept?: string;
}

interface AppCtx {
  /** The child's profile (settings.uiLang is the language of the person using the app). */
  profile: Profile;
  /** Set on a professional's boards: the code asked is hers (see `OwnCode`). */
  ownCode?: OwnCode;
  /** A board opened by an account of the app's team: no caregiver code is asked. */
  freeEdit: boolean;
  /**
   * The settings the person changed and has not saved yet (src/lib/settingsPatch.ts). Kept here
   * so that they are found again when the settings open again.
   */
  settingsStash: React.MutableRefObject<SettingsStash | null>;
  /** A touch (or a key) just happened: caregiver mode counts its 5 minutes from here. */
  noteTouch: () => void;
  update: (recipe: (draft: Profile) => void) => void;
  replaceProfile: (p: Profile) => void;
  /** Navigation language of the person (kept with their account, not in the child's profile). */
  setUiLang: (l: UiLang) => void;
  /** Preview before signing up: nothing is saved. */
  preview: boolean;
  t: UiStrings;
  lang: Lang;

  view: View;
  path: string[];
  tlaId: string | undefined;
  overlay: Overlay;
  setOverlay: (o: Overlay) => void;
  editMode: boolean;
  setEditMode: (on: boolean) => void;

  strip: StripItem[];
  canUndo: boolean;
  touchConcept: (conceptId: string, origin?: TapOrigin) => void;
  /** Typed text → picture cards (`chips` from lib/typedWords when the caller has the pictogram library). */
  addText: (text: string, chips?: TypedChip[]) => void;
  speakStrip: () => Promise<void>;
  speakConcept: (conceptId: string) => void;
  deleteLast: () => void;
  clearStrip: () => void;
  undo: () => void;

  goHome: () => void;
  openFolder: (boardId: string) => void;
  goBack: () => void;
  openTla: (id?: string) => void;
  openSchedule: () => void;
  /** The whiteboard (button of the bar, under the timer). */
  openWhiteboard: () => void;
  /** What is drawn on the whiteboard: kept in memory on this device only, never in the profile. */
  whiteboard: Whiteboard;
  setWhiteboard: (fn: (w: Whiteboard) => Whiteboard) => void;
  /**
   * An activity board with a visual scene: shown with its big picture (true) or as the board
   * alone. A choice of the moment on this device (the scene is shown each time the app opens).
   */
  sceneShown: (boardId: string) => boolean;
  setSceneShown: (boardId: string, shown: boolean) => void;
  pressHelp: () => void;

  /** Demonstrations (modelling): record taps, replay them with an animated pointer. */
  recording: boolean;
  startRecording: () => void;
  finishRecording: (save: boolean) => void;
  playing: boolean;
  playSteps: (steps: DemoStep[], opts?: { speakAtEnd?: boolean }) => Promise<void>;
  stopPlaying: () => void;
  pointer: Slot | null;
  /** What the replay is doing right now ("Ouvre le dossier « activités »"). */
  demoCaption: { text: string; concept?: string } | null;

  wiggle: Wiggle | null;
  /** Wiggles this word's pictograms (if the setting is on). */
  pulse: (concept: string, key?: string) => void;
  appLaunch: AppLaunch | null;
  launchApp: (conceptId: string) => void;
  /**
   * Opens another app or a web page from the board (a link in the guide): on the tablet apps,
   * after the caregiver code (`linkNeedsCode`).
   */
  openLink: (url: string, name: string) => void;
  openAppNow: () => void;
  cancelAppLaunch: () => void;

  /** Caregiver mode: card waiting to be moved. */
  moveSource: Slot | null;
  setMoveSource: (s: Slot | null) => void;
  /** Caregiver mode: cards selected together (one board at a time); null = not selecting. */
  selection: { board: string; indexes: number[] } | null;
  setSelection: (s: { board: string; indexes: number[] } | null) => void;
  /** Cards copied, waiting to be pasted into empty slots. */
  clipboard: Cell[];
  setClipboard: (c: Cell[]) => void;

  highlight: Highlight | null;
  showMeWhere: (loc: Location) => void;
  clearHighlight: () => void;

  timer: TimerState;
  /** `concept`: what the child waits for (undefined keeps the current one, null removes it). */
  startTimer: (minutes: number, concept?: string | null) => void;
  setTimerConcept: (concept: string | null) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTimerOpen: (open: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

/** The kind of screen each panel counts as, for technical problems (`SCREENS` in src/lib/product.ts). */
const OVERLAY_SCREEN: Partial<Record<NonNullable<Overlay>['kind'], Screen>> = {
  search: 'search',
  keyboard: 'keyboard',
  model: 'model',
  editor: 'editor',
  cellMenu: 'editor',
  conceptEditor: 'editor',
  picker: 'picker',
  settings: 'settings',
  guide: 'guide',
  print: 'print',
  newTla: 'newTla',
  newSequence: 'newSeq',
  scene: 'editor',
  scheduleEditor: 'newSeq',
  help: 'help',
  lock: 'lock',
  pin: 'lock',
};

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

/** For the few shared pieces also used outside a board (search field, microphone): null there. */
export function useAppMaybe(): AppCtx | null {
  return useContext(Ctx);
}

/**
 * For a panel: the "Back" of its header, when it was opened from another panel (that panel is
 * kept in the overlay's `back`). Undefined when it was opened from the board: only the cross then.
 */
export function useBack(): (() => void) | undefined {
  const { overlay, setOverlay } = useApp();
  const back = overlay && 'back' in overlay ? overlay.back : undefined;
  return back ? () => setOverlay(back) : undefined;
}

let keySeq = 0;
const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export { opensAlone };

/** Unsaved changes of the settings page (board settings and the Help button's texts). */
export interface SettingsStash {
  settings: Patch<Profile['settings']>;
  help: Patch<Profile['help']>;
}

export interface AppProviderProps {
  initial: Profile;
  /** Every change of the profile (saved on the device and sent to the server by the caller). */
  onChange: (p: Profile) => void;
  uiLang: UiLang;
  setUiLang: (l: UiLang) => void;
  /** Lets the caller replace the profile when someone else changed it. */
  subscribe?: (apply: (p: Profile) => void) => () => void;
  preview?: boolean;
  /** Communication data (with the family's consent): touches, sentences, pages… */
  onUsage?: (e: UsageEvent) => void;
  /**
   * Caregiver tools open without the caregiver code: only for the accounts of the app's own team
   * (the owner's decision). Never for anyone else, a professional included.
   */
  freeEdit?: boolean;
  /**
   * The code to ask is the signed-in professional's own code, not the one kept in the child's
   * profile (which belongs to the family): on every board a professional opens.
   */
  ownCode?: OwnCode;
  /**
   * Caregiver mode does not turn itself off here: a professional's material, which opens in
   * caregiver mode without a code inside her workspace (itself not behind a code).
   */
  staysOpen?: boolean;
  children: React.ReactNode;
}

/** A professional's own caregiver code: its value (empty = not chosen yet) and how to keep a new one. */
export interface OwnCode {
  value?: string;
  save: (code: string) => void;
}

export function AppProvider({ initial, onChange, uiLang, setUiLang, subscribe, preview = false, onUsage, freeEdit = false, ownCode, staysOpen = false, children }: AppProviderProps) {
  const usageRef = useRef(onUsage);
  usageRef.current = onUsage;
  const [stored, setProfile] = useState<Profile>(initial);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  // Everything reads the profile with the person's navigation language in it.
  const profile = useMemo(
    () => (stored.settings.uiLang === uiLang ? stored : { ...stored, settings: { ...stored.settings, uiLang } }),
    [stored, uiLang],
  );
  const profileRef = useRef(profile);
  profileRef.current = profile;
  /** The child's profile as saved (without the person's menu language mixed in). */
  const storedRef = useRef(stored);
  storedRef.current = stored;

  const update = useCallback((recipe: (draft: Profile) => void) => {
    const draft = structuredClone(storedRef.current);
    recipe(draft);
    // "The board was personalised" (a count, never what was changed).
    if (editModeRef.current) countFeature('edit');
    storedRef.current = draft;
    setProfile(draft);
    onChangeRef.current(draft);
  }, []);
  const settingsStash = useRef<SettingsStash | null>(null);
  const replaceProfile = useCallback((p: Profile) => {
    // A whole new profile ("Reset"): changes that were waiting for the old one are gone.
    settingsStash.current = null;
    const next = { ...p, settings: { ...p.settings, uiLang: storedRef.current.settings.uiLang } };
    storedRef.current = next;
    setProfile(next);
    onChangeRef.current(next);
  }, []);
  useEffect(() => subscribe?.((p) => {
    storedRef.current = p;
    setProfile(p);
  }), [subscribe]);

  const lang = profile.settings.lang;
  const t = strings(uiLang);

  // Pick the device voice for each language (woman / man, adult / child) when those settings change.
  const { voiceKind, voiceAge, voices, arabic } = profile.settings;
  const voicesKey = JSON.stringify(voices);
  useEffect(() => {
    prepareVoices(profileRef.current.settings);
  }, [voiceKind, voiceAge, voicesKey, arabic]);

  const [view, setView] = useState<View>('board');
  /** Latest navigation, readable from async replays without stale closures. */
  const viewRef = useRef<{ view: View; tlaId?: string }>({ view: 'board' });
  const [path, setPath] = useState<string[]>(['core']);
  const [tlaId, setTlaId] = useState<string | undefined>(initial.lastTla ?? initial.tlaOrder[0]);
  const [overlay, setOverlayState] = useState<Overlay>(null);
  const [editMode, setEditModeState] = useState(false);
  const freeEditRef = useRef(freeEdit);
  freeEditRef.current = freeEdit;
  /**
   * Opening a panel; where the caregiver code is not asked (freeEdit: a board opened by an
   * account of the app's team), "ask the code" opens the tools at once.
   */
  const startRecordingRef = useRef<() => void>(() => {});
  const setOverlay = useCallback((o: Overlay) => {
    if (o?.kind === 'guide') countFeature('guide');
    if (o?.kind === 'pin' && freeEditRef.current) {
      if (o.then?.kind === 'openLink') {
        void openAppUrl(o.then.url);
        setOverlayState(null);
        return;
      }
      if (o.then?.kind === 'recordDemo') return startRecordingRef.current();
      if (!opensAlone(o.then)) setEditModeState(true);
      setOverlayState(o.then ?? null);
    } else setOverlayState(o);
  }, []);
  const [stripState, setStripState] = useState<{ items: StripItem[]; history: StripItem[][] }>({
    items: [],
    history: [],
  });
  const stripRef = useRef(stripState.items);
  stripRef.current = stripState.items;
  const strip = stripState.items;
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  /** Changes the strip and records the previous state for undo. */
  const editStrip = useCallback((fn: (items: StripItem[]) => StripItem[]) => {
    setStripState((s) => {
      const next = fn(s.items);
      if (next === s.items) return s;
      return { items: next, history: [...s.history.slice(-29), s.items] };
    });
  }, []);

  // ── Wiggling pictograms (setting): when touched and while being said ──
  const [wiggle, setWiggle] = useState<Wiggle | null>(null);
  const wiggleSeq = useRef(0);
  const pulse = useCallback((concept: string, key?: string) => {
    const st = profileRef.current.settings;
    // The picture wiggles on the screen (its own switch; "fewer animations" turns it off).
    if (!st.wiggle || st.reduceMotion) return;
    setWiggle({ concept, key, n: ++wiggleSeq.current });
  }, []);

  // ── Apps (YouTube, WhatsApp…): short countdown so a mistaken touch can be cancelled ──
  const [appLaunch, setAppLaunch] = useState<AppLaunch | null>(null);
  const appLaunchRef = useRef(appLaunch);
  appLaunchRef.current = appLaunch;
  const launchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancelAppLaunch = useCallback(() => {
    clearTimeout(launchTimer.current);
    setAppLaunch(null);
  }, []);
  /** Called from the "Open" button: inside the tap, so browsers allow the new window. */
  const openAppNow = useCallback(() => {
    const a = appLaunchRef.current;
    clearTimeout(launchTimer.current);
    if (!a?.url) return setAppLaunch(null);
    openAppUrl(a.url).then((ok) => setAppLaunch(ok ? null : { concept: a.concept, url: a.url, blocked: true }));
  }, []);
  const launchApp = useCallback((conceptId: string) => {
    const link = appLinkOf(profileRef.current, conceptId);
    clearTimeout(launchTimer.current);
    if (!link) return;
    if (isIncomplete(link)) {
      setAppLaunch({ concept: conceptId, url: '' });
      return;
    }
    // Tablet apps: the caregiver code first (a parental gate before leaving the app), which also
    // lets a mistaken touch be cancelled. Caregiver mode and the app's team: the countdown below.
    if (linkNeedsCode({ os: Platform.OS, freeEdit: freeEditRef.current, caregiver: editModeRef.current })) {
      const p = profileRef.current;
      setAppLaunch(null);
      setOverlay({ kind: 'pin', then: { kind: 'openLink', url: link.url, name: label(p, conceptId, p.settings.lang) } });
      return;
    }
    // A browser would block a window opened by a timer: there the banner waits for a tap on "Open".
    if (APPS_NEED_TAP) {
      setAppLaunch({ concept: conceptId, url: link.url });
      return;
    }
    const delay = 3000;
    setAppLaunch({ concept: conceptId, url: link.url, at: Date.now() + delay });
    launchTimer.current = setTimeout(() => {
      setAppLaunch(null);
      openAppUrl(link.url);
    }, delay);
  }, []);
  useEffect(() => () => clearTimeout(launchTimer.current), []);
  const openLink = useCallback(
    (url: string, name: string) => {
      if (linkNeedsCode({ os: Platform.OS, freeEdit: freeEditRef.current, caregiver: editModeRef.current }))
        setOverlay({ kind: 'pin', then: { kind: 'openLink', url, name } });
      else void openAppUrl(url);
    },
    [setOverlay],
  );

  const speakConcept = useCallback((conceptId: string) => {
    const p = profileRef.current;
    const l = p.settings.lang;
    pulse(conceptId);
    const text = label(p, conceptId, l);
    const audio = audioOf(p, conceptId, l);
    speakSegments([tokenSegment({ text, lang: l, audio, clip: audio ? undefined : clipFor(p.settings, l, text) })], p.settings);
  }, [pulse]);

  // ── Demonstration recording ──
  const recordRef = useRef<DemoStep[] | null>(null);
  const playingRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const record = useCallback((step: DemoStep) => {
    if (recordRef.current && !playingRef.current) recordRef.current.push(step);
  }, []);

  /** Only the child's own use is recorded: never while an adult edits, records or replays. */
  const editModeRef = useRef(false);
  const emit = useCallback((e: UsageEvent) => {
    if (playingRef.current || recordRef.current || editModeRef.current) return;
    // Called before the word is said: recording must never be able to stop a touch.
    try {
      usageRef.current?.(e);
    } catch {
      /* the word is said all the same */
    }
  }, []);

  /** Same pictogram pressed again too soon: ignored (Settings → delay between two presses). */
  const repeatGuard = useRef(createRepeatGuard()).current;

  const touchConcept = useCallback(
    (conceptId: string, origin?: TapOrigin) => {
      const p = profileRef.current;
      const l = p.settings.lang;
      // A folder's name is not a word: it is never said nor put in the sentence.
      if (isFolderName(p, conceptId)) return;
      // Replays and dictation press words on purpose: only the user's own presses are limited.
      if (!playingRef.current && !repeatGuard(conceptId, (p.settings.repeatDelay ?? 0) * 1000)) return;
      record(origin ? { kind: 'tap', concept: conceptId, ...origin } : { kind: 'word', concept: conceptId });
      const boardKind = origin ? p.boards[origin.board]?.kind : undefined;
      emit({
        type: 'select',
        concept: conceptId,
        mode: !origin ? 'quick' : origin.board === 'core' ? 'core' : boardKind === 'tla' ? 'tla' : 'folder',
      });
      // For the app's team (families who agreed): "the board was used", "an activity board was used".
      if (!playingRef.current && !recordRef.current) countFeature(boardKind === 'tla' ? 'tla' : 'board');
      const item: StripItem = { key: newKey(), kind: 'concept', concept: conceptId, lang: l };
      if (p.settings.speakOnTap || !p.settings.addToStrip) {
        if (p.settings.addToStrip) {
          // Say the word as it appears in the sentence: "je" + "vouloir" → "veux".
          const tokens = renderStrip([...stripRef.current, item], p);
          const tok = tokens[tokens.length - 1];
          speakSegments([tokenSegment({ ...tok, lang: l })], p.settings);
        } else speakConcept(conceptId);
      }
      if (p.settings.addToStrip) {
        stripRef.current = [...stripRef.current, item];
        editStrip((s) => [...s, item]);
      }
      pulse(conceptId, item.key);
      // An app pictogram opens its app (not while a demonstration is recorded or replayed).
      if (!playingRef.current && !recordRef.current && appLinkOf(p, conceptId)) launchApp(conceptId);
    },
    [editStrip, speakConcept, record, pulse, launchApp, repeatGuard, emit],
  );

  const addText = useCallback(
    (text: string, chips?: TypedChip[]) => {
      const clean = text.trim();
      if (!clean) return;
      record({ kind: 'text', text: clean });
      emit({ type: 'keyboard' });
      if (!playingRef.current) countFeature('keyboard');
      const lang = profileRef.current.settings.lang;
      // One card per word, each with its picture when there is one; said exactly as typed.
      const parts = chips?.length ? chips : typedChips(profileRef.current, clean, lang);
      const items: StripItem[] = parts.map((c) => ({
        key: newKey(),
        kind: 'text',
        text: c.text,
        lang,
        ...(c.word ? { word: c.word } : {}),
        ...(c.picto ? { picto: c.picto } : {}),
      }));
      stripRef.current = [...stripRef.current, ...items];
      editStrip((s) => [...s, ...items]);
    },
    [editStrip, record, emit],
  );

  const speakStrip = useCallback(async () => {
    const p = profileRef.current;
    const items = stripRef.current;
    record({ kind: 'speak' });
    if (!items.length) return;
    emit({ type: 'speak', tokens: items.map((i) => (i.kind === 'concept' ? { c: i.concept } : { text: i.text })) });
    const { segments, marks } = toSpeechPlan(renderStrip(items, p));
    // Follow along: wiggle each word as it is said. Engines that don't report word
    // boundaries get an estimate from the text length; real boundaries replace it.
    const timers: ReturnType<typeof setTimeout>[] = [];
    const estimated = new Set<number>();
    let real = false;
    let last = -1;
    const say = (token: number) => {
      if (token === last) return;
      last = token;
      const it = items[token];
      if (it) pulse(it.kind === 'concept' ? it.concept : (it.word ?? ''), it.key);
    };
    const follow = (seg: number, charIndex: number) => {
      const m = marks[seg];
      if (!m?.length) return;
      if (charIndex > 0 && !real) {
        real = true;
        timers.forEach(clearTimeout);
      }
      say((m.filter((x) => x.start <= charIndex).pop() ?? m[0]).token);
      if (!real && !estimated.has(seg)) {
        estimated.add(seg);
        const charsPerSecond = 14 * (p.settings.speechRate || 1);
        for (const x of m.slice(1)) timers.push(setTimeout(() => !real && say(x.token), (x.start / charsPerSecond) * 1000));
      }
    };
    await speakSegments(segments, p.settings, p.settings.wiggle ? follow : undefined);
    timers.forEach(clearTimeout);
    // « je veux écouter de la musique » → Spotify (unless the sentence changed meanwhile).
    if (p.settings.autoOpenApps && !playingRef.current && !recordRef.current && stripRef.current === items) {
      const app = findAppInSentence(profileRef.current, items);
      if (app) launchApp(app);
    }
  }, [record, pulse, launchApp, emit]);

  const deleteLast = useCallback(() => {
    record({ kind: 'delete' });
    stripRef.current = stripRef.current.slice(0, -1);
    editStrip((s) => (s.length ? s.slice(0, -1) : s));
  }, [editStrip, record]);

  const clearStrip = useCallback(() => {
    stopSpeech();
    record({ kind: 'clear' });
    stripRef.current = [];
    editStrip((s) => (s.length ? [] : s));
  }, [editStrip, record]);

  const undo = useCallback(() => {
    setStripState((s) =>
      s.history.length ? { items: s.history[s.history.length - 1], history: s.history.slice(0, -1) } : s,
    );
  }, []);

  const goHome = useCallback(() => {
    viewRef.current = { view: 'board' };
    setView('board');
    setPath(['core']);
    setOverlay(null);
  }, []);

  const openFolder = useCallback((boardId: string) => {
    setPath((p) => [...p, boardId]);
    setHighlight((h) => (h?.then && h.then.board === boardId ? { board: h.then.board, index: h.then.index } : h));
  }, []);

  const goBack = useCallback(() => setPath((p) => (p.length > 1 ? p.slice(0, -1) : p)), []);

  const openTla = useCallback(
    (id?: string) => {
      const p = profileRef.current;
      const target = id ?? p.lastTla ?? p.tlaOrder[0];
      viewRef.current = { view: 'tla', tlaId: target };
      setView('tla');
      setOverlay(null);
      if (target) {
        setTlaId(target);
        if (p.lastTla !== target) update((d) => void (d.lastTla = target));
      }
    },
    [update],
  );

  const openSchedule = useCallback(() => {
    countFeature('schedule');
    viewRef.current = { view: 'schedule' };
    setView('schedule');
    setOverlay(null);
  }, []);

  const openWhiteboard = useCallback(() => {
    viewRef.current = { view: 'whiteboard' };
    setView('whiteboard');
    setOverlay(null);
  }, []);
  const [whiteboard, setWhiteboardState] = useState<Whiteboard>(EMPTY_WHITEBOARD);
  const setWhiteboard = useCallback((fn: (w: Whiteboard) => Whiteboard) => setWhiteboardState(fn), []);
  const [scenesHidden, setScenesHidden] = useState<Record<string, true>>({});
  const sceneShown = useCallback((id: string) => !scenesHidden[id], [scenesHidden]);
  const setSceneShown = useCallback(
    (id: string, shown: boolean) =>
      setScenesHidden((h) => {
        if (shown === !h[id]) return h;
        const next = { ...h };
        if (shown) delete next[id];
        else next[id] = true;
        return next;
      }),
    [],
  );

  const pressHelp = useCallback(() => {
    const p = profileRef.current;
    // Level 1: speak immediately, without any intermediate menu (spec §18).
    speakText(p.help.message[p.settings.lang], p.settings.lang, p.settings);
    setOverlay({ kind: 'help' });
  }, []);


  // ── Demonstrations: replay with an animated pointer so the child sees where each word is ──
  const [playing, setPlaying] = useState(false);
  const [pointer, setPointer] = useState<Slot | null>(null);
  const [demoCaption, setDemoCaption] = useState<{ text: string; concept?: string } | null>(null);
  const playToken = useRef(0);

  const stopPlaying = useCallback(() => {
    playToken.current++;
    playingRef.current = false;
    setPlaying(false);
    setPointer(null);
    setDemoCaption(null);
  }, []);

  const startRecording = useCallback(() => {
    stopPlaying();
    stopSpeech();
    stripRef.current = [];
    editStrip((s) => (s.length ? [] : s));
    recordRef.current = [];
    setRecording(true);
    setEditModeState(false);
    setOverlay(null);
    setView('board');
    setPath(['core']);
  }, [editStrip, stopPlaying]);
  startRecordingRef.current = startRecording;

  const finishRecording = useCallback(
    (save: boolean) => {
      const steps = recordRef.current;
      recordRef.current = null;
      setRecording(false);
      if (!save || !steps?.length) return;
      const p = profileRef.current;
      const title = joinTokens(renderStrip(stripRef.current, p)) || strings(p.settings.uiLang).demoUntitled;
      update((d) => {
        d.demos.push({ id: `demo_${Date.now().toString(36)}`, title, lang: p.settings.lang, steps });
      });
    },
    [update],
  );

  /** Best place to show a word: the open TLA, then the main board, then folders, then other TLAs. */
  const bestLocation = useCallback((conceptId: string): Location | undefined => {
    const locs = (locate(profileRef.current).get(conceptId) ?? []).filter((l) => l.visible);
    const v = viewRef.current;
    return (
      (v.view === 'tla' ? locs.find((l) => l.board === v.tlaId) : undefined) ??
      locs.find((l) => l.board === 'core') ??
      locs.find((l) => l.path[0] === 'core') ??
      locs[0]
    );
  }, []);

  const playSteps = useCallback(
    async (steps: DemoStep[], opts: { speakAtEnd?: boolean } = {}) => {
      const mine = ++playToken.current;
      countFeature('model');
      playingRef.current = true;
      setPlaying(true);
      setOverlay(null);
      setEditModeState(false);
      const alive = () => playToken.current === mine;
      const pace = () => profileRef.current.settings.modelPace || 1;
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms * pace()));
      /** One press, identical for words and folders: aim, push (action), release. */
      const press = async (slot: Slot, action: () => void): Promise<boolean> => {
        setPointer(slot);
        await sleep(800);
        if (!alive()) return false;
        setPointer({ ...slot, tap: true });
        action();
        await sleep(450);
        setPointer(null);
        return alive();
      };
      stopSpeech();
      stripRef.current = [];
      editStrip((s) => (s.length ? [] : s));
      await sleep(300);

      for (const st of steps) {
        if (!alive()) return;
        if (st.kind === 'tap' || st.kind === 'word') {
          const p = profileRef.current;
          const ui = strings(p.settings.uiLang);
          const l = p.settings.lang;
          let loc: { board: string; index: number; path: string[] } | undefined =
            st.kind === 'tap' && p.boards[st.board]?.cells[st.index]?.concept === st.concept ? st : undefined;
          loc ??= bestLocation(st.concept);
          if (loc) {
            if (loc.path[0] === 'core') {
              setView('board');
              viewRef.current = { view: 'board' };
              setPath(['core']);
              if (loc.path.length > 1) {
                // Show which folder we open, and linger on it, so the child sees the way in.
                const folderIndex = p.boards.core.cells.findIndex((c) => c?.folder === loc!.board);
                const folderConcept = p.boards.core.cells[folderIndex]?.concept ?? p.boards[loc.board]?.concept;
                setDemoCaption({ text: `${ui.openingFolder} « ${label(p, folderConcept, l)} »`, concept: folderConcept });
                await sleep(250);
                // The hand comes in and pushes the card, as a finger would. Nothing is said: a folder's
                // name is not a word (touching a folder on the board says nothing either).
                if (!(await press({ board: 'core', index: folderIndex }, () => pulse(folderConcept)))) return;
                setPath(['core', loc.board]);
                await sleep(400);
              }
            } else {
              setView('tla');
              setTlaId(loc.board);
              viewRef.current = { view: 'tla', tlaId: loc.board };
            }
            await sleep(350);
            if (!alive()) return;
            setDemoCaption({ text: `${ui.touching} « ${label(p, st.concept, l)} »`, concept: st.concept });
            if (!(await press({ board: loc.board, index: loc.index }, () => touchConcept(st.concept)))) return;
            if (loc.path.length > 1) {
              setDemoCaption({ text: ui.backHome });
              setPath(['core']);
            }
          } else {
            touchConcept(st.concept);
          }
          await sleep(350);
        } else if (st.kind === 'text') {
          addText(st.text);
          await sleep(500);
        } else if (st.kind === 'speak') {
          await speakStrip();
          await sleep(300);
        } else if (st.kind === 'delete') {
          deleteLast();
          await sleep(400);
        } else if (st.kind === 'clear') {
          clearStrip();
          await sleep(400);
        }
      }
      if (alive() && opts.speakAtEnd) await speakStrip();
      if (alive()) stopPlaying();
    },
    [addText, bestLocation, clearStrip, deleteLast, editStrip, pulse, speakStrip, stopPlaying, touchConcept],
  );

  const [moveSource, setMoveSource] = useState<Slot | null>(null);
  const [selection, setSelection] = useState<{ board: string; indexes: number[] } | null>(null);
  const [clipboard, setClipboard] = useState<Cell[]>([]);

  const showMeWhere = useCallback(
    (loc: Location) => {
      emit({ type: 'search', concept: profileRef.current.boards[loc.board]?.cells[loc.index]?.concept ?? undefined });
      setOverlay(null);
      if (loc.path[0] === 'core') {
        setView('board');
        setPath(['core']);
        if (loc.path.length > 1) {
          const folderIndex = profileRef.current.boards.core.cells.findIndex((c) => c?.folder === loc.board);
          setHighlight({ board: 'core', index: folderIndex, then: { board: loc.board, index: loc.index } });
        } else {
          setHighlight({ board: 'core', index: loc.index });
        }
      } else {
        openTla(loc.board);
        setHighlight({ board: loc.board, index: loc.index });
      }
    },
    [openTla, emit],
  );
  const clearHighlight = useCallback(() => setHighlight(null), []);

  // Highlights fade after a while so they never block the board.
  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => setHighlight(null), 12000);
    return () => clearTimeout(id);
  }, [highlight]);

  editModeRef.current = editMode;
  // Pages: which board, folder, activity board, planning or keyboard is on screen.
  const pageId =
    overlay?.kind === 'keyboard' ? 'keyboard' : view === 'board' ? path[path.length - 1] : view === 'tla' ? tlaId ?? 'tla' : view === 'whiteboard' ? 'whiteboard' : 'schedule';
  useEffect(() => {
    emit({ type: 'page', page: pageId });
  }, [pageId, emit]);
  // The kind of screen (never a board's own name): told with a technical problem, if one happens.
  const overlayKind = overlay?.kind;
  const inFolder = path.length > 1;
  useEffect(() => {
    setScreen(
      (overlayKind && OVERLAY_SCREEN[overlayKind]) ||
        (overlayKind ? 'other' : view === 'board' ? (inFolder ? 'folder' : 'board') : view === 'tla' ? 'tla' : view === 'whiteboard' ? 'other' : 'schedule'),
    );
  }, [overlayKind, view, inFolder]);

  const setEditMode = useCallback((on: boolean) => {
    setEditModeState(on);
    setOverlay(null);
    setMoveSource(null);
    setSelection(null);
  }, []);

  // ── Caregiver mode turns itself off ──
  // After 5 minutes without a touch, and when the app goes to the background (the tab is hidden):
  // the next person to pick the device up is often the child. The adults' panels close with it.
  // Settings that were changed and not saved are kept (`settingsStash`). Only where a code brings
  // the person back: not for the app's team, not on a board where no code was ever chosen.
  const noteTouch = touched;
  const adultOpen = editMode || isAdultPanel(overlay);
  const guarded = adultOpen && !freeEdit && !staysOpen && !codeOf(ownCode, profile.settings.pin).unset;
  useEffect(() => {
    if (!guarded) return;
    touched();
    const leave = () => setEditMode(false);
    const check = () => {
      if (idleTooLong(lastTouchAt(), Date.now())) leave();
    };
    const timer = setInterval(check, 5000);
    const sub = DeviceState.addEventListener('change', (st) => {
      // A system screen the app opened itself (camera, share sheet…) is not "leaving".
      if (st === 'background' && !isOutside()) leave();
      else if (st === 'active') check();
    });
    // A keyboard or a mouse wheel is a touch too (a browser; the board's own touches: `noteTouch`).
    const web = Platform.OS === 'web' && typeof document !== 'undefined';
    if (web) for (const e of ['keydown', 'wheel', 'pointerdown']) document.addEventListener(e, noteTouch, { capture: true, passive: true });
    return () => {
      clearInterval(timer);
      sub?.remove();
      if (web) for (const e of ['keydown', 'wheel', 'pointerdown']) document.removeEventListener(e, noteTouch, { capture: true });
    };
  }, [guarded, setEditMode, noteTouch]);

  // ── Timer (keeps running while the user communicates) ──
  const [timer, setTimer] = useState<TimerState>({
    totalMs: 5 * 60000,
    remainingMs: 5 * 60000,
    endAt: null,
    finished: false,
    open: false,
  });
  const startTimer = useCallback((minutes: number, concept?: string | null) => {
    countFeature('timer');
    const ms = Math.max(1, Math.round(minutes * 60000));
    setTimer((cur) => ({
      totalMs: ms,
      remainingMs: ms,
      endAt: Date.now() + ms,
      finished: false,
      open: true,
      concept: concept === undefined ? cur.concept : concept ?? undefined,
    }));
  }, []);
  const setTimerConcept = useCallback((concept: string | null) => setTimer((cur) => ({ ...cur, concept: concept ?? undefined })), []);
  const pauseTimer = useCallback(
    () => setTimer((s) => (s.endAt ? { ...s, remainingMs: Math.max(0, s.endAt - Date.now()), endAt: null } : s)),
    [],
  );
  const resumeTimer = useCallback(
    () => setTimer((s) => (!s.endAt && s.remainingMs > 0 ? { ...s, endAt: Date.now() + s.remainingMs, finished: false } : s)),
    [],
  );
  const resetTimer = useCallback(
    () => setTimer((s) => ({ ...s, remainingMs: s.totalMs, endAt: null, finished: false })),
    [],
  );
  const setTimerOpen = useCallback((open: boolean) => setTimer((s) => ({ ...s, open })), []);

  const timerRef = useRef(timer);
  timerRef.current = timer;
  useEffect(() => {
    if (!timer.endAt) return;
    const id = setInterval(() => {
      const s = timerRef.current;
      if (!s.endAt) return;
      const remaining = s.endAt - Date.now();
      if (remaining > 0) {
        setTimer((cur) => (cur.endAt ? { ...cur, remainingMs: cur.endAt - Date.now() } : cur));
        return;
      }
      setTimer((cur) => ({ ...cur, remainingMs: 0, endAt: null, finished: true, open: true }));
      const p = profileRef.current;
      const l = p.settings.lang;
      if (p.settings.timer.sound) {
        beep();
        // « C’est fini ! piscine » : the word the child was waiting for, if one was chosen.
        const waited = timerRef.current.concept;
        const said = strings(p.settings.uiLang).timeUp[l] + (waited ? ` ${label(p, waited, l)}` : '');
        setTimeout(() => speakText(said, l, p.settings), 1100);
      }
    }, 200);
    return () => clearInterval(id);
  }, [timer.endAt]);

  const value: AppCtx = useMemo(
    () => ({
      profile,
      ownCode,
      freeEdit,
      settingsStash,
      noteTouch,
      update,
      replaceProfile,
      setUiLang,
      preview,
      t,
      lang,
      view,
      path,
      tlaId,
      overlay,
      setOverlay,
      editMode,
      setEditMode,
      strip,
      canUndo: stripState.history.length > 0,
      touchConcept,
      addText,
      speakStrip,
      speakConcept,
      deleteLast,
      clearStrip,
      undo,
      goHome,
      openFolder,
      goBack,
      openTla,
      openSchedule,
      openWhiteboard,
      whiteboard,
      setWhiteboard,
      sceneShown,
      setSceneShown,
      pressHelp,
      recording,
      startRecording,
      finishRecording,
      playing,
      playSteps,
      stopPlaying,
      pointer,
      demoCaption,
      wiggle,
      pulse,
      appLaunch,
      launchApp,
      openLink,
      openAppNow,
      cancelAppLaunch,
      moveSource,
      setMoveSource,
      selection,
      setSelection,
      clipboard,
      setClipboard,
      highlight,
      showMeWhere,
      clearHighlight,
      timer,
      startTimer,
      setTimerConcept,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setTimerOpen,
    }),
    [
      ownCode, freeEdit, noteTouch,
      profile, update, replaceProfile, setUiLang, preview, t, lang, view, path, tlaId, overlay, editMode, setEditMode, strip,
      stripState.history.length, touchConcept, addText, speakStrip, speakConcept, deleteLast, clearStrip, undo, goHome,
      openFolder, goBack, openTla, openSchedule, openWhiteboard, whiteboard, setWhiteboard, sceneShown, setSceneShown, pressHelp, recording, startRecording, finishRecording,
      playing, playSteps, stopPlaying, pointer, demoCaption, wiggle, pulse, appLaunch, launchApp, openLink, openAppNow, cancelAppLaunch,
      moveSource, selection, clipboard, highlight, showMeWhere, clearHighlight, timer,
      startTimer, setTimerConcept, pauseTimer, resumeTimer, resetTimer, setTimerOpen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
