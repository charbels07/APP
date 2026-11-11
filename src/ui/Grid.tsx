import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { appLinkOf } from '../lib/appLinks';
import { coveredSlots, moveCell } from '../lib/boardOps';
import { display, isRtl, label, symbolOf, wordClass } from '../lib/lexicon';
import type { Board, CellDisplay, SymbolRef, WordClass } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, CLASS_COLORS, isDarkColor, tint } from './theme';
import { useWiggle } from './wiggle';

const GAP = 6;
const MIN_CELL_W = 56;
/** Caregiver mode: a second tap within this time opens the card's menu. */
const DOUBLE_TAP_MS = 320;
const nativeDriver = Platform.OS !== 'web';

export function Grid({ board }: { board: Board }) {
  const app = useApp();
  const { profile, editMode, highlight, lang, pointer, moveSource, wiggle, selection } = app;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };

  const appRef = useRef(app);
  appRef.current = app;
  const lastTap = useRef<{ index: number; at: number; timer: ReturnType<typeof setTimeout> } | null>(null);
  useEffect(() => () => clearTimeout(lastTap.current?.timer), []);
  const onCellPress = useCallback(
    (index: number) => {
      const a = appRef.current;
      if (a.playing) return;
      const cell = a.profile.boards[board.id]?.cells[index];
      if (a.editMode) {
        // Multi-selection: each tap adds or removes the card.
        if (a.selection) {
          if (!cell) return;
          const cur = a.selection.board === board.id ? a.selection.indexes : [];
          a.setSelection({ board: board.id, indexes: cur.includes(index) ? cur.filter((i) => i !== index) : [...cur, index] });
          return;
        }
        const src = a.moveSource;
        if (src && src.board === board.id) {
          if (src.index !== index) a.update((d) => moveCell(d.boards[board.id], src.index, index));
          a.setMoveSource(null);
          return;
        }
        if (cell) {
          // Double tap → the card's menu; a single tap keeps its usual action (a short wait tells them apart).
          const prev = lastTap.current;
          const now = Date.now();
          clearTimeout(prev?.timer);
          if (prev && prev.index === index && now - prev.at < DOUBLE_TAP_MS) {
            lastTap.current = null;
            a.setOverlay({ kind: 'cellMenu', board: board.id, index });
            return;
          }
          const timer = setTimeout(() => {
            lastTap.current = null;
            const b = appRef.current;
            // Folders still open in caregiver mode (long-press edits them) so personal words can be added inside.
            if (cell.folder && b.profile.boards[cell.folder]) b.openFolder(cell.folder);
            else b.setOverlay({ kind: 'editor', board: board.id, index });
          }, DOUBLE_TAP_MS);
          lastTap.current = { index, at: now, timer };
        } else
          a.setOverlay({
            kind: 'picker',
            onPick: (conceptId) => {
              a.update((d) => {
                d.boards[board.id].cells[index] = { concept: conceptId, level: board.kind === 'core' ? 1 : undefined };
              });
              a.setOverlay({ kind: 'editor', board: board.id, index });
            },
          });
        return;
      }
      if (!cell) return;
      if (cell.folder && a.profile.boards[cell.folder]) {
        a.openFolder(cell.folder);
        return;
      }
      if (a.highlight?.board === board.id && a.highlight.index === index) a.clearHighlight();
      const path = board.kind === 'tla' ? [board.id] : board.id === 'core' ? ['core'] : ['core', board.id];
      a.touchConcept(cell.concept, { board: board.id, index, path });
    },
    [board.id, board.kind],
  );

  const onCellLongPress = useCallback(
    (index: number) => {
      const a = appRef.current;
      const cell = a.profile.boards[board.id]?.cells[index];
      if (a.editMode) {
        if (cell && !a.selection) a.setOverlay({ kind: 'editor', board: board.id, index });
        return;
      }
      // Use mode: a long press on a folder shows its most requested words without opening it;
      // on a word it simply says it (a slow touch still counts).
      if (cell?.folder && a.profile.boards[cell.folder] && !a.playing && !a.recording) a.setOverlay({ kind: 'peek', folder: cell.folder });
      else onCellPress(index);
    },
    [board.id, onCellPress],
  );

  const covered = useMemo(() => coveredSlots(board), [board]);
  const cols = board.cols;
  const rows = board.rows;
  let cellW = size.w ? (size.w - GAP * (cols - 1)) / cols : 0;
  const scrollX = cellW > 0 && cellW < MIN_CELL_W;
  if (scrollX) cellW = MIN_CELL_W;
  const cellH = size.h ? (size.h - GAP * (rows - 1)) / rows : 0;
  const level = profile.settings.revealLevel;
  const totalW = cellW * cols + GAP * (cols - 1);

  const grid =
    size.w > 0 ? (
      <View style={{ width: totalW, height: size.h }}>
        {board.cells.map((cell, index) => {
          if (covered.has(index)) return null;
          const r = Math.floor(index / cols);
          const c = index % cols;
          const [sw, sh] = cell?.span ?? [1, 1];
          const frame = {
            position: 'absolute' as const,
            left: c * (cellW + GAP),
            top: r * (cellH + GAP),
            width: sw * cellW + (sw - 1) * GAP,
            height: sh * cellH + (sh - 1) * GAP,
          };
          const hidden = !!cell && board.kind === 'core' && (cell.level ?? 1) > level;
          if (!cell || (hidden && !editMode)) {
            return (
              <View key={index} style={frame}>
                <EmptyCell
                  width={frame.width}
                  height={frame.height}
                  editMode={editMode}
                  index={index}
                  onPress={onCellPress}
                  t={app.t.emptyCell}
                  moveTarget={!!moveSource && moveSource.board === board.id}
                />
              </View>
            );
          }
          const k = cell.size ?? 1;
          return (
            <View key={index} style={[frame, styles.slot]}>
              <CellView
                index={index}
                width={frame.width * k}
                height={frame.height * k}
                text={label(profile, cell.concept, lang)}
                rtl={isRtl(lang)}
                symbol={symbolOf(profile, cell.concept)}
                cls={cell.folder ? 'folder' : wordClass(profile, cell.concept)}
                display={profile.settings.showLabels ? display(profile, cell.concept) : 'image'}
                isFolder={!!cell.folder}
                intensity={cell.intensity}
                dimmed={hidden}
                levelBadge={editMode && board.kind === 'core' ? cell.level ?? 1 : undefined}
                highlighted={highlight?.board === board.id && highlight.index === index}
                pointing={pointer?.board === board.id && pointer.index === index}
                tapping={pointer?.board === board.id && pointer.index === index && !!pointer.tap}
                moving={moveSource?.board === board.id && moveSource.index === index}
                selected={editMode && selection ? selection.board === board.id && selection.indexes.includes(index) : undefined}
                wiggleN={wiggle && wiggle.concept === cell.concept ? wiggle.n : 0}
                isApp={!cell.folder && !!appLinkOf(profile, cell.concept)}
                look={profile.settings.visual}
                bigPicto={profile.settings.pictoSize === 'large'}
                still={profile.settings.reduceMotion}
                access={editMode ? 'release' : profile.settings.access}
                holdMs={Math.round((profile.settings.holdTime || 1) * 1000)}
                onPress={onCellPress}
                onLongPress={onCellLongPress}
              />
            </View>
          );
        })}
      </View>
    ) : null;

  return (
    <View style={{ flex: 1 }} onLayout={onLayout}>
      {scrollX ? (
        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 4 }}>
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
    </View>
  );
}

