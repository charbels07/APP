import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { Stroke } from '../lib/aiPlanner';
import { C, radius } from './theme';

const toPath = (st: Stroke) => {
  if (st.length < 2) return '';
  let d = `M${st[0].toFixed(1)} ${st[1].toFixed(1)}`;
  for (let i = 2; i < st.length; i += 2) d += ` L${st[i].toFixed(1)} ${st[i + 1].toFixed(1)}`;
  // A single tap leaves a dot.
  if (st.length === 2) d += ` L${(st[0] + 0.1).toFixed(1)} ${st[1].toFixed(1)}`;
  return d;
};

/** Finger drawing area (search by drawing). Strokes are kept by the parent. */
export function DrawPad({
  strokes,
  onChange,
  height = 260,
  onSize,
  onPen,
}: {
  strokes: Stroke[];
  onChange: (strokes: Stroke[]) => void;
  height?: number;
  onSize?: (w: number, h: number) => void;
  /** Finger down / up (the parent stops scrolling meanwhile). */
  onPen?: (down: boolean) => void;
}) {
  const [width, setWidth] = useState(0);
  const current = useRef<Stroke | null>(null);
  /** Strokes before the one being drawn (fixed while the finger is down). */
  const before = useRef<Stroke[]>([]);
  const latest = useRef(strokes);
  latest.current = strokes;

  const point = (e: GestureResponderEvent): [number, number] => [e.nativeEvent.locationX, e.nativeEvent.locationY];

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
    onSize?.(e.nativeEvent.layout.width, height);
  };

  return (
    <View style={[styles.pad, { height }]} onLayout={onLayout}>
      {width > 0 && (
        <Svg width={width} height={height} pointerEvents="none">
          {strokes.map((st, i) => (
            <Path key={i} d={toPath(st)} stroke={C.text} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      )}
      {/* Transparent layer on top: it receives the touches, so coordinates are relative to the pad. */}
      <View
        style={[StyleSheet.absoluteFill, Platform.OS === 'web' && ({ touchAction: 'none', cursor: 'crosshair' } as object)]}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={(e) => {
          onPen?.(true);
          before.current = latest.current;
          current.current = point(e);
          onChange([...before.current, [...current.current]]);
        }}
        onResponderMove={(e) => {
          const st = current.current;
          if (!st) return;
          const [x, y] = point(e);
          // Skip points closer than 2 px: lighter strokes, same drawing.
          if (Math.hypot(x - st[st.length - 2], y - st[st.length - 1]) < 2) return;
          st.push(x, y);
          onChange([...before.current, [...st]]);
        }}
        onResponderRelease={() => {
          current.current = null;
          onPen?.(false);
        }}
        onResponderTerminate={() => {
          current.current = null;
          onPen?.(false);
        }}
        accessibilityLabel="drawing pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pad: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
});
