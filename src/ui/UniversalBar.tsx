import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../state/AppState';
import { useBoard } from '../state/BoardContext';
import { adminStrings } from '../i18n/admin';
import { useSession } from '../state/Session';
import { HELP_ID } from '../lib/scanning';
import { useDwellTarget, useRestMs, useScanned } from '../state/access';
import { DwellFill, ScanRing } from './AccessMarks';
import { Icon, type IconName } from './Icon';
import { useSeen } from './Seen';
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
  const board = useBoard();
  const { childLock, isAdmin, go } = useSession();
  const iconsOnly = !vertical && width < 520;
  const { t, view, path, overlay, profile, timer, editMode } = app;
  // The adult's panels: straight in while caregiver mode is open, otherwise the caregiver code first.
  const behindCode = (kind: 'settings' | 'lock') => () => app.setOverlay(editMode ? { kind } : { kind: 'pin', then: { kind } });
  const bar = profile.settings.bar;
  // For the app's team (families who agreed): which ways to a feature this bar shows.
  useSeen('board', 'search', 'guide', 'edit', bar.tla && 'tla', bar.schedule && 'schedule', bar.timer && 'timer', !!board && 'lock');
  const timerLabel =
    timer.endAt || (timer.remainingMs > 0 && timer.remainingMs < timer.totalMs) ? formatTime(timer.remainingMs) : t.timer;

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
    // One button for three tools (tabs of the same panel): find a word, write, model a sentence.
    {
      key: 'search',
      icon: 'search',
      label: t.search,
      // While a demonstration is being recorded, it opens on the Model tab (where the recording is).
      onPress: () => app.setOverlay({ kind: app.recording ? 'model' : 'search' }),
      active: overlay?.kind === 'search' || overlay?.kind === 'keyboard' || overlay?.kind === 'model' || app.recording,
    },
    { key: 'guide', icon: 'book', label: t.guide, onPress: () => app.setOverlay({ kind: 'guide' }), active: overlay?.kind === 'guide' },
    // For the parents, from the board itself, each behind the caregiver code: the settings…
    { key: 'settings', icon: 'settings', label: t.settings, onPress: behindCode('settings'), active: overlay?.kind === 'settings' },
    // …and the child lock of this device (only on a real child's board; lit while it is on).
    { key: 'childLock', icon: 'shield', label: t.lockShort, onPress: behindCode('lock'), active: childLock || overlay?.kind === 'lock', show: !!board },
    {
      key: 'lock',
      icon: editMode ? 'unlock' : 'lock',
      label: t.caregiver,
      onPress: () => (editMode ? app.setEditMode(false) : app.setOverlay({ kind: 'pin' })),
      active: editMode,
    },
  ];
  // Only for the accounts of the app's own team (the database says who they are), on their own
  // board: the way back to the back office. No caregiver code for them, here or elsewhere (the
  // owner's choice). On a very narrow screen the row has no room for one more button of a
  // touchable size: the way back is then Settings → Account.
  if (isAdmin && board && (vertical || width >= 340))
    tools.push({
      key: 'backOffice',
      icon: 'briefcase',
      label: adminStrings(profile.settings.uiLang).title,
      onPress: () => go({ name: 'admin' }),
      active: false,
    });
  const visible = (items: Item[]) => items.filter((m) => m.show !== false);
  // The tools (search, guide, settings, child lock, caregiver): one column with their names when
  // the screen is tall enough for all of them, otherwise icons side by side.
  const toolColumn = height >= 420 + visible(tools).length * 56;

  if (vertical) {
    return (
      <View style={[styles.bar, styles.vertical]} role="navigation">
        <View style={styles.colGroup}>
          {visible(main).map(({ key, ...m }) => (
            <BarButton key={key} id={key} {...m} size="main" />
          ))}
          {visible(priority).map(({ key, ...m }) => (
            <BarButton key={key} id={key} {...m} size="priority" />
          ))}
        </View>
        <View style={toolColumn ? styles.colGroup : styles.toolGrid}>
          {visible(tools).map(({ key, ...m }) => (
            <BarButton key={key} id={key} {...m} size={toolColumn ? 'toolWide' : 'tool'} iconsOnly={!toolColumn} />
          ))}
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bar, styles.horizontal]} role="navigation">
      {[...visible(main), ...visible(priority), ...visible(tools)].map(({ key, ...m }) => (
        <BarButton key={key} id={key} {...m} size={m.tone ? 'priorityRow' : 'row'} iconsOnly={iconsOnly} />
      ))}
    </View>
  );
}

function BarButton({
  id,
  icon,
  label,
  onPress,
  active,
  tone,
  badge,
  size,
  iconsOnly,
}: Omit<Item, 'key' | 'show'> & {
  /** The button's key, to choose it by resting the pointer on it (Settings → Touch). */
  id: string;
  size: 'main' | 'priority' | 'tool' | 'toolWide' | 'row' | 'priorityRow';
  iconsOnly?: boolean;
}) {
  const rest = useDwellTarget(`bar:${id}`, useRestMs(), onPress);
  // Switch scanning: Help is the one button of the bar it lights (src/lib/scanning.ts).
  const lit = useScanned(id === 'help' ? HELP_ID : '');
  const toneBg = tone === 'help' ? C.help : undefined;
  const iconSize = size === 'priority' ? 38 : size === 'priorityRow' ? 30 : size === 'main' ? 28 : 22;
  return (
    <Pressable
      onPress={onPress}
      onHoverIn={rest.onHoverIn}
      onHoverOut={rest.onHoverOut}
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
      {rest.active && <DwellFill ms={rest.ms} radius={12} />}
      {lit && <ScanRing radius={size === 'priority' ? 16 : 14} />}
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
