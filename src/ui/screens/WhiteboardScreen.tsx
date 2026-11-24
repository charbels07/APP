import React, { useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Line as SvgLine, Path } from 'react-native-svg';
import { boardToolsStrings } from '../../i18n/boardTools';
import {
  addLine,
  clear,
  extend,
  linePath,
  newLine,
  redo,
  undo,
  WB_COLORS,
  WB_SIZES,
  type Line,
  type WhiteboardBackground,
  type WhiteboardColor,
} from '../../lib/whiteboard';
import { useApp } from '../../state/AppState';
import { checked } from '../a11y';
import { Btn, Segmented, useNavRtl } from '../common';
import { Icon } from '../Icon';
import { C, radius } from '../theme';

/** Squares of the "Grid" background, and the space between the lines of "Lines". */
const GRID = 40;

/** The finished lines, drawn again only when they change (not at each move of the finger). */
const Drawing = React.memo(function Drawing({ lines }: { lines: Line[] }) {
  return (
    <>
      {lines.map((l, i) => (
        <Path key={i} d={linePath(l.points)} stroke={l.color} strokeWidth={l.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      ))}
    </>
  );
});

/** The "Grid" or "Lines" of the paper: drawn over the ink, light, so that the eraser never removes them. */
function Paper({ kind, w, h }: { kind: WhiteboardBackground; w: number; h: number }) {
  if (kind === 'plain') return null;
  const out: React.ReactNode[] = [];
  for (let y = GRID; y < h; y += GRID) out.push(<SvgLine key={`h${y}`} x1={0} y1={y} x2={w} y2={y} stroke="#9DB4D8" strokeOpacity={0.55} strokeWidth={1} />);
  if (kind === 'grid')
    for (let x = GRID; x < w; x += GRID) out.push(<SvgLine key={`v${x}`} x1={x} y1={0} x2={x} y2={h} stroke="#9DB4D8" strokeOpacity={0.55} strokeWidth={1} />);
  return <>{out}</>;
}

/**
 * The whiteboard (button of the bar, under the timer): draw with the finger in colours and
 * thicknesses, rub out with the eraser, undo / redo, clear all, plain, squared or lined paper.
 * The timer stays usable above it. What is drawn is kept while the app is open (src/lib/whiteboard.ts).
 */
export function WhiteboardScreen() {
  const app = useApp();
  const { whiteboard: wb, setWhiteboard, profile } = app;
  const x = boardToolsStrings(profile.settings.uiLang);
  const rtl = useNavRtl();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [drawing, setDrawing] = useState<Line | null>(null);
  const current = useRef<Line | null>(null);
  const [asking, setAsking] = useState(false);
  const wbRef = useRef(wb);
  wbRef.current = wb;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };
  const point = (e: GestureResponderEvent): [number, number] => [e.nativeEvent.locationX, e.nativeEvent.locationY];
  const finish = () => {
    const line = current.current;
    current.current = null;
    setDrawing(null);
    if (line) setWhiteboard((w) => addLine(w, line));
  };

  const set = (patch: Partial<typeof wb>) => setWhiteboard((w) => ({ ...w, ...patch }));
  const colors = Object.keys(WB_COLORS) as WhiteboardColor[];
  const row = [styles.group, rtl && styles.rtl];

  return (
    <View style={styles.screen}>
      <View style={[styles.tools, rtl && styles.rtl]} accessibilityRole="toolbar" accessibilityLabel={x.whiteboard}>
        {/* Pen or eraser */}
        <View style={row} accessibilityRole="radiogroup">
          <Tool icon="pencil" label={x.pen} on={wb.tool === 'pen'} onPress={() => set({ tool: 'pen' })} />
          <Tool icon="eraser" label={x.eraser} on={wb.tool === 'eraser'} onPress={() => set({ tool: 'eraser' })} />
        </View>
        {/* Colours: choosing one takes the pen back */}
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel={x.color}>
          {colors.map((c) => {
            const on = wb.tool === 'pen' && wb.color === c;
            return (
              <Pressable
                key={c}
                onPress={() => set({ color: c, tool: 'pen' })}
                accessibilityRole="radio"
                accessibilityLabel={x.colors[c]}
                {...checked(on)}
                style={({ pressed }) => [styles.swatch, on && styles.swatchOn, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.swatchInk, { backgroundColor: WB_COLORS[c] }]}>
                  {on && <Icon name="check" size={16} color="#fff" strokeWidth={3} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        {/* Thickness (of the pen, and of the eraser) */}
        <View style={row} accessibilityRole="radiogroup" accessibilityLabel={x.thickness}>
          {WB_SIZES.map((px, i) => {
            const on = wb.size === i;
            return (
              <Pressable
                key={px}
                onPress={() => set({ size: i })}
                accessibilityRole="radio"
                accessibilityLabel={`${x.thickness} : ${x.sizes[i]}`}
                {...checked(on)}
                style={({ pressed }) => [styles.sizeBtn, on && styles.sizeOn, pressed && { opacity: 0.7 }]}
              >
                <View
                  style={{
                    width: Math.min(px, 26),
                    height: Math.min(px, 26),
                    borderRadius: 13,
                    backgroundColor: wb.tool === 'eraser' ? C.textMuted : WB_COLORS[wb.color],
                  }}
                />
              </Pressable>
            );
          })}
        </View>
        <View style={row}>
          <Btn small icon="undo" accessibilityLabel={x.undo} disabled={!wb.lines.length} onPress={() => setWhiteboard(undo)} />
          <Btn small icon="redo" accessibilityLabel={x.redo} disabled={!wb.undone.length} onPress={() => setWhiteboard(redo)} />
          <Btn small kind="danger" icon="trash" label={x.clear} disabled={!wb.lines.length} onPress={() => setAsking(true)} />
        </View>
        <View style={[row, styles.paperChoice]}>
          <Text style={styles.label}>{x.background}</Text>
          <Segmented
            value={wb.background}
            onChange={(v) => set({ background: v })}
            options={(['plain', 'grid', 'lines'] as WhiteboardBackground[]).map((v) => ({ value: v, label: x.backgrounds[v] }))}
          />
        </View>
      </View>

      {asking && (
        <View style={[styles.ask, rtl && styles.rtl]} accessibilityRole="alert">
          <Text style={styles.askText}>{x.clearAsk}</Text>
          <Btn small label={app.t.cancel} onPress={() => setAsking(false)} />
          <Btn
            small
            kind="primary"
            icon="trash"
            label={x.clearYes}
            onPress={() => {
              setWhiteboard(clear);
              setAsking(false);
            }}
          />
        </View>
      )}

      <View style={styles.paper} onLayout={onLayout}>
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} pointerEvents="none">
            <Drawing lines={wb.lines} />
            {drawing && (
              <Path
                d={linePath(drawing.points)}
                stroke={drawing.color}
                strokeWidth={drawing.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}
            <Paper kind={wb.background} w={size.w} h={size.h} />
          </Svg>
        )}
        {!wb.lines.length && !drawing && (
          <View style={styles.hintBox} pointerEvents="none">
            <Icon name="whiteboard" size={40} color={C.border} />
            <Text style={styles.hint}>{x.drawHere}</Text>
          </View>
        )}
        {/* Transparent layer on top: it receives the touches, so coordinates are relative to the paper. */}
        <View
          style={[StyleSheet.absoluteFill, Platform.OS === 'web' && ({ touchAction: 'none', cursor: 'crosshair' } as object)]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const [px, py] = point(e);
            const line = newLine(wbRef.current, px, py);
            current.current = line;
            setDrawing({ ...line, points: [...line.points] });
          }}
          onResponderMove={(e) => {
            const line = current.current;
            if (!line) return;
            const [px, py] = point(e);
            if (extend(line, px, py)) setDrawing({ ...line, points: [...line.points] });
          }}
          onResponderRelease={finish}
          onResponderTerminate={finish}
          accessibilityLabel={x.canvas}
          accessibilityRole="image"
        />
      </View>
    </View>
  );
}

function Tool({ icon, label, on, onPress }: { icon: 'pencil' | 'eraser'; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityLabel={label}
      {...checked(on)}
      style={({ pressed }) => [styles.tool, on && styles.toolOn, pressed && { opacity: 0.7 }]}
    >
      <Icon name={icon} size={20} color={on ? '#fff' : C.text} />
      <Text style={[styles.toolText, on && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, gap: 6 },
  rtl: { flexDirection: 'row-reverse' },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: radius.md,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  group: { flexDirection: 'row', alignItems: 'center', gap: 4, flexWrap: 'wrap', flexShrink: 1, minWidth: 0, maxWidth: '100%' },
  paperChoice: { gap: 8 },
  label: { fontSize: 14, fontWeight: '700', color: C.text },
  tool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  toolOn: { backgroundColor: C.accent, borderColor: C.accent },
  toolText: { fontSize: 14, fontWeight: '700', color: C.text },
  swatch: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  swatchOn: { borderColor: C.text },
  swatchInk: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  sizeBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  sizeOn: { borderColor: C.accent, borderWidth: 3, backgroundColor: C.accentSoft },
  ask: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    paddingLeft: 12,
    borderRadius: radius.md,
    backgroundColor: C.helpSoft,
    borderWidth: 1.5,
    borderColor: '#F4B4AE',
  },
  askText: { flex: 1, fontSize: 15, fontWeight: '800', color: C.help },
  paper: {
    flex: 1,
    minHeight: 160,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  hintBox: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
  hint: { fontSize: 18, fontWeight: '600', color: C.textMuted },
});
