/**
 * Switch scanning on the board (Settings → Touch; the rules are in src/lib/scanning.ts).
 *
 * The board (Grid) says which cards it shows, row by row; this lights them in turn, with the
 * sentence's buttons first when they do something (Back in a folder, Speak, Delete). The switch
 * is a key (Space / Enter: what most switch interfaces type, listened to in a browser) or, when
 * chosen, a touch anywhere on the board and the sentence. The universal bar stays out of the
 * scan and out of the "whole screen" switch: the adults keep their way to Settings and to
 * caregiver mode (behind the code), as everywhere else.
 *
 * The scan pauses while a panel is open, in caregiver mode, during a demonstration and while an
 * app is about to open. In a browser, Escape stops it (for an adult using the keyboard); it starts
 * again with the button shown then, or when a panel has been opened and closed.
 */
import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { accessStrings } from '../i18n/access';
import { strings } from '../i18n/ui';
import {
  chooseStep,
  keyAction,
  litIds,
  nextStep,
  scanGroups,
  scanOf,
  screenAction,
  spokenId,
  startScan,
  type ScanMode,
  type ScanState,
  type SwitchAction,
} from '../lib/scanning';
import { speakPreview } from '../lib/speech';
import { useAccess } from '../state/access';
import { useApp } from '../state/AppState';
import { C, radius } from './theme';

/** A switch that bounces (or a hand that taps twice) counts once. */
const BOUNCE_MS = 200;

