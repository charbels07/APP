import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../state/AppState';
import { Icon, type IconName } from './Icon';
import { C } from './theme';

export const formatTime = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

type Tone = 'help';

interface Item {
  key: string;
  icon: IconName;
  label: string;
  onPress: () => void;
  active: boolean;
  show?: boolean;
  tone?: Tone;
  badge?: string;
}

/**
 * Universal bar (spec §6): always visible, same position on every screen.
 * CAA and Help can never be hidden; TLA / Schedule / Timer are optional per profile.
 * Help is a priority message: bigger, coloured, spoken on the first press.
 */
export function UniversalBar({ vertical }: { vertical: boolean }) {
  const app = useApp();
  const { width, height } = useWindowDimensions();
  const iconsOnly = !vertical && width < 520;
  // Tall screens (iPad landscape): tools in one column with full labels; otherwise two columns of icons.
  const toolColumn = height >= 790;
  const { t, view, path, overlay, profile, timer, editMode } = app;
  const bar = profile.settings.bar;
  const timerLabel =
    timer.endAt || (timer.remainingMs > 0 && timer.remainingMs < timer.totalMs) ? formatTime(timer.remainingMs) : t.timer;
  const langCode = profile.settings.lang === 'ar' ? 'ع' : profile.settings.lang.toUpperCase();

  const main: Item[] = [
    {
      key: 'caa',
      icon: 'home',
      label: t.caa,
      onPress: () => {
        app.goHome();
        app.clearHighlight();
      },
      active: view === 'board' && path.length === 1 && !overlay,
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
  ];
  const priority: Item[] = [
    { key: 'help', icon: 'help', label: t.help, onPress: app.pressHelp, active: overlay?.kind === 'help', tone: 'help' },
  ];
  const tools: Item[] = [
    { key: 'search', icon: 'search', label: t.search, onPress: () => app.setOverlay({ kind: 'search' }), active: overlay?.kind === 'search' },
    { key: 'keyboard', icon: 'keyboard', label: t.keyboard, onPress: () => app.setOverlay({ kind: 'keyboard' }), active: overlay?.kind === 'keyboard' },
    { key: 'model', icon: 'pointer', label: t.model, onPress: () => app.setOverlay({ kind: 'model' }), active: overlay?.kind === 'model' || app.recording },
    { key: 'guide', icon: 'book', label: t.guide, onPress: () => app.setOverlay({ kind: 'guide' }), active: overlay?.kind === 'guide' },
    { key: 'lang', icon: 'globe', label: t.language, onPress: () => app.setOverlay({ kind: 'lang' }), active: overlay?.kind === 'lang', badge: langCode },
    {
      key: 'lock',
      icon: editMode ? 'unlock' : 'lock',
      label: t.caregiver,
      onPress: () => (editMode ? app.setEditMode(false) : app.setOverlay({ kind: 'pin' })),
      active: editMode,
    },
  ];
  const visible = (items: Item[]) => items.filter((m) => m.show !== false);

  if (vertical) {
    return (
      <View style={[styles.bar, styles.vertical]}>
        <View style={styles.colGroup}>
          {visible(main).map(({ key, ...m }) => (
            <BarButton key={key} {...m} size="main" />
          ))}
          {visible(priority).map(({ key, ...m }) => (
            <BarButton key={key} {...m} size="priority" />
          ))}
        </View>
        <View style={toolColumn ? styles.colGroup : styles.toolGrid}>
          {tools.map(({ key, ...m }) => (
            <BarButton key={key} {...m} size={toolColumn ? 'toolWide' : 'tool'} iconsOnly={!toolColumn} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bar, styles.horizontal]}>
      {[...visible(main), ...visible(priority), ...tools].map(({ key, ...m }) => (
        <BarButton key={key} {...m} size={m.tone ? 'priorityRow' : 'row'} iconsOnly={iconsOnly} />
      ))}
    </View>
  );
}

function BarButton({
  icon,
  label,
  onPress,
  active,
  tone,
  badge,
  size,
  iconsOnly,
}: Omit<Item, 'key' | 'show'> & {
  size: 'main' | 'priority' | 'tool' | 'toolWide' | 'row' | 'priorityRow';
  iconsOnly?: boolean;
}) {
  const toneBg = tone === 'help' ? C.help : undefined;
  const iconSize = size === 'priority' ? 38 : size === 'priorityRow' ? 30 : size === 'main' ? 28 : 22;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        styles[size],
        active && styles.active,
        toneBg ? { backgroundColor: toneBg } : null,
        pressed && { opacity: 0.7, transform: [{ scale: 0.96 }] },
      ]}
    >
      <View>
        <Icon name={icon} size={iconSize} color={tone ? '#fff' : C.railText} strokeWidth={tone ? 2.6 : 2} />
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      {!iconsOnly && (
        <Text
          numberOfLines={1}
          style={[
            styles.label,
            (size === 'main' || size === 'row') && styles.labelMain,
            (size === 'priority' || size === 'priorityRow') && styles.labelPriority,
            tone && { color: '#fff' },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: C.rail },
  vertical: { width: 100, paddingVertical: 8, paddingHorizontal: 6, justifyContent: 'space-between', gap: 8 },
  horizontal: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6, gap: 4 },
  colGroup: { gap: 6 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, justifyContent: 'space-between' },
  btn: { alignItems: 'center', justifyContent: 'center', borderRadius: 12, gap: 3 },
  main: { minHeight: 64 },
  priority: { minHeight: 96, borderRadius: 16 },
  tool: { width: 42, minHeight: 46 },
  toolWide: { minHeight: 50 },
  row: { flex: 1, minHeight: 60, paddingHorizontal: 2 },
  priorityRow: { flex: 1.5, minHeight: 64, paddingHorizontal: 2, borderRadius: 14 },
  active: { backgroundColor: C.railActive },
  label: { color: C.railText, fontSize: 11, fontWeight: '600' },
  labelMain: { fontSize: 13, fontWeight: '800' },
  labelPriority: { fontSize: 16, fontWeight: '900' },
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
