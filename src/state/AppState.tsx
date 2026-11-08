import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { strings, type UiStrings } from '../i18n/ui';
import { appLinkOf, findAppInSentence, isIncomplete, openAppUrl } from '../lib/appLinks';
import { joinTokens, renderStrip, toSpeechPlan } from '../lib/grammar';
import { audioOf, label } from '../lib/lexicon';
import { locate, type Location } from '../lib/search';
import { beep, speakSegments, speakText, stopSpeech } from '../lib/speech';
import { loadProfile, saveProfile } from '../lib/storage';
import type { DemoStep, Lang, Profile, StripItem } from '../model/types';

export type View = 'board' | 'tla' | 'schedule';

export type Overlay =
  | null
  | { kind: 'search' }
  | { kind: 'keyboard' }
  | { kind: 'help' }
  | { kind: 'lang' }
  | { kind: 'pin' }
  | { kind: 'settings' }
  | { kind: 'print' }
  | { kind: 'editor'; board: string; index: number }
  | { kind: 'conceptEditor'; concept: string }
  | { kind: 'picker'; title?: string; onPick: (conceptId: string) => void }
  | { kind: 'scheduleEditor'; id: string }
  | { kind: 'model' }
  | { kind: 'newTla' };

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
  /** When it opens (ms); undefined = link missing. */
  at?: number;
}

export interface TimerState {
  totalMs: number;
  remainingMs: number;
  endAt: number | null;
  finished: boolean;
  open: boolean;
}

interface AppCtx {
  profile: Profile;
  update: (recipe: (draft: Profile) => void) => void;
  replaceProfile: (p: Profile) => void;
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
  addText: (text: string) => void;
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
  openAppNow: () => void;
  cancelAppLaunch: () => void;

  /** Caregiver mode: card waiting to be moved. */
  moveSource: Slot | null;
  setMoveSource: (s: Slot | null) => void;

  highlight: Highlight | null;
  showMeWhere: (loc: Location) => void;
  clearHighlight: () => void;

  timer: TimerState;
  startTimer: (minutes: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTimerOpen: (open: boolean) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp outside provider');
  return v;
}

let keySeq = 0;
const newKey = () => `k${Date.now().toString(36)}${(keySeq++).toString(36)}`;

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    loadProfile().then(setProfile);
  }, []);
  if (!profile) return null;
  return <Loaded initial={profile}>{children}</Loaded>;
}

