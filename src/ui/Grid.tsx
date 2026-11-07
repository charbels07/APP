import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { display, isRtl, label, symbolOf, wordClass } from '../lib/lexicon';
import type { Board, CellDisplay, SymbolRef, WordClass } from '../model/types';
import { useApp } from '../state/AppState';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, CLASS_COLORS } from './theme';

const GAP = 6;
const MIN_CELL_W = 56;

export function Grid({ board }: { board: Board }) {
  const app = useApp();
  const { profile, editMode, highlight, lang } = app;
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
      const cell = a.profile.boards[board.id]?.cells[index];
      if (a.editMode) {
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
      a.touchConcept(cell.concept);
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

  const cols = board.cols;
  const rows = board.rows;
  let cellW = size.w ? (size.w - GAP * (cols - 1)) / cols : 0;
  const scrollX = cellW > 0 && cellW < MIN_CELL_W;
  if (scrollX) cellW = MIN_CELL_W;
  const cellH = size.h ? (size.h - GAP * (rows - 1)) / rows : 0;
  const level = profile.settings.revealLevel;

  const grid =
    size.w > 0 ? (
      <View style={{ gap: GAP, width: scrollX ? cellW * cols + GAP * (cols - 1) : '100%' }}>
        {Array.from({ length: rows }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: GAP, height: cellH }}>
            {Array.from({ length: cols }, (_, c) => {
              const index = r * cols + c;
              const cell = board.cells[index];
              const hidden = !!cell && board.kind === 'core' && (cell.level ?? 1) > level;
              const lit = highlight?.board === board.id && highlight.index === index;
              if (!cell || (hidden && !editMode)) {
                return (
                  <EmptyCell
                    key={c}
                    width={cellW}
                    height={cellH}
                    editMode={editMode}
                    index={index}
                    onPress={onCellPress}
                    t={app.t.emptyCell}
                  />
                );
              }
              return (
                <CellView
                  key={c}
                  index={index}
                  width={cellW}
                  height={cellH}
                  text={label(profile, cell.concept, lang)}
                  rtl={isRtl(lang)}
                  symbol={symbolOf(profile, cell.concept)}
                  cls={cell.folder ? 'folder' : wordClass(profile, cell.concept)}
                  folderCls={cell.folder ? wordClass(profile, cell.concept) : undefined}
                  display={profile.settings.showLabels ? display(profile, cell.concept) : 'image'}
                  isFolder={!!cell.folder}
                  dimmed={hidden}
                  levelBadge={editMode && board.kind === 'core' ? cell.level ?? 1 : undefined}
                  highlighted={lit}
                  onPress={onCellPress}
                  onLongPress={onCellLongPress}
                />
              );
            })}
          </View>
        ))}
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
}: {
  width: number;
  height: number;
  editMode: boolean;
  index: number;
  onPress: (i: number) => void;
  t: string;
}) {
  if (!editMode) return <View style={{ width, height }} />;
  return (
    <Pressable
      onPress={() => onPress(index)}
      accessibilityLabel={t}
      style={({ pressed }) => [styles.empty, { width, height, opacity: pressed ? 0.6 : 1 }]}
    >
      <Icon name="plus" size={22} color="#98A2B3" />
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
  folderCls?: WordClass;
  display: CellDisplay;
  isFolder: boolean;
  dimmed: boolean;
  levelBadge?: number;
  highlighted: boolean;
  onPress: (index: number) => void;
  onLongPress?: (index: number) => void;
}

export const CellView = React.memo(function CellView(p: CellProps) {
  const colors = CLASS_COLORS[p.cls];
  const showImage = p.display !== 'text';
  const showText = p.display !== 'image';
  // Shrink the label so the longest word fits on one line (never break inside a word).
  const longest = Math.max(1, ...p.text.split(/\s+/).map((w) => w.length));
  const fontSize = Math.max(
    9,
    Math.min(20, Math.round(Math.min(p.width / 6.4, p.height / 6)), Math.floor((p.width - 8) / (longest * 0.6))),
  );
  const symbolSize = Math.max(
    20,
    Math.min(p.width - 14, showText ? p.height - fontSize * 1.9 - 8 : p.height - 14) * (p.isFolder ? 0.86 : 0.92),
  );

  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!p.highlighted) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 520, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 0, duration: 520, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [p.highlighted, pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });

  return (
    <Animated.View style={{ width: p.width, height: p.height, transform: [{ scale }], zIndex: p.highlighted ? 5 : 0 }}>
      <Pressable
        onPress={() => p.onPress(p.index)}
        onLongPress={p.onLongPress ? () => p.onLongPress!(p.index) : undefined}
        delayLongPress={600}
        accessibilityRole="button"
        accessibilityLabel={p.text}
        style={({ pressed }) => [
          styles.cell,
          {
            backgroundColor: colors.bg,
            borderColor: p.highlighted ? C.highlight : colors.border,
            borderWidth: p.highlighted ? 4 : p.isFolder ? 2.5 : 2,
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
              { fontSize: p.display === 'text' ? fontSize * 1.4 : fontSize, writingDirection: p.rtl ? 'rtl' : 'ltr' },
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
    </Animated.View>
  );
});

const styles = StyleSheet.create({
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
});
