import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { TimerDisplay } from '../model/types';
import { useApp } from '../state/AppState';
import { label, symbolOf } from '../lib/lexicon';
import { Btn } from './common';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { formatTime } from './UniversalBar';
import { C, radius } from './theme';

const QUICK = [1, 2, 5, 10, 15, 30];

/**
 * Timer (spec §17), docked above the board: the board gets a little smaller instead of being
 * covered, and it keeps running when minimised (the bar shows the time left).
 * Next to it, the picture of what the child is waiting for (the pool, the park…); touching it
 * says the word, and it is said again when time is up.
 */
export function TimerCard() {
  const app = useApp();
  const { timer, t, profile, lang } = app;
  const [customMin, setCustomMin] = useState(3);
  const running = !!timer.endAt;
  const paused = !running && timer.remainingMs > 0 && timer.remainingMs < timer.totalMs;
  // Opened without a running timer: the settings show first, to choose a duration.
  const [showOptions, setShowOptions] = useState(!running && !paused);
  useEffect(() => {
    if (timer.open) setShowOptions(!timer.endAt && !(timer.remainingMs > 0 && timer.remainingMs < timer.totalMs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.open]);
  if (!timer.open) return null;

  const displays = profile.settings.timer.display;
  const fraction = timer.totalMs ? timer.remainingMs / timer.totalMs : 0;
  const concept = timer.concept;
  const pickPicto = () => app.setOverlay({ kind: 'picker', title: t.timerPickTitle, onPick: (id) => { app.setTimerConcept(id); app.setOverlay(null); } });

  const toggleDisplay = (d: TimerDisplay) =>
    app.update((p) => {
      const cur = p.settings.timer.display;
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      p.settings.timer.display = next.length ? next : [d];
    });

  return (
    <View style={styles.dock}>
      <View style={styles.main}>
        {/* What the child is waiting for */}
        <Pressable
          onPress={concept ? () => app.speakConcept(concept) : pickPicto}
          style={({ pressed }) => [styles.forBox, !concept && styles.forEmpty, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={concept ? `${t.timerFor} : ${label(profile, concept, lang)}` : t.timerChoosePicto}
        >
          {concept ? (
            <>
              <SymbolView symbol={symbolOf(profile, concept)} size={62} />
              <Text style={styles.forText} numberOfLines={1}>
                {label(profile, concept, lang)}
              </Text>
            </>
          ) : (
            <>
              <Icon name="image" size={26} color={C.textMuted} />
              <Text style={[styles.forText, { color: C.textMuted, fontSize: 12 }]} numberOfLines={2}>
                {t.timerChoosePicto}
              </Text>
            </>
          )}
        </Pressable>
        {displays.includes('circle') && <Ring fraction={fraction} done={timer.finished} size={84} />}
        <View style={styles.readout}>
          {displays.includes('digits') && (
            <Text style={[styles.digits, timer.finished && { color: C.success }]} numberOfLines={1} adjustsFontSizeToFit>
              {timer.finished ? t.timerDone : formatTime(timer.remainingMs)}
            </Text>
          )}
          {displays.includes('bar') && (
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }]} />
            </View>
          )}
        </View>
        <View style={styles.ctrls}>
          {running ? (
            <Btn small icon="pause" accessibilityLabel={t.pause} onPress={app.pauseTimer} />
          ) : (
            <Btn
              small
              kind="primary"
              icon="play"
              accessibilityLabel={paused ? t.resume : t.start}
              onPress={paused ? app.resumeTimer : () => app.startTimer(timer.totalMs / 60000)}
            />
          )}
          <Btn small icon="undo" accessibilityLabel={t.reset} onPress={app.resetTimer} />
          <Btn small kind={showOptions ? 'primary' : 'secondary'} icon="settings" accessibilityLabel={t.display} onPress={() => setShowOptions((v) => !v)} />
          <Btn small icon="minus" accessibilityLabel={t.close} onPress={() => app.setTimerOpen(false)} />
        </View>
      </View>

      {showOptions && (
        <View style={styles.options}>
          <View style={styles.quick}>
            {QUICK.map((m) => (
              <Btn key={m} small label={`${m} ${t.minutes}`} onPress={() => app.startTimer(m)} style={styles.quickBtn} />
            ))}
            <Btn small icon="minus" accessibilityLabel="-" onPress={() => setCustomMin((m) => Math.max(1, m - 1))} />
            <Btn small label={`${t.start} ${customMin} ${t.minutes}`} onPress={() => app.startTimer(customMin)} />
            <Btn small icon="plus" accessibilityLabel="+" onPress={() => setCustomMin((m) => Math.min(120, m + 1))} />
          </View>
          <View style={styles.quick}>
            <Btn small icon="image" label={concept ? t.timerChangePicto : t.timerChoosePicto} onPress={pickPicto} />
            {concept && <Btn small kind="ghost" icon="x" label={t.timerRemovePicto} onPress={() => app.setTimerConcept(null)} />}
            {(['circle', 'bar', 'digits'] as TimerDisplay[]).map((d) => (
              <Btn key={d} small kind={displays.includes(d) ? 'primary' : 'secondary'} label={t[d]} onPress={() => toggleDisplay(d)} />
            ))}
            <Btn
              small
              kind={profile.settings.timer.sound ? 'primary' : 'secondary'}
              icon="volume"
              label={t.sound}
              onPress={() => app.update((p) => void (p.settings.timer.sound = !p.settings.timer.sound))}
            />
            <Btn
              small
              kind={profile.settings.timer.haptic ? 'primary' : 'secondary'}
              label={t.vibration}
              onPress={() => app.update((p) => void (p.settings.timer.haptic = !p.settings.timer.haptic))}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function Ring({ fraction, done, size = 110 }: { fraction: number; done: boolean; size?: number }) {
  const stroke = Math.round(size / 8);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke="#E4E7EC" strokeWidth={stroke} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={done ? C.success : C.accent}
        strokeWidth={stroke}
        fill={done ? C.successSoft : 'none'}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={circ * (1 - Math.max(0, Math.min(1, fraction)))}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const styles = StyleSheet.create({
  dock: {
    backgroundColor: C.surface,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  forBox: { width: 92, minHeight: 84, alignItems: 'center', justifyContent: 'center', gap: 2, borderRadius: radius.md, borderWidth: 2, borderColor: C.accent, backgroundColor: '#F3F7FF', padding: 4 },
  forEmpty: { borderStyle: 'dashed', borderColor: C.border, backgroundColor: C.surfaceAlt },
  forText: { fontSize: 14, fontWeight: '800', color: C.text, textAlign: 'center' },
  readout: { flex: 1, minWidth: 130, gap: 6, alignItems: 'center' },
  digits: { fontSize: 42, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  barTrack: { height: 16, borderRadius: 8, backgroundColor: '#E4E7EC', overflow: 'hidden', alignSelf: 'stretch' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 8 },
  ctrls: { flexDirection: 'row', gap: 6 },
  quick: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  quickBtn: { paddingHorizontal: 10 },
  options: { gap: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.border },
});
