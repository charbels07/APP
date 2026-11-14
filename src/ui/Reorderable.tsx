/**
 * A row of things (the steps of a sequence) whose order is changed with a finger:
 * hold one, slide it over the place it should take, let go. The place it will take is
 * outlined while sliding. Each item also has two small arrows, for people who cannot hold
 * and slide (and for the keyboard): same result, one step at a time.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type LayoutRectangle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icon } from './Icon';
import { C } from './theme';

/** `from` goes to the place of `to`; the others close the gap. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  next.splice(to, 0, ...next.splice(from, 1));
  return next;
}

/** What an item receives to become "holdable": passed to its own pressable. */
export interface HoldProps {
  onLongPress: () => void;
  onPressOut: () => void;
  delayLongPress: number;
}

export function Reorderable<T>({
  items,
  keyOf,
  render,
  onMove,
  onHolding,
  labels,
  rtl,
}: {
  items: T[];
  keyOf: (item: T, index: number) => string;
  render: (item: T, index: number, hold: HoldProps) => React.ReactNode;
  onMove: (from: number, to: number) => void;
  /** True while an item is held: the panel around must not scroll. */
  onHolding?: (on: boolean) => void;
  /** Names of the two arrows for screen readers. */
  labels: { earlier: string; later: string };
  rtl?: boolean;
}) {
  const frames = useRef<Record<number, LayoutRectangle>>({});
  const drag = useRef<{ from: number; over: number; moving: boolean } | null>(null);
  const xy = useRef(new Animated.ValueXY()).current;
  const [held, setHeld] = useState<{ from: number; over: number } | null>(null);
  const root = useRef<React.ComponentRef<typeof View>>(null);
  const moveRef = useRef(onMove);
  moveRef.current = onMove;
  const holdingRef = useRef(onHolding);
  holdingRef.current = onHolding;

  const stop = (apply: boolean) => {
    const d = drag.current;
    drag.current = null;
    setHeld(null);
    xy.setValue({ x: 0, y: 0 });
    holdingRef.current?.(false);
    if (apply && d && d.over !== d.from) moveRef.current(d.from, d.over);
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        // Takes the gesture only once an item is held (a long press started it).
        onMoveShouldSetPanResponderCapture: () => {
          if (!drag.current) return false;
          drag.current.moving = true;
          return true;
        },
        onPanResponderMove: (_, g) => {
          const d = drag.current;
          const f = d && frames.current[d.from];
          if (!d || !f) return;
          xy.setValue({ x: g.dx, y: g.dy });
          // The item under the centre of the one being moved.
          const cx = f.x + f.width / 2 + g.dx;
          const cy = f.y + f.height / 2 + g.dy;
          let over = d.from;
          let best = Infinity;
          for (const [k, r] of Object.entries(frames.current)) {
            const dist = Math.hypot(r.x + r.width / 2 - cx, r.y + r.height / 2 - cy);
            if (dist < best) {
              best = dist;
              over = Number(k);
            }
          }
          if (over !== d.over) {
            d.over = over;
            setHeld({ from: d.from, over });
          }
        },
        onPanResponderRelease: () => stop(true),
        onPanResponderTerminate: () => stop(false),
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Browser: while an item is held the page must not scroll, and a long press must not open
  // the browser's own menu or select the text.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = root.current as unknown as HTMLElement | null;
    if (!node?.addEventListener) return;
    const keepStill = (e: Event) => {
      if (drag.current) e.preventDefault();
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
  // The list changed under the finger (an item removed): nothing stays half-moved.
  useEffect(() => {
    frames.current = Object.fromEntries(Object.entries(frames.current).filter(([k]) => Number(k) < items.length));
  }, [items.length]);

  const start = (index: number) => {
    drag.current = { from: index, over: index, moving: false };
    xy.setValue({ x: 0, y: 0 });
    setHeld({ from: index, over: index });
    holdingRef.current?.(true);
    Haptics.selectionAsync().catch(() => {});
  };
  const release = (index: number) => {
    const d = drag.current;
    // Held, then let go without sliding.
    if (d && !d.moving && d.from === index) stop(false);
  };

  return (
    <View ref={root} style={[styles.row, rtl && { flexDirection: 'row-reverse' }]} {...pan.panHandlers}>
      {items.map((item, i) => {
        const moving = held?.from === i;
        const target = !!held && held.over === i && held.from !== i;
        return (
          <Animated.View
            key={keyOf(item, i)}
            onLayout={(e) => (frames.current[i] = e.nativeEvent.layout)}
            style={[styles.item, target && styles.target, moving && styles.moving, moving && { transform: [...xy.getTranslateTransform(), { scale: 1.08 }] }]}
          >
            <View style={[styles.head, rtl && { flexDirection: 'row-reverse' }]}>
              <Arrow icon={rtl ? 'chevronRight' : 'chevronLeft'} label={`${labels.earlier} (${i + 1})`} disabled={i === 0} onPress={() => onMove(i, i - 1)} />
              <Text style={styles.num}>{i + 1}</Text>
              <Arrow icon={rtl ? 'chevronLeft' : 'chevronRight'} label={`${labels.later} (${i + 1})`} disabled={i === items.length - 1} onPress={() => onMove(i, i + 1)} />
            </View>
            {render(item, i, { onLongPress: () => start(i), onPressOut: () => release(i), delayLongPress: 280 })}
          </Animated.View>
        );
      })}
    </View>
  );
}

function Arrow({ icon, label, disabled, onPress }: { icon: 'chevronLeft' | 'chevronRight'; label: string; disabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      aria-disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [styles.arrow, disabled && { opacity: 0.25 }, pressed && { backgroundColor: C.accentSoft }]}
    >
      <Icon name={icon} size={16} color={C.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: { alignItems: 'center', borderRadius: 12, borderWidth: 2, borderColor: 'transparent', padding: 2 },
  target: { borderColor: C.accent, backgroundColor: C.accentSoft },
  moving: { zIndex: 10, elevation: 6, opacity: 0.92 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  num: { minWidth: 18, textAlign: 'center', fontSize: 13, fontWeight: '900', color: C.textMuted },
  arrow: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
