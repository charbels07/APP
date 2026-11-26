import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { editStrings } from '../i18n/edit';
import { appLinkOf } from '../lib/appLinks';
import { compactPlaces, coveredSlots, moveCell } from '../lib/boardOps';
import { display, isFolderName, isRtl, label, symbolOf, wordClass } from '../lib/lexicon';
import { dwellMs } from '../lib/dwell';
import { boardRows, cardIndex, type PlacedCard } from '../lib/scanning';
import { createLandingChoice, landingTouch } from '../lib/touchChoice';
import type { Board, CellDisplay, SymbolRef, WordClass } from '../model/types';
import { useAccess, useDwellTarget, useScanLit } from '../state/access';
import { useApp } from '../state/AppState';
import { DwellFill, ScanRing } from './AccessMarks';
import { Icon } from './Icon';
import { SymbolView } from './SymbolView';
import { C, CLASS_COLORS, isDarkColor, tint } from './theme';
import { useWiggle } from './wiggle';
import { pressed, spoken } from './a11y';

const GAP = 6;
const MIN_CELL_W = 56;
/** Caregiver mode: a second tap within this time opens the card's menu. */
const DOUBLE_TAP_MS = 320;
/** Dragging a card near the left or right edge scrolls a wide board. */
const EDGE = 40;
const EDGE_STEP = 14;
const nativeDriver = Platform.OS !== 'web';
/** "Where the finger first lands": the touch stays on its card wherever the finger slips. */
const FAR = { top: 4000, left: 4000, right: 4000, bottom: 4000 };
const NOOP = () => {};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

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
          // An empty case still adds a word while cards are being selected (the selection is kept).
          if (!cell)
            return a.setOverlay({
              kind: 'picker',
              onPick: (conceptId) => {
                a.update((d) => {
                  d.boards[board.id].cells[index] = { concept: conceptId, level: board.kind === 'core' ? 1 : undefined };
                });
                a.setOverlay(null);
              },
            });
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
  const onCellPressRef = useRef(onCellPress);
  onCellPressRef.current = onCellPress;

  // ── Settings → Touch: a hand that shakes, a bigger touch area, resting the pointer ──
  const st = profile.settings;
  // "Where the finger first lands": the card the finger landed on, chosen when it lifts (or after the hold time).
  const land = landingTouch(st, editMode);
  const holdRef = useRef(0);
  holdRef.current = st.access === 'hold' ? Math.round((st.holdTime || 1) * 1000) : 0;
  const landing = useMemo(() => createLandingChoice({ choose: (i) => onCellPressRef.current(i), hold: () => holdRef.current }), []);
  useEffect(() => () => landing.stop(), [landing, board.id, editMode, land]);
  const onLandIn = useCallback((i: number) => landing.pressIn(i), [landing]);
  const onLandOut = useCallback((i: number) => landing.pressOut(i), [landing]);
  const bigTouch = !editMode && !!st.bigTouch;
  const restMs = editMode ? 0 : dwellMs(st);

  // ── Caregiver mode: long press a card, then slide it to its new place ──
  // (released without sliding, the long press keeps its usual action: edit the card).
  const [drag, setDrag] = useState<{ from: number; over: number } | null>(null);
  const dragRef = useRef<{ from: number; over: number; moving: boolean; startScroll: number } | null>(null);
  const dragXY = useRef(new Animated.ValueXY()).current;
  const gesture = useRef({ dx: 0, dy: 0 });
  const geo = useRef({ cellW: 0, cellH: 0, cols: 1, rows: 1, viewW: 0, totalW: 0, scrolls: false });
  const coveredRef = useRef<Map<number, number>>(new Map());
  const containerRef = useRef<React.ComponentRef<typeof View>>(null);
  const containerX = useRef(0);
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const scrollOffset = useRef(0);
  const autoScroll = useRef<ReturnType<typeof setInterval> | null>(null);
  const [moved, setMoved] = useState<{ from: number; to: number } | null>(null);

  const stopAutoScroll = () => {
    if (autoScroll.current) clearInterval(autoScroll.current);
    autoScroll.current = null;
  };
  /** Where the dragged card is now, and which slot it is over. */
  const placeDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    const g = geo.current;
    const x = gesture.current.dx + (scrollOffset.current - d.startScroll);
    const y = gesture.current.dy;
    dragXY.setValue({ x, y });
    const cx = (d.from % g.cols) * (g.cellW + GAP) + g.cellW / 2 + x;
    const cy = Math.floor(d.from / g.cols) * (g.cellH + GAP) + g.cellH / 2 + y;
    const col = clamp(Math.floor(cx / (g.cellW + GAP)), 0, g.cols - 1);
    const row = clamp(Math.floor(cy / (g.cellH + GAP)), 0, g.rows - 1);
    // A slot covered by a spread card stands for that card.
    const slot = row * g.cols + col;
    const over = coveredRef.current.get(slot) ?? slot;
    if (over !== d.over) {
      d.over = over;
      setDrag({ from: d.from, over });
    }
  }, [dragXY]);
  const endDrag = useCallback(
    (drop: boolean) => {
      stopAutoScroll();
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      dragXY.setValue({ x: 0, y: 0 });
      if (!d || !drop || !d.moving || d.over === d.from) return;
      appRef.current.update((p) => moveCell(p.boards[board.id], d.from, d.over));
      setMoved({ from: d.from, to: d.over });
    },
    [board.id, dragXY],
  );
  const pan = useMemo(
    () =>
      PanResponder.create({
        // Takes the touch from the card only once a long press armed the drag.
        onMoveShouldSetPanResponderCapture: () => {
          if (!dragRef.current) return false;
          dragRef.current.moving = true;
          return true;
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderMove: (e, g) => {
          gesture.current = { dx: g.dx, dy: g.dy };
          placeDrag();
          const { viewW, totalW, scrolls } = geo.current;
          if (!scrolls) return;
          const x = e.nativeEvent.pageX - containerX.current;
          const dir = x < EDGE ? -1 : x > viewW - EDGE ? 1 : 0;
          stopAutoScroll();
          if (dir)
            autoScroll.current = setInterval(() => {
              const next = clamp(scrollOffset.current + dir * EDGE_STEP, 0, Math.max(0, totalW - viewW));
              if (next === scrollOffset.current) return;
              scrollOffset.current = next;
              scrollRef.current?.scrollTo({ x: next, animated: false });
              placeDrag();
            }, 16);
        },
        onPanResponderRelease: () => endDrag(true),
        onPanResponderTerminate: () => endDrag(false),
      }),
    [placeDrag, endDrag],
  );
  // Another board on screen, or leaving caregiver mode: nothing stays half-moved.
  useEffect(() => {
    setMoved(null);
    return () => {
      stopAutoScroll();
      dragRef.current = null;
    };
  }, [board.id, editMode]);
  useEffect(() => {
    if (!moved) return;
    const id = setTimeout(() => setMoved(null), 7000);
    return () => clearTimeout(id);
  }, [moved]);
  const landStill = useRef(false);
  // Browser: while a card is dragged the page must not scroll, and a long press must not open
  // the browser's own menu or select text.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const keepStill = (e: Event) => {
      // Also while "where the finger first lands" is on: the page must not take a slipping finger away.
      if (dragRef.current || landStill.current) e.preventDefault();
    };
    const noMenu = (e: Event) => e.preventDefault();
    node.addEventListener('touchmove', keepStill, { passive: false });
    node.addEventListener('contextmenu', noMenu);
    node.style.setProperty('-webkit-touch-callout', 'none');
    node.style.setProperty('-webkit-user-select', 'none');
    node.style.setProperty('user-select', 'none');
    return () => {
      node.removeEventListener('touchmove', keepStill);
      node.removeEventListener('contextmenu', noMenu);
    };
  }, []);

  const onCellPressOut = useCallback(
    (index: number) => {
      const d = dragRef.current;
      if (!d || d.moving || d.from !== index) return;
      // Long press released without sliding.
      dragRef.current = null;
      setDrag(null);
      appRef.current.setOverlay({ kind: 'editor', board: board.id, index });
    },
    [board.id],
  );

  const onCellLongPress = useCallback(
    (index: number) => {
      const a = appRef.current;
      const cell = a.profile.boards[board.id]?.cells[index];
      if (a.editMode) {
        if (!cell || a.selection || a.moveSource) return;
        clearTimeout(lastTap.current?.timer);
        lastTap.current = null;
        dragRef.current = { from: index, over: index, moving: false, startScroll: scrollOffset.current };
        gesture.current = { dx: 0, dy: 0 };
        dragXY.setValue({ x: 0, y: 0 });
        setDrag({ from: index, over: index });
        setMoved(null);
        containerRef.current?.measureInWindow((x: number) => (containerX.current = x));
        return;
      }
      // Use mode: a long press on a folder shows its most requested words without opening it; on a
      // word it says it and shows it big over the board (Settings → Touch; off: a slow touch counts).
      if (cell?.folder && a.profile.boards[cell.folder] && !a.playing && !a.recording) a.setOverlay({ kind: 'peek', folder: cell.folder });
      else if (cell && !cell.folder && a.profile.settings.bigOnHold !== false && !a.playing && !a.recording) {
        a.speakConcept(cell.concept);
        a.setOverlay({ kind: 'bigWord', concept: cell.concept });
      } else onCellPress(index);
    },
    [board.id, onCellPress, dragXY],
  );

  const covered = useMemo(() => coveredSlots(board), [board]);
  // Part of the words shown: outside caregiver mode they are drawn without holes (each word
  // slides up in its column). Caregiver mode always shows the real places, where cards are moved.
  const wordPlaces = profile.settings.wordPlaces;
  const revealed = profile.settings.revealLevel;
  const places = useMemo(() => (editMode ? null : compactPlaces(board, revealed, wordPlaces)), [board, editMode, revealed, wordPlaces]);
  // Drawn (and reached with the keyboard) in the order seen on screen.
  const order = useMemo(
    () => (places ? [...places.entries()].sort((a, b) => a[1] - b[1]).map(([i]) => i) : board.cells.map((_, i) => i)),
    [places, board.cells],
  );
  const cols = board.cols;
  const rows = board.rows;
  let cellW = size.w ? (size.w - GAP * (cols - 1)) / cols : 0;
  const scrollX = cellW > 0 && cellW < MIN_CELL_W;
  if (scrollX) cellW = MIN_CELL_W;
  const cellH = size.h ? (size.h - GAP * (rows - 1)) / rows : 0;
  const level = profile.settings.revealLevel;
  const totalW = cellW * cols + GAP * (cols - 1);
  geo.current = { cellW, cellH, cols, rows, viewW: size.w, totalW, scrolls: scrollX };
  coveredRef.current = covered;
  landStill.current = land && !scrollX;
  /** Where a card is drawn: its place on screen (without holes outside caregiver mode) and its size. */
  const slotFrame = (index: number) => {
    const slot = places?.get(index) ?? index;
    const [sw, sh] = board.cells[index]?.span ?? [1, 1];
    return {
      position: 'absolute' as const,
      left: (slot % cols) * (cellW + GAP),
      top: Math.floor(slot / cols) * (cellH + GAP),
      width: sw * cellW + (sw - 1) * GAP,
      height: sh * cellH + (sh - 1) * GAP,
    };
  };

  // ── Switch scanning: the board tells the scanner (src/ui/Scanner.tsx) what it holds, row by row ──
  const access = useAccess();
  const scanCards = useMemo((): PlacedCard[] | null => {
    if (editMode) return null;
    const out: PlacedCard[] = [];
    for (const index of order) {
      const cell = board.cells[index];
      if (!cell || covered.has(index) || (board.kind === 'core' && (cell.level ?? 1) > revealed)) continue;
      out.push({ index, slot: places?.get(index) ?? index });
    }
    return out;
  }, [editMode, order, board, covered, revealed, places]);
  const scanRowsKey = scanCards ? `${board.id}|${boardRows(scanCards, cols).map((r) => r.join(',')).join('/')}` : '';
  useEffect(() => {
    if (!scanCards) return;
    const store = access.scan;
    store.setGrid({
      key: scanRowsKey,
      rows: boardRows(scanCards, cols),
      choose: (id) => {
        const i = cardIndex(id);
        if (i !== null) onCellPressRef.current(i);
      },
      // A folder's name is not a word: never said, here neither.
      word: (id) => {
        const a = appRef.current;
        const i = cardIndex(id);
        const cell = i === null ? null : a.profile.boards[board.id]?.cells[i];
        if (!cell || cell.folder || isFolderName(a.profile, cell.concept)) return null;
        return label(a.profile, cell.concept, a.lang);
      },
    });
    return () => {
      if (store.grid()?.key === scanRowsKey) store.setGrid(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanRowsKey, access]);
  const lit = useScanLit();
  const litCards = editMode ? [] : lit.ids.map(cardIndex).filter((i): i is number => i !== null && !!board.cells[i]);
  // A wide board (it scrolls sideways): the lit card is brought into view.
  const litOne = lit.level === 'items' && litCards.length === 1 ? litCards[0] : null;
  useEffect(() => {
    if (litOne === null || !scrollX || !size.w) return;
    const f = slotFrame(litOne);
    const at = scrollOffset.current;
    const next = f.left < at ? Math.max(0, f.left - GAP) : f.left + f.width > at + size.w ? f.left + f.width - size.w + GAP : at;
    if (next === at) return;
    scrollOffset.current = next;
    scrollRef.current?.scrollTo({ x: next, animated: !st.reduceMotion });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [litOne, scrollX, size.w]);
  let scanMark: React.ReactNode = null;
  if (litCards.length && size.w > 0) {
    const frames = litCards.map(slotFrame);
    if (lit.level === 'rows') {
      // A row: one band around all its cards.
      const left = Math.min(...frames.map((f) => f.left));
      const top = Math.min(...frames.map((f) => f.top));
      const right = Math.max(...frames.map((f) => f.left + f.width));
      const bottom = Math.max(...frames.map((f) => f.top + f.height));
      scanMark = (
        <View pointerEvents="none" style={[styles.scanBox, { left, top, width: right - left, height: bottom - top }]}>
          <ScanRing row outset={4} />
        </View>
      );
    } else
      scanMark = frames.map((f, k) => (
        <View key={k} pointerEvents="none" style={[f, styles.scanBox]}>
          <ScanRing outset={4} radius={10} />
        </View>
      ));
  }
  const frameOf = (index: number) => {
    const [sw, sh] = board.cells[index]?.span ?? [1, 1];
    return {
      position: 'absolute' as const,
      left: (index % cols) * (cellW + GAP),
      top: Math.floor(index / cols) * (cellH + GAP),
      width: sw * cellW + (sw - 1) * GAP,
      height: sh * cellH + (sh - 1) * GAP,
    };
  };

  const grid =
    size.w > 0 ? (
      <View style={{ width: totalW, height: size.h }}>
        {order.map((index) => {
          const cell = board.cells[index];
          if (covered.has(index)) return null;
          const slot = places?.get(index) ?? index;
          const frame = slotFrame(index);
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
          const dragging = drag?.from === index;
          // Bigger touch area: the touch reaches the middle of the gap around the card (and the whole
          // slot of a smaller card); the card itself is drawn exactly where and as big as before.
          const touch = bigTouch
            ? { position: 'absolute' as const, left: frame.left - GAP / 2, top: frame.top - GAP / 2, width: frame.width + GAP, height: frame.height + GAP }
            : frame;
          const padX = bigTouch ? (touch.width - frame.width * k) / 2 : 0;
          const padY = bigTouch ? (touch.height - frame.height * k) / 2 : 0;
          return (
            <Animated.View
              key={index}
              style={[touch, styles.slot, dragging && styles.dragging, dragging && { transform: [...dragXY.getTranslateTransform(), { scale: 1.08 }] }]}
            >
              <CellView
                index={index}
                width={frame.width * k}
                height={frame.height * k}
                padX={padX}
                padY={padY}
                land={land}
                onLandIn={onLandIn}
                onLandOut={onLandOut}
                restId={`slot:${slot}`}
                restMs={restMs}
                text={label(profile, cell.concept, lang)}
                lang={lang}
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
                onPressOut={editMode ? onCellPressOut : undefined}
              />
            </Animated.View>
          );
        })}
        {drag && drag.over !== drag.from && <View pointerEvents="none" style={[frameOf(drag.over), styles.dropTarget]} />}
        {scanMark}
      </View>
    ) : null;

  const e = editStrings(profile.settings.uiLang);
  return (
    <View ref={containerRef} style={{ flex: 1 }} onLayout={onLayout} {...pan.panHandlers}>
      {scrollX ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator
          scrollEnabled={!drag}
          scrollEventThrottle={16}
          onScroll={(ev) => {
            if (!autoScroll.current) scrollOffset.current = ev.nativeEvent.contentOffset.x;
          }}
          contentContainerStyle={{ paddingBottom: 4 }}
        >
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
      {editMode && moved && (
        <View style={styles.movedToast} accessibilityLiveRegion="polite">
          <View style={{ flexShrink: 1 }}>
            <Text style={styles.movedText}>{e.cardMoved}</Text>
            {board.kind === 'core' && <Text style={styles.movedNote}>{e.coreNote}</Text>}
          </View>
          <Pressable
            onPress={() => {
              app.update((p) => moveCell(p.boards[board.id], moved.to, moved.from));
              setMoved(null);
            }}
            style={({ pressed }) => [styles.movedUndo, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={e.undoMove}
          >
            <Icon name="undo" size={18} color="#fff" />
            <Text style={styles.movedUndoText}>{e.undoMove}</Text>
          </Pressable>
        </View>
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
      accessibilityRole="button"
      accessibilityLabel={t}
      style={({ pressed }) => [
        styles.empty,
        { width, height, opacity: pressed ? 0.6 : 1 },
        moveTarget && { borderColor: C.accent, backgroundColor: C.accentSoft },
      ]}
    >
      <Icon name={moveTarget ? 'target' : 'plus'} size={22} color={moveTarget ? C.accent : C.inputBorder} />
    </Pressable>
  );
});

interface CellProps {
  index: number;
  width: number;
  height: number;
  text: string;
  /** Language of the word (for screen readers). */
  lang?: string;
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
  /** Bigger touch area: the touch reaches this far around the card on each side (0 = the card only). */
  padX?: number;
  padY?: number;
  /** "Where the finger first lands" (see lib/touchChoice): the grid decides on landing and lifting. */
  land?: boolean;
  onLandIn?: (index: number) => void;
  onLandOut?: (index: number) => void;
  /** Choosing by resting the pointer: the card's place on screen, and the time (0 = off). */
  restId?: string;
  restMs?: number;
  onPress: (index: number) => void;
  onLongPress?: (index: number) => void;
  onPressOut?: (index: number) => void;
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
  const rest = useDwellTarget(p.restId ?? '', p.restMs ?? 0, () => p.onPress(p.index));
  const land = !!p.land;
  const pad = p.padX || p.padY ? { x: p.padX ?? 0, y: p.padY ?? 0 } : undefined;

  const cardStyle = (down: boolean) => [
    styles.cell,
    {
      backgroundColor: bg,
      borderColor: lit ? C.highlight : p.moving || p.selected ? C.accent : colors.border,
      borderWidth: lit || p.moving || p.selected || contrast ? 4 : p.isFolder ? 2.5 : 2,
      borderStyle: p.moving ? ('dashed' as const) : ('solid' as const),
      opacity: p.dimmed ? 0.35 : 1,
    },
    p.isFolder && styles.folder,
    (down || p.tapping) && styles.pressed,
  ];

  const inside = (
    <>
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
      {rest.active && <DwellFill ms={rest.ms} />}
    </>
  );

  return (
    <Animated.View
      style={{ width: p.width + 2 * (pad?.x ?? 0), height: p.height + 2 * (pad?.y ?? 0), transform: [{ scale }], zIndex: lit ? 5 : 0 }}
    >
      <Pressable
        // "Where it first lands": chosen on lifting (onPressOut); a do-nothing onPress keeps a quick
        // tap counted in a browser (without one, a tap shorter than its press delay is not reported).
        onPress={land ? NOOP : !p.access || p.access === 'release' ? () => p.onPress(p.index) : undefined}
        onPressIn={land ? () => p.onLandIn?.(p.index) : p.access === 'press' ? () => p.onPress(p.index) : undefined}
        // "As soon as it touches": the word was said when the finger landed; a finger that stays
        // (a slow release) must not say it a second time, nor open a folder's preview over the folder.
        onLongPress={land || p.access === 'press' ? undefined : p.access === 'hold' ? () => p.onPress(p.index) : p.onLongPress ? () => p.onLongPress!(p.index) : undefined}
        delayLongPress={p.access === 'hold' ? p.holdMs ?? 1000 : 600}
        onPressOut={land ? () => p.onLandOut?.(p.index) : p.onPressOut ? () => p.onPressOut!(p.index) : undefined}
        pressRetentionOffset={land ? FAR : undefined}
        onHoverIn={rest.onHoverIn}
        onHoverOut={rest.onHoverOut}
        accessibilityRole="button"
        accessibilityLabel={p.text}
        {...(p.lang ? spoken(p.lang) : null)}
        {...(p.selected !== undefined ? pressed(p.selected) : null)}
        style={pad ? [styles.touchArea, { paddingHorizontal: pad.x, paddingVertical: pad.y }] : ({ pressed }) => cardStyle(pressed)}
      >
        {pad ? ({ pressed }) => <View style={cardStyle(pressed)}>{inside}</View> : inside}
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
  dragging: {
    zIndex: 30,
    opacity: 0.94,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 12,
  },
  dropTarget: { borderRadius: 14, borderWidth: 3, borderStyle: 'dashed', borderColor: C.accent, backgroundColor: 'rgba(37, 99, 235, 0.14)', zIndex: 20 },
  movedToast: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    maxWidth: 520,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: C.rail,
    zIndex: 40,
  },
  movedText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  movedNote: { color: C.railText, fontSize: 12, marginTop: 2 },
  movedUndo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: C.accent },
  movedUndoText: { color: '#fff', fontSize: 14, fontWeight: '700' },
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
  /** Bigger touch area: the invisible part of the touch around the card. */
  touchArea: { flex: 1 },
  scanBox: { position: 'absolute', zIndex: 26 },
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