export function Scanner() {
  const app = useApp();
  const { scan } = useAccess();
  const { profile } = app;
  const cfg = scanOf(profile.settings);
  const a = accessStrings(profile.settings.uiLang);
  const grid = useSyncExternalStore(scan.subscribe, scan.grid, scan.grid);
  const [stopped, setStopped] = useState(false);
  const panelOpen = !!app.overlay || app.editMode;
  // A panel opened (and then closed) after Escape: scanning comes back.
  useEffect(() => {
    if (panelOpen) setStopped(false);
  }, [panelOpen]);
  const paused = panelOpen || app.playing || app.recording || !!app.appLaunch || !profile.guide?.seen || app.view === 'schedule';
  const on = cfg.mode !== 'off' && !paused && !!grid;
  const active = on && !stopped;
  const mode: ScanMode = cfg.mode === 'step' ? 'step' : 'auto';
  const rules = { mode, loops: cfg.loops };

  // What is scanned, top to bottom as on screen: the sentence's Delete and Speak (once there is a
  // sentence), a folder's Back, then the rows of the board.
  const inFolder = app.view === 'board' && app.path.length > 1;
  const hasSentence = app.strip.length > 0;
  const groups = useMemo(
    () => (grid ? scanGroups([hasSentence ? ['a:delete', 'a:speak'] : [], inFolder ? ['a:back'] : [], ...grid.rows], cfg.pattern) : []),
    [grid, hasSentence, inFolder, cfg.pattern],
  );
  // Another board, a folder, the sentence's buttons appearing, a pause: the scan starts again from the top.
  const runKey = `${active ? 'on' : 'off'}|${mode}|${grid?.key ?? ''}|${groups.map((g) => g.join(',')).join('/')}`;
  const [held, setHeld] = useState<{ key: string; s: ScanState }>(() => ({ key: runKey, s: startScan(groups) }));
  const s = held.key === runKey ? held.s : startScan(groups);
  useEffect(() => {
    if (held.key !== runKey) setHeld({ key: runKey, s: startScan(groups) });
  }, [runKey, held.key, groups]);
  const stepKey = `${runKey}#${s.level}.${s.row}.${s.item}.${s.turns}.${s.waiting}`;

  const run = (id: string) => {
    if (id === 'a:back') app.goBack();
    else if (id === 'a:speak') void app.speakStrip();
    else if (id === 'a:delete') app.deleteLast();
    else grid?.choose(id);
  };
  const lastPress = useRef(0);
  const press = (act: SwitchAction) => {
    const now = Date.now();
    if (now - lastPress.current < BOUNCE_MS || !groups.length) return;
    lastPress.current = now;
    if (act === 'next') return setHeld({ key: runKey, s: nextStep(s, groups, rules) });
    const r = chooseStep(s, groups);
    setHeld({ key: runKey, s: r.state });
    if (r.chosen) run(r.chosen);
  };
  const pressRef = useRef(press);
  pressRef.current = press;

  // Automatic scanning: the highlight moves on by itself.
  const stepRef = useRef(() => {});
  stepRef.current = () => setHeld({ key: runKey, s: nextStep(s, groups, rules) });
  useEffect(() => {
    if (!active || mode !== 'auto' || s.waiting || !groups.length) return;
    const id = setTimeout(() => stepRef.current(), cfg.speed * 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, cfg.speed]);

  // What is lit, for the board and the sentence's buttons to draw it.
  useEffect(() => {
    scan.setLit(active ? { level: s.level, ids: litIds(s, groups) } : { level: null, ids: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, scan]);
  useEffect(() => () => scan.setLit({ level: null, ids: [] }), [scan]);

  // Auditory scanning: the lit word said quietly (never a folder's name; never over a word being said).
  const lang = profile.settings.lang;
  useEffect(() => {
    if (!active || !cfg.speak) return;
    const id = spokenId(s, groups);
    if (!id) return;
    const words = strings(lang);
    const text = id === 'a:back' ? words.back : id === 'a:speak' ? words.speak : id === 'a:delete' ? words.deleteShort : grid?.word(id);
    if (text) speakPreview(text, lang, profile.settings);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, cfg.speak]);

  // The keys of a keyboard or of a switch interface (browser). Escape stops the scan.
  useEffect(() => {
    if (!active || Platform.OS !== 'web' || typeof window === 'undefined') return;
    const actionOf = (e: KeyboardEvent) => (e.ctrlKey || e.metaKey || e.altKey ? null : keyAction(e.key, mode));
    const down = (e: KeyboardEvent) => {
      if (e.key === 'Escape') return setStopped(true);
      const act = actionOf(e);
      if (!act) return;
      e.preventDefault();
      e.stopPropagation();
      if (!e.repeat) pressRef.current(act);
    };
    // The key's release must not reach a button that has the focus either.
    const up = (e: KeyboardEvent) => {
      if (!actionOf(e)) return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', down, true);
    window.addEventListener('keyup', up, true);
    return () => {
      window.removeEventListener('keydown', down, true);
      window.removeEventListener('keyup', up, true);
    };
  }, [active, mode]);

  // Step scanning with the whole screen: which half does what, shown a few seconds when the scan starts.
  const halves = active && cfg.screen && mode === 'step';
  const [halvesHint, setHalvesHint] = useState(false);
  useEffect(() => {
    setHalvesHint(halves);
    if (!halves) return;
    const id = setTimeout(() => setHalvesHint(false), 5000);
    return () => clearTimeout(id);
  }, [halves]);

  const width = useRef(0);
  if (on && stopped)
    return (
      <View style={styles.chip} accessibilityLiveRegion="polite">
        <Text style={styles.chipText}>{a.stopped}</Text>
        <Pressable
          onPress={() => setStopped(false)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.chipBtn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.chipBtnText}>{a.restart}</Text>
        </Pressable>
      </View>
    );
  if (!active) return null;
  return (
    <>
      {cfg.screen && (
        // The whole screen is the switch (not the bar: the adults' way to Settings stays there).
        <View
          style={styles.screen}
          onLayout={(e) => (width.current = e.nativeEvent.layout.width)}
          onStartShouldSetResponder={() => true}
          onResponderGrant={(e) => pressRef.current(screenAction(e.nativeEvent.locationX, width.current, mode))}
        >
          {halvesHint && (
            <View style={styles.halves} pointerEvents="none">
              <View style={styles.half}>
                <Text style={styles.halfText}>{a.next}</Text>
              </View>
              <View style={styles.half}>
                <Text style={styles.halfText}>{a.choose}</Text>
              </View>
            </View>
          )}
        </View>
      )}
      {s.waiting && (
        <View style={styles.chip} pointerEvents="none" accessibilityLiveRegion="polite">
          <Text style={styles.chipText}>{a.waiting}</Text>
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  screen: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  halves: { position: 'absolute', left: 8, right: 8, bottom: 8, flexDirection: 'row', gap: 8 },
  half: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.md, backgroundColor: C.rail, opacity: 0.85 },
  halfText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  chip: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    backgroundColor: C.rail,
    zIndex: 51,
    maxWidth: '92%',
  },
  chipText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flexShrink: 1 },
  chipBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.accent, minHeight: 44, justifyContent: 'center' },
  chipBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
