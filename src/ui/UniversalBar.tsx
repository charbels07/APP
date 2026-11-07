import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../state/AppState';
import { Icon, type IconName } from './Icon';
import { C } from './theme';

export const formatTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Universal bar (spec §6): always visible, same position on every screen.
 * CAA and Help can never be hidden; TLA / Schedule / Timer are optional per profile.
 */
export function UniversalBar({ vertical }: { vertical: boolean }) {
  const app = useApp();
  const { width } = useWindowDimensions();
  const iconsOnly = !vertical && width < 520;
  const { t, view, path, overlay, profile, timer, editMode } = app;
  const bar = profile.settings.bar;
  const timerLabel = timer.endAt || (timer.remainingMs > 0 && timer.remainingMs < timer.totalMs) ? formatTime(timer.remainingMs) : t.timer;
  const langCode = profile.settings.lang === 'ar' ? 'ع' : profile.settings.lang.toUpperCase();

  const main: { key: string; icon: IconName; label: string; onPress: () => void; active: boolean; show: boolean; tone?: 'help' }[] = [
    {
      key: 'caa',
      icon: 'home',
      label: t.caa,
      onPress: () => {
        app.goHome();
        app.clearHighlight();
      },
      active: view === 'board' && path.length === 1 && !overlay,
      show: true,
    },
    { key: 'tla', icon: 'grid', label: t.tla, onPress: () => app.openTla(), active: view === 'tla', show: bar.tla },
    { key: 'schedule', icon: 'calendar', label: t.schedule, onPress: app.openSchedule, active: view === 'schedule', show: bar.schedule },
    {
      key: 'timer',
      icon: 'timer',
      label: timerLabel,
      onPress: () => app.setTimerOpen(!timer.open),
      active: timer.open || !!timer.endAt,
      show: bar.timer,
    },
    { key: 'help', icon: 'help', label: t.help, onPress: app.pressHelp, active: overlay?.kind === 'help', show: true, tone: 'help' },
  ];

  const tools: { key: string; icon: IconName; label: string; onPress: () => void; active: boolean; badge?: string }[] = [
    { key: 'search', icon: 'search', label: t.search, onPress: () => app.setOverlay({ kind: 'search' }), active: overlay?.kind === 'search' },
    { key: 'keyboard', icon: 'keyboard', label: t.keyboard, onPress: () => app.setOverlay({ kind: 'keyboard' }), active: overlay?.kind === 'keyboard' },
    { key: 'lang', icon: 'globe', label: t.language, onPress: () => app.setOverlay({ kind: 'lang' }), active: overlay?.kind === 'lang', badge: langCode },
    {
      key: 'lock',
      icon: editMode ? 'unlock' : 'lock',
      label: t.caregiver,
      onPress: () => (editMode ? app.setEditMode(false) : app.setOverlay({ kind: 'pin' })),
      active: editMode,
    },
  ];

  return (
    <View style={[styles.bar, vertical ? styles.vertical : styles.horizontal]}>
      <View style={[styles.group, vertical ? { flexDirection: 'column' } : { flexDirection: 'row', flex: 5 }]}>
        {main
          .filter((m) => m.show)
          .map(({ key, ...m }) => (
            <BarButton key={key} {...m} vertical={vertical} big iconsOnly={iconsOnly} />
          ))}
      </View>
      <View style={[styles.group, vertical ? { flexDirection: 'column' } : { flexDirection: 'row', flex: 4 }]}>
        {tools.map(({ key, ...m }) => (
          <BarButton key={key} {...m} vertical={vertical} iconsOnly={iconsOnly} />
        ))}
      </View>
    </View>
  );
}

function BarButton({
  icon,
  label,
  onPress,
  active,
  tone,
  big,
  badge,
  vertical,
  iconsOnly,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  active: boolean;
  tone?: 'help';
  big?: boolean;
  badge?: string;
  vertical: boolean;
  iconsOnly?: boolean;
}) {
  const isHelp = tone === 'help';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        vertical ? (big ? styles.btnBigV : styles.btnSmallV) : styles.btnH,
        active && styles.active,
        isHelp && styles.help,
        pressed && { opacity: 0.7 },
      ]}
    >
      <View>
        <Icon name={icon} size={big ? 30 : 24} color={isHelp ? '#fff' : C.railText} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {!iconsOnly && (
        <Text numberOfLines={1} style={[styles.label, big && styles.labelBig, isHelp && { color: '#fff' }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: C.rail, justifyContent: 'space-between' },
  vertical: { width: 96, paddingVertical: 8, paddingHorizontal: 6, gap: 10 },
  horizontal: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6, gap: 6 },
  group: { gap: 6 },
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 3 },
  btnBigV: { minHeight: 74 },
  btnSmallV: { minHeight: 54 },
  btnH: { flex: 1, minHeight: 60, paddingHorizontal: 2 },
  active: { backgroundColor: C.railActive },
  help: { backgroundColor: C.help },
  label: { color: C.railText, fontSize: 11, fontWeight: '600' },
  labelBig: { fontSize: 13, fontWeight: '800' },
  badge: {
    position: 'absolute',
    right: -12,
    bottom: -6,
    backgroundColor: C.accent,
    borderRadius: 6,
    paddingHorizontal: 3,
    minWidth: 18,
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