function Loaded({ initial, children }: { initial: Profile; children: React.ReactNode }) {
  const [profile, setProfile] = useState<Profile>(initial);
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const update = useCallback((recipe: (draft: Profile) => void) => {
    setProfile((prev) => {
      const draft = structuredClone(prev);
      recipe(draft);
      saveProfile(draft);
      return draft;
    });
  }, []);
  const replaceProfile = useCallback((p: Profile) => {
    saveProfile(p);
    setProfile(p);
  }, []);

  const lang = profile.settings.lang;
  const t = strings(profile.settings.uiLang);

  const [view, setView] = useState<View>('board');
  /** Latest navigation, readable from async replays without stale closures. */
  const viewRef = useRef<{ view: View; tlaId?: string }>({ view: 'board' });
  const [path, setPath] = useState<string[]>(['core']);
  const [tlaId, setTlaId] = useState<string | undefined>(initial.lastTla ?? initial.tlaOrder[0]);
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [editMode, setEditModeState] = useState(false);
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
  const pulse = useCallback((concept: string, key?: string, touched = false) => {
    if (!profileRef.current.settings.wiggle) return;
    setWiggle({ concept, key, n: ++wiggleSeq.current });
    // Phones also buzz (iPads have no vibration motor: the wiggle is what they get).
    if (touched) Haptics.selectionAsync().catch(() => {});
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
  const openAppNow = useCallback(() => {
    const a = appLaunchRef.current;
    clearTimeout(launchTimer.current);
    setAppLaunch(null);
    if (a?.url) openAppUrl(a.url);
  }, []);
  const launchApp = useCallback((conceptId: string) => {
    const link = appLinkOf(profileRef.current, conceptId);
    clearTimeout(launchTimer.current);
    if (!link) return;
    if (isIncomplete(link)) {
      setAppLaunch({ concept: conceptId, url: '' });
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

  const speakConcept = useCallback((conceptId: string) => {
    const p = profileRef.current;
    const l = p.settings.lang;
    pulse(conceptId);
    const audio = audioOf(p, conceptId, l);
    speakSegments(
      audio ? [{ kind: 'audio', media: audio }] : [{ kind: 'tts', text: label(p, conceptId, l), lang: l }],
      p.settings,
    );
  }, [pulse]);

  // ── Demonstration recording ──
  const recordRef = useRef<DemoStep[] | null>(null);
  const playingRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const record = useCallback((step: DemoStep) => {
    if (recordRef.current && !playingRef.current) recordRef.current.push(step);
  }, []);

  const touchConcept = useCallback(
    (conceptId: string, origin?: TapOrigin) => {
      const p = profileRef.current;
      const l = p.settings.lang;
      record(origin ? { kind: 'tap', concept: conceptId, ...origin } : { kind: 'word', concept: conceptId });
      const item: StripItem = { key: newKey(), kind: 'concept', concept: conceptId, lang: l };
      if (p.settings.speakOnTap || !p.settings.addToStrip) {
        if (p.settings.addToStrip) {
          // Say the word as it appears in the sentence: "je" + "vouloir" → "veux".
          const tokens = renderStrip([...stripRef.current, item], p);
          const tok = tokens[tokens.length - 1];
          speakSegments(tok.audio ? [{ kind: 'audio', media: tok.audio }] : [{ kind: 'tts', text: tok.text, lang: l }], p.settings);
        } else speakConcept(conceptId);
      }
      if (p.settings.addToStrip) {
        stripRef.current = [...stripRef.current, item];
        editStrip((s) => [...s, item]);
      }
      pulse(conceptId, item.key, true);
      // An app pictogram opens its app (not while a demonstration is recorded or replayed).
      if (!playingRef.current && !recordRef.current && appLinkOf(p, conceptId)) launchApp(conceptId);
    },
    [editStrip, speakConcept, record, pulse, launchApp],
  );

  const addText = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      record({ kind: 'text', text: clean });
      const item: StripItem = { key: newKey(), kind: 'text', text: clean, lang: profileRef.current.settings.lang };
      stripRef.current = [...stripRef.current, item];
      editStrip((s) => [...s, item]);
    },
    [editStrip, record],
  );

  const speakStrip = useCallback(async () => {
    const p = profileRef.current;
    const items = stripRef.current;
    record({ kind: 'speak' });
    if (!items.length) return;
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
      if (it) pulse(it.kind === 'concept' ? it.concept : '', it.key);
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
  }, [record, pulse, launchApp]);

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
    viewRef.current = { view: 'schedule' };
    setView('schedule');
    setOverlay(null);
  }, []);

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
                // Say which folder we open, and linger on it, so the child sees the way in.
                const folderIndex = p.boards.core.cells.findIndex((c) => c?.folder === loc!.board);
                const folderConcept = p.boards.core.cells[folderIndex]?.concept ?? p.boards[loc.board]?.concept;
                setDemoCaption({ text: `${ui.openingFolder} « ${label(p, folderConcept, l)} »`, concept: folderConcept });
                await sleep(250);
                // Pressed exactly like a word: the hand comes in, pushes the card, its name is said.
                if (!(await press({ board: 'core', index: folderIndex }, () => speakConcept(folderConcept)))) return;
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
    [addText, bestLocation, clearStrip, deleteLast, editStrip, speakConcept, speakStrip, stopPlaying, touchConcept],
  );

  const [moveSource, setMoveSource] = useState<Slot | null>(null);

  const showMeWhere = useCallback(
    (loc: Location) => {
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
    [openTla],
  );
  const clearHighlight = useCallback(() => setHighlight(null), []);

  // Highlights fade after a while so they never block the board.
  useEffect(() => {
    if (!highlight) return;
    const id = setTimeout(() => setHighlight(null), 12000);
    return () => clearTimeout(id);
  }, [highlight]);

  const setEditMode = useCallback((on: boolean) => {
    setEditModeState(on);
    setOverlay(null);
    setMoveSource(null);
  }, []);

  // ── Timer (keeps running while the user communicates) ──
  const [timer, setTimer] = useState<TimerState>({
    totalMs: 5 * 60000,
    remainingMs: 5 * 60000,
    endAt: null,
    finished: false,
    open: false,
  });
  const startTimer = useCallback((minutes: number) => {
    const ms = Math.max(1, Math.round(minutes * 60000));
    setTimer({ totalMs: ms, remainingMs: ms, endAt: Date.now() + ms, finished: false, open: true });
  }, []);
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
        setTimeout(() => speakText(strings(p.settings.uiLang).timeUp[l], l, p.settings), 1100);
      }
      if (p.settings.timer.haptic) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }, 200);
    return () => clearInterval(id);
  }, [timer.endAt]);

  const value: AppCtx = useMemo(
    () => ({
      profile,
      update,
      replaceProfile,
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
      openAppNow,
      cancelAppLaunch,
      moveSource,
      setMoveSource,
      highlight,
      showMeWhere,
      clearHighlight,
      timer,
      startTimer,
      pauseTimer,
      resumeTimer,
      resetTimer,
      setTimerOpen,
    }),
    [
      profile, update, replaceProfile, t, lang, view, path, tlaId, overlay, editMode, setEditMode, strip,
      stripState.history.length, touchConcept, addText, speakStrip, speakConcept, deleteLast, clearStrip, undo, goHome,
      openFolder, goBack, openTla, openSchedule, pressHelp, recording, startRecording, finishRecording,
      playing, playSteps, stopPlaying, pointer, demoCaption, wiggle, pulse, appLaunch, launchApp, openAppNow, cancelAppLaunch,
      moveSource, highlight, showMeWhere, clearHighlight, timer,
      startTimer, pauseTimer, resumeTimer, resetTimer, setTimerOpen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
