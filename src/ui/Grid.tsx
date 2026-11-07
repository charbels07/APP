import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { coveredSlots, moveCell } from '../lib/boardOps';
import { display, isRtl, label, symbolOf, wordClass } from '../lib/lexicon';
import type { Board, CellDisplay, SymbolRef, WordClass } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, CLASS_COLORS, isDarkColor, tint } from './theme';

const GAP = 6;
const MIN_CELL_W = 56;
const nativeDriver = Platform.OS !== 'web';

export function Grid({ board }: { board: Board }) {
  const app = useApp();
  const { profile, editMode, highlight, lang, pointer, moveSource } = app;
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };

  const appRef = useRef(app);
  appRef.current = app;
  const onCellPress = useCallback(
    (index: number) => {
      const a = appRef.current;
      if (a.playing) return;
      const cell = a.profile.boards[board.id]?.cells[index];
      if (a.editMode) {
        const src = a.moveSource;
        if (src && src.board === board.id) {
          if (src.index !== index) a.update((d) => moveCell(d.boards[board.id], src.index, index));
          a.setMoveSource(null);
          return;
        }
        // Folders still open in caregiver mode (long-press edits them) so personal words can be added inside.
        if (cell?.folder && a.profile.boards[cell.folder]) a.openFolder(cell.folder);
        else if (cell) a.setOverlay({ kind: 'editor', board: board.id, index });
        else
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
      if (a.editMode && a.profile.boards[board.id]?.cells[index]) a.setOverlay({ kind: 'editor', board: board.id, index });
    },
    [board.id],
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
                moving={moveSource?.board === board.id && moveSource.index === index}
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
  /** Caregiver picked this card to move it. */
  moving: boolean;
  onPress: (index: number) => void;
  onLongPress?: (index: number) => void;
}

export const CellView = React.memo(function CellView(p: CellProps) {
  const colors = CLASS_COLORS[p.cls];
  const bg = p.intensity === undefined ? colors.bg : tint(colors.border, p.intensity);
  const textColor = isDarkColor(bg) ? '#FFFFFF' : C.text;
  const showImage = p.display !== 'text';
  const showText = p.display !== 'image';
  // Shrink the label so the longest word fits on one line (never break inside a word).
  const longest = Math.max(1, ...p.text.split(/\s+/).map((w) => w.length));
  const fontSize = Math.max(
    9,
    Math.min(22, Math.round(Math.min(p.width / 6.4, p.height / 6)), Math.floor((p.width - 8) / (longest * 0.6))),
  );
  const symbolSize = Math.max(
    18,
    Math.min(p.width - 14, showText ? p.height - fontSize * 1.9 - 8 : p.height - 14) * (p.isFolder ? 0.86 : 0.92),
  );

  // "Show me where" highlight: gentle pulse.
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.highlighted) {
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
  }, [p.highlighted, pulse]);

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
  const handShift = press.interpolate({ inputRange: [0, 0.5, 1], outputRange: [30, 0, 4] });
  const lit = p.highlighted || p.pointing;

  return (
    <Animated.View style={{ width: p.width, height: p.height, transform: [{ scale }], zIndex: lit ? 5 : 0 }}>
      <Pressable
        onPress={() => p.onPress(p.index)}
        onLongPress={p.onLongPress ? () => p.onLongPress!(p.index) : undefined}
        delayLongPress={600}
        accessibilityRole="button"
        accessibilityLabel={p.text}
        style={({ pressed }) => [
          styles.cell,
          {
            backgroundColor: bg,
            borderColor: lit ? C.highlight : p.moving ? C.accent : colors.border,
            borderWidth: lit || p.moving ? 4 : p.isFolder ? 2.5 : 2,
            borderStyle: p.moving ? 'dashed' : 'solid',
            opacity: p.dimmed ? 0.35 : 1,
          },
          p.isFolder && styles.folder,
          pressed && styles.pressed,
        ]}
      >
        {p.isFolder && <View style={[styles.folderTab, { borderColor: colors.border }]} />}
        {showImage && <SymbolView symbol={p.symbol} size={symbolSize} />}
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
              p.isFolder && { fontWeight: '800' },
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