const EmptyCell = React.memo(function EmptyCell({
  width,
  height,
  editMode,
  index,
  onPress,
  t,
  moveTarget,
}: {
  width: number;
  height: number;
  editMode: boolean;
  index: number;
  onPress: (i: number) => void;
  t: string;
  moveTarget: boolean;
}) {
  if (!editMode) return <View style={{ width, height }} />;
  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityLabel={t}
      style={({ pressed }) => [
        styles.empty,
        { width, height, opacity: pressed ? 0.6 : 1 },
        moveTarget && { borderColor: C.accent, backgroundColor: C.accentSoft },
      ]}
    >
      <Icon name={moveTarget ? 'target' : 'plus'} size={22} color={moveTarget ? C.accent : '#98A2B3'} />
    </Pressable>
  );
});

interface CellProps {
  index: number;
  width: number;
  height: number;
  text: string;
  rtl: boolean;
  symbol: SymbolRef;
  cls: WordClass;
  display: CellDisplay;
  isFolder: boolean;
  /** 0–1 background strength; undefined = default soft tint. */
  intensity?: number;
  dimmed: boolean;
  levelBadge?: number;
  highlighted: boolean;
  /** A demonstration is pressing this card. */
  pointing: boolean;
  /** …and is pushing it right now (same look as a finger press). */
  tapping?: boolean;
  /** Caregiver picked this card to move it. */
  moving: boolean;
  /** Part of the caregiver's multi-selection. */
  selected?: boolean;
  /** Changes when the picture should wiggle (touched / being said). */
  wiggleN?: number;
  /** The card opens an app (small corner badge). */
  isApp?: boolean;
  /** Visual presentation chosen for the child. */
  look?: 'standard' | 'large' | 'contrast';
  /** Larger picture, smaller label. */
  bigPicto?: boolean;
  /** Fewer animations. */
  still?: boolean;
  /** Select when the finger lifts, as soon as it touches, or after holding `holdMs`. */
  access?: 'release' | 'press' | 'hold';
  holdMs?: number;
  onPress: (index: number) => void;
  onLongPress?: (index: number) => void;
}

