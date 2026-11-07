import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { strings, type UiStrings } from '../i18n/ui';
import { renderStrip, toSegments } from '../lib/grammar';
import { audioOf, label } from '../lib/lexicon';
import type { Location } from '../lib/search';
import { beep, speakSegments, speakText, stopSpeech } from '../lib/speech';
import { loadProfile, saveProfile } from '../lib/storage';
import type { Lang, Profile, StripItem } from '../model/types';

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
  | { kind: 'scheduleEditor'; id: string };

export interface Highlight {
  board: string;
  index: number;
  /** Next hop once the user opens the highlighted folder. */
  then?: { board: string; index: number };
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
  touchConcept: (conceptId: string) => void;
  addText: (text: string) => void;
  speakStrip: () => void;
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

  const speakConcept = useCallback((conceptId: string) => {
    const p = profileRef.current;
    const l = p.settings.lang;
    const audio = audioOf(p, conceptId, l);
    speakSegments(
      audio ? [{ kind: 'audio', media: audio }] : [{ kind: 'tts', text: label(p, conceptId, l), lang: l }],
      p.settings,
    );
  }, []);

  const touchConcept = useCallback(
    (conceptId: string) => {
      const p = profileRef.current;
      if (p.settings.speakOnTap || !p.settings.addToStrip) speakConcept(conceptId);
      if (p.settings.addToStrip) {
        const item: StripItem = { key: newKey(), kind: 'concept', concept: conceptId, lang: p.settings.lang };
        editStrip((s) => [...s, item]);
      }
    },
    [editStrip, speakConcept],
  );

  const addText = useCallback(
    (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const item: StripItem = { key: newKey(), kind: 'text', text: clean, lang: profileRef.current.settings.lang };
      editStrip((s) => [...s, item]);
    },
    [editStrip],
  );

  const speakStrip = useCallback(() => {
    const p = profileRef.current;
    const items = stripRef.current;
    if (items.length) speakSegments(toSegments(renderStrip(items, p)), p.settings);
  }, []);

  const deleteLast = useCallback(() => editStrip((s) => (s.length ? s.slice(0, -1) : s)), [editStrip]);

  const clearStrip = useCallback(() => {
    stopSpeech();
    editStrip((s) => (s.length ? [] : s));
  }, [editStrip]);

  const undo = useCallback(() => {
    setStripState((s) =>
      s.history.length ? { items: s.history[s.history.length - 1], history: s.history.slice(0, -1) } : s,
    );
  }, []);

  const goHome = useCallback(() => {
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
    setView('schedule');
    setOverlay(null);
  }, []);

  const pressHelp = useCallback(() => {
    const p = profileRef.current;
    // Level 1: speak immediately, without any intermediate menu (spec §18).
    speakText(p.help.message[p.settings.lang], p.settings.lang, p.settings);
    setOverlay({ kind: 'help' });
  }, []);

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
      openFolder, goBack, openTla, openSchedule, pressHelp, highlight, showMeWhere, clearHighlight, timer,
      startTimer, pauseTimer, resumeTimer, resetTimer, setTimerOpen,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
