import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import type { TimerDisplay } from '../model/types';
import { useApp } from '../state/AppState';
import { Btn } from './common';
import { Icon } from './Icon';
import { formatTime } from './UniversalBar';
import { C, radius } from './theme';

const QUICK = [1, 2, 5, 10];

/** Non-blocking timer (spec §17): floats over the board, keeps running in the background. */
export function TimerCard() {
  const app = useApp();
  const { timer, t, profile } = app;
  const [customMin, setCustomMin] = useState(3);
  const [showOptions, setShowOptions] = useState(false);
  if (!timer.open) return null;

  const displays = profile.settings.timer.display;
  const fraction = timer.totalMs ? timer.remainingMs / timer.totalMs : 0;
  const running = !!timer.endAt;
  const paused = !running && timer.remainingMs > 0 && timer.remainingMs < timer.totalMs;

  const toggleDisplay = (d: TimerDisplay) =>
    app.update((p) => {
      const cur = p.settings.timer.display;
      const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d];
      p.settings.timer.display = next.length ? next : [d];
    });

  return (
    <View style={styles.card} pointerEvents="box-none">
      <View style={styles.head}>
        <Icon name="timer" size={22} color={C.accent} />
        <Text style={styles.title}>{t.timer}</Text>
        <Pressable onPress={() => setShowOptions((v) => !v)} style={styles.iconBtn} accessibilityLabel={t.display}>
          <Icon name="settings" size={20} color={C.textMuted} />
        </Pressable>
        <Pressable onPress={() => app.setTimerOpen(false)} style={styles.iconBtn} accessibilityLabel={t.close}>
          <Icon name="minus" size={22} />
        </Pressable>
      </View>

      <View style={styles.display}>
        {displays.includes('circle') && <Ring fraction={fraction} done={timer.finished} />}
        <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
          {displays.includes('digits') && (
            <Text style={[styles.digits, timer.finished && { color: C.success }]}>
              {timer.finished ? t.timerDone : formatTime(timer.remainingMs)}
            </Text>
          )}
          {displays.includes('bar') && (
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${Math.max(0, Math.min(1, fraction)) * 100}%` }]} />
            </View>
          )}
        </View>
      </View>

      <View style={styles.quick}>
        {QUICK.map((m) => (
          <Btn key={m} small label={`${m} ${t.minutes}`} onPress={() => app.startTimer(m)} style={{ flex: 1, paddingHorizontal: 4 }} />
        ))}
      </View>
      <View style={styles.quick}>
        <Btn small icon="minus" accessibilityLabel="-" onPress={() => setCustomMin((m) => Math.max(1, m - 1))} />
        <Btn small label={`${t.start} ${customMin} ${t.minutes}`} onPress={() => app.startTimer(customMin)} style={{ flex: 1 }} />
        <Btn small icon="plus" accessibilityLabel="+" onPress={() => setCustomMin((m) => Math.min(120, m + 1))} />
      </View>
      <View style={styles.quick}>
        {running ? (
          <Btn small icon="pause" label={t.pause} onPress={app.pauseTimer} style={{ flex: 1 }} />
        ) : (
          <Btn small kind="primary" icon="play" label={paused ? t.resume : t.start} onPress={paused ? app.resumeTimer : () => app.startTimer(timer.totalMs / 60000)} style={{ flex: 1 }} />
        )}
        <Btn small icon="undo" accessibilityLabel={t.reset} onPress={app.resetTimer} />
      </View>

      {showOptions && (
        <View style={styles.options}>
          <View style={styles.quick}>
            {(['circle', 'bar', 'digits'] as TimerDisplay[]).map((d) => (
              <Btn key={d} small kind={displays.includes(d) ? 'primary' : 'secondary'} label={t[d]} onPress={() => toggleDisplay(d)} style={{ flex: 1 }} />
            ))}
          </View>
          <View style={styles.quick}>
            <Btn
              small
              kind={profile.settings.timer.sound ? 'primary' : 'secondary'}
              icon="volume"
              label={t.sound}
              onPress={() => app.update((p) => void (p.settings.timer.sound = !p.settings.timer.sound))}
              style={{ flex: 1 }}
            />
            <Btn
              small
              kind={profile.settings.timer.haptic ? 'primary' : 'secondary'}
              label={t.vibration}
              onPress={() => app.update((p) => void (p.settings.timer.haptic = !p.settings.timer.haptic))}
              style={{ flex: 1 }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function Ring({ fraction, done }: { fraction: number; done: boolean }) {
  const size = 110;
  const stroke = 14;
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
  card: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 330,
    maxWidth: '96%',
    backgroundColor: C.surface,
    borderRadius: radius.lg,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
    zIndex: 40,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 18, fontWeight: '800', color: C.text },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  display: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  digits: { fontSize: 44, fontWeight: '800', color: C.text, fontVariant: ['tabular-nums'] },
  barTrack: { height: 16, borderRadius: 8, backgroundColor: '#E4E7EC', overflow: 'hidden', alignSelf: 'stretch' },
  barFill: { height: '100%', backgroundColor: C.accent, borderRadius: 8 },
  quick: { flexDirection: 'row', gap: 6 },
  options: { gap: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: C.border },
});