export const CellView = React.memo(function CellView(p: CellProps) {
  const colors = CLASS_COLORS[p.cls];
  const contrast = p.look === 'contrast';
  // High contrast: dark card, bright border in the word-class colour, white text.
  const bg = contrast ? '#101418' : p.intensity === undefined ? colors.bg : tint(colors.border, p.intensity);
  const textColor = isDarkColor(bg) ? '#FFFFFF' : C.text;
  const showImage = p.display !== 'text';
  const showText = p.display !== 'image';
  // Shrink the label so the longest word fits on one line (never break inside a word).
  const longest = Math.max(1, ...p.text.split(/\s+/).map((w) => w.length));
  const textScale = (p.look === 'large' ? 1.25 : 1) * (p.bigPicto ? 0.82 : 1);
  const fontSize = Math.max(
    9,
    Math.min(
      p.look === 'large' ? 27 : 22,
      Math.round(Math.min(p.width / 6.4, p.height / 6) * textScale),
      Math.floor((p.width - 8) / (longest * 0.6)),
    ),
  );
  const symbolSize = Math.max(
    18,
    Math.min(p.width - (p.bigPicto ? 8 : 14), showText ? p.height - fontSize * (p.bigPicto ? 1.6 : 1.9) - 8 : p.height - 14) *
      (p.isFolder ? 0.86 : p.bigPicto ? 1 : 0.92),
  );

  // "Show me where" highlight: gentle pulse.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.highlighted || p.still) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: nativeDriver }),
        Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: nativeDriver }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [p.highlighted, p.still, pulse]);

  // Demonstration: the hand comes in, then presses the card.
  const press = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.pointing) {
      press.setValue(0);
      return;
    }
    Animated.sequence([
      Animated.timing(press, { toValue: 0.5, duration: 380, useNativeDriver: nativeDriver }),
      Animated.timing(press, { toValue: 1, duration: 220, useNativeDriver: nativeDriver }),
    ]).start();
  }, [p.pointing, press]);

  const scale = Animated.add(
    pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }),
    press.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.05, -0.06] }),
  );
  const wiggleTransform = useWiggle(p.still ? 0 : p.wiggleN);
  const handShift = press.interpolate({ inputRange: [0, 0.5, 1], outputRange: [30, 0, 4] });
  const lit = p.highlighted || p.pointing;

  return (
    <Animated.View style={{ width: p.width, height: p.height, transform: [{ scale }], zIndex: lit ? 5 : 0 }}>
      <Pressable
        onPress={!p.access || p.access === 'release' ? () => p.onPress(p.index) : undefined}
        onPressIn={p.access === 'press' ? () => p.onPress(p.index) : undefined}
        onLongPress={p.access === 'hold' ? () => p.onPress(p.index) : p.onLongPress ? () => p.onLongPress!(p.index) : undefined}
        delayLongPress={p.access === 'hold' ? p.holdMs ?? 1000 : 600}
        accessibilityRole="button"
        accessibilityLabel={p.text}
        accessibilityState={p.selected !== undefined ? { selected: p.selected } : undefined}
        style={({ pressed }) => [
          styles.cell,
          {
            backgroundColor: bg,
            borderColor: lit ? C.highlight : p.moving || p.selected ? C.accent : colors.border,
            borderWidth: lit || p.moving || p.selected || contrast ? 4 : p.isFolder ? 2.5 : 2,
            borderStyle: p.moving ? 'dashed' : 'solid',
            opacity: p.dimmed ? 0.35 : 1,
          },
          p.isFolder && styles.folder,
          (pressed || p.tapping) && styles.pressed,
        ]}
      >
        {p.isFolder && <View style={[styles.folderTab, { borderColor: colors.border }]} />}
        {p.selected && (
          <View style={styles.selectedBadge} accessibilityElementsHidden>
            <Icon name="check" size={16} color="#fff" strokeWidth={3} />
          </View>
        )}
        {showImage && (
          <Animated.View style={{ transform: wiggleTransform }}>
            <SymbolView symbol={p.symbol} size={symbolSize} />
          </Animated.View>
        )}
        {p.isApp && (
          <View style={styles.appBadge} accessibilityElementsHidden>
            <Icon name="external" size={14} color="#fff" strokeWidth={2.6} />
          </View>
        )}
        {showText && (
          <Text
            numberOfLines={2}
            adjustsFontSizeToFit
            style={[
              styles.label,
              {
                color: textColor,
                fontSize: p.display === 'text' ? fontSize * 1.4 : fontSize,
                writingDirection: p.rtl ? 'rtl' : 'ltr',
              },
              (p.isFolder || p.look === 'large' || contrast) && { fontWeight: '800' },
            ]}
          >
            {p.text}
          </Text>
        )}
        {p.levelBadge !== undefined && (
          <View style={[styles.badge, p.levelBadge > 1 && { backgroundColor: C.edit }]}>
            <Text style={styles.badgeText}>N{p.levelBadge}</Text>
          </View>
        )}
      </Pressable>
      {p.pointing && (
        <Animated.View
          pointerEvents="none"
          style={[styles.hand, { transform: [{ translateX: handShift }, { translateY: handShift }] }]}
        >
          <Icon name="pointer" size={Math.max(28, Math.min(56, p.width * 0.45))} color={C.text} strokeWidth={2.2} />
        </Animated.View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  slot: { alignItems: 'center', justifyContent: 'center' },
  selectedBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  appBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cell: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    paddingVertical: 4,
    gap: 2,
    overflow: 'hidden',
  },
  folder: { borderTopLeftRadius: 4 },
  folderTab: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: '42%',
    height: 9,
    borderBottomRightRadius: 6,
    backgroundColor: '#D0D5DD',
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.97 }] },
  label: { color: C.text, fontWeight: '600', textAlign: 'center' },
  empty: {
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#C3CAD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: C.success,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  hand: {
    position: 'absolute',
    right: '8%',
    bottom: '4%',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 40,
    padding: 4,
  },
});
