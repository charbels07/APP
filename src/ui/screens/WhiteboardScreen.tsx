import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Svg, { Defs, G, Line as SvgLine, Mask, Path, Rect } from 'react-native-svg';
import { boardToolsStrings } from '../../i18n/boardTools';
import {
  addLine,
  addPicture,
  clear,
  extend,
  inkLayers,
  linePath,
  movePicture,
  newLine,
  PICTURE_OPACITIES,
  PICTURE_STEP,
  pictureAt,
  redo,
  removePicture,
  resizePicture,
  setPictureOpacity,
  undo,
  WB_COLORS,
  WB_SIZES,
  type Line,
  type Picture,
  type WhiteboardBackground,
  type WhiteboardColor,
} from '../../lib/whiteboard';
import { pastedPicture, pickBoardPicture, pictureSize, webPictureLink, type BoardPicture } from '../../lib/whiteboardPicture';
import { useApp } from '../../state/AppState';
import { checked } from '../a11y';
import { Btn, Field, Panel, Segmented, useNavRtl } from '../common';
import { Icon, type IconName } from '../Icon';
import { C, radius } from '../theme';

/** Squares of the "Grid" background, and the space between the lines of "Lines". */
const GRID = 40;

const pathOf = (l: Line, color?: string) => (
  <Path d={linePath(l.points)} stroke={color ?? l.color} strokeWidth={l.width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
);

/**
 * The ink: pen lines in layers, each layer rubbed out by the eraser lines that came after it (an SVG
 * mask), so the eraser removes ink and never the pictures under it.
 */
const Ink = React.memo(function Ink({ lines, w, h }: { lines: Line[]; w: number; h: number }) {
  const masks: React.ReactNode[] = [];
  let acc: React.ReactNode = null;
  inkLayers(lines).forEach((layer, i) => {
    acc = (
      <G key={`l${i}`}>
        {acc}
        {layer.pens.map((l, j) => (
          <React.Fragment key={j}>{pathOf(l)}</React.Fragment>
        ))}
      </G>
    );
    if (layer.erasers.length) {
      const id = `wbErase${i}`;
      masks.push(
        <Mask key={id} id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={w} height={h}>
          <Rect x={0} y={0} width={w} height={h} fill="#FFFFFF" />
          {layer.erasers.map((l, j) => (
            <React.Fragment key={j}>{pathOf(l, '#000000')}</React.Fragment>
          ))}
        </Mask>,
      );
      acc = (
        <G key={`m${i}`} mask={`url(#${id})`}>
          {acc}
        </G>
      );
    }
  });
  return (
    <>
      <Defs>{masks}</Defs>
      {acc}
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
 * thicknesses, rub out with the eraser, undo / redo, clear, plain, squared or lined paper, and
 * pictures under the ink (device, camera, a copied picture or a web address), moved, resized and
 * made see-through. The timer stays usable above it. Kept while the app is open (src/lib/whiteboard.ts).
 */
export function WhiteboardScreen() {
  const app = useApp();
  const { whiteboard: wb, setWhiteboard, profile } = app;
  const x = boardToolsStrings(profile.settings.uiLang);
  const rtl = useNavRtl();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const [drawing, setDrawing] = useState<Line | null>(null);
  const current = useRef<Line | null>(null);
  /** Move tool: the picture being slid and where the finger took it. */
  const sliding = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [asking, setAsking] = useState(false);
  const [adding, setAdding] = useState(false);
  const wbRef = useRef(wb);
  wbRef.current = wb;

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (Math.abs(width - size.w) > 1 || Math.abs(height - size.h) > 1) setSize({ w: width, h: height });
  };
  const point = (e: GestureResponderEvent): [number, number] => [e.nativeEvent.locationX, e.nativeEvent.locationY];
  const finish = () => {
    sliding.current = null;
    const line = current.current;
    current.current = null;
    setDrawing(null);
    if (line) setWhiteboard((w) => addLine(w, line));
  };
  const put = (pic: BoardPicture) => {
    const area = sizeRef.current.w > 0 ? sizeRef.current : { w: 800, h: 500 };
    setWhiteboard((w) => addPicture(w, pic.uri, pic, area));
  };

  // In a browser, Ctrl+V / ⌘V pastes a picture copied from a web page (or its address) onto the board.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const onPaste = (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const file = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'))?.getAsFile();
      if (file) {
        e.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const uri = String(reader.result ?? '');
          void pictureSize(uri).then((s) => s && put({ uri, ...s }));
        };
        reader.readAsDataURL(file);
        setAdding(false);
        return;
      }
      const link = webPictureLink(e.clipboardData?.getData('text') ?? '');
      // A link typed into the address field is left to the field.
      if (link && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        void pictureSize(link).then((s) => s && put({ uri: link, ...s }));
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<typeof wb>) => setWhiteboard((w) => ({ ...w, ...patch }));
  const colors = Object.keys(WB_COLORS) as WhiteboardColor[];
  const row = [styles.group, rtl && styles.rtl];
  const chosen = wb.pictures.find((p) => p.id === wb.selected);
  const moving = wb.tool === 'move';

  return (
    <View style={styles.screen}>
      <View style={[styles.tools, rtl && styles.rtl]} accessibilityRole="toolbar" accessibilityLabel={x.whiteboard}>
        {/* Pen, eraser, or moving the pictures */}
        <View style={row} accessibilityRole="radiogroup">
          <Tool icon="pencil" label={x.pen} on={wb.tool === 'pen'} onPress={() => set({ tool: 'pen' })} />
          <Tool icon="eraser" label={x.eraser} on={wb.tool === 'eraser'} onPress={() => set({ tool: 'eraser' })} />
          {wb.pictures.length > 0 && <Tool icon="move" label={x.move} on={moving} onPress={() => set({ tool: 'move' })} />}
        </View>
        <Btn small icon="image" label={x.addPicture} onPress={() => setAdding(true)} />
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

      {/* The picture chosen: its size, how see-through it is, removing it. */}
      {chosen && (
        <View style={[styles.tools, styles.pictureBar, rtl && styles.rtl]} accessibilityRole="toolbar" accessibilityLabel={x.picture}>
          <Image source={{ uri: chosen.uri }} style={[styles.thumb, { opacity: chosen.opacity }]} resizeMode="contain" accessibilityIgnoresInvertColors />
          <Btn small icon="minus" label={x.smaller} onPress={() => setWhiteboard((w) => resizePicture(w, chosen.id, 1 / PICTURE_STEP))} />
          <Btn small icon="plus" label={x.bigger} onPress={() => setWhiteboard((w) => resizePicture(w, chosen.id, PICTURE_STEP))} />
          <View style={[row, styles.paperChoice]}>
            <Text style={styles.label}>{x.transparency}</Text>
            <Segmented
              value={PICTURE_OPACITIES.reduce((best, o) => (Math.abs(o - chosen.opacity) < Math.abs(best - chosen.opacity) ? o : best), 1)}
              onChange={(o) => setWhiteboard((w) => setPictureOpacity(w, chosen.id, o))}
              options={PICTURE_OPACITIES.map((o) => ({ value: o, label: `${Math.round((1 - o) * 100)} %` }))}
            />
          </View>
          <Btn small kind="danger" icon="trash" label={x.removePicture} onPress={() => setWhiteboard((w) => removePicture(w, chosen.id))} />
          <Btn small icon="x" accessibilityLabel={app.t.close} onPress={() => set({ selected: undefined })} />
          {moving && <Text style={styles.note}>{x.moveHint}</Text>}
        </View>
      )}

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
        {/* The pictures, under the ink. */}
        {wb.pictures.map((p) => (
          <PictureView key={p.id} pic={p} outlined={moving && p.id === wb.selected} />
        ))}
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Ink lines={drawing ? [...wb.lines, drawing] : wb.lines} w={size.w} h={size.h} />
            <Paper kind={wb.background} w={size.w} h={size.h} />
          </Svg>
        )}
        {!wb.lines.length && !wb.pictures.length && !drawing && (
          <View style={styles.hintBox} pointerEvents="none">
            <Icon name="whiteboard" size={40} color={C.border} />
            <Text style={styles.hint}>{x.drawHere}</Text>
          </View>
        )}
        {/* Transparent layer on top: it receives the touches, so coordinates are relative to the paper. */}
        <View
          style={[StyleSheet.absoluteFill, Platform.OS === 'web' && ({ touchAction: 'none', cursor: moving ? 'move' : 'crosshair' } as object)]}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => true}
          onResponderTerminationRequest={() => false}
          onResponderGrant={(e) => {
            const [px, py] = point(e);
            if (wbRef.current.tool === 'move') {
              const hit = pictureAt(wbRef.current, px, py);
              sliding.current = hit ? { id: hit.id, dx: px - hit.x, dy: py - hit.y } : null;
              set({ selected: hit?.id });
              return;
            }
            const line = newLine(wbRef.current, px, py);
            current.current = line;
            setDrawing({ ...line, points: [...line.points] });
          }}
          onResponderMove={(e) => {
            const [px, py] = point(e);
            const s = sliding.current;
            if (s) return setWhiteboard((w) => movePicture(w, s.id, px - s.dx, py - s.dy, sizeRef.current));
            const line = current.current;
            if (!line) return;
            if (extend(line, px, py)) setDrawing({ ...line, points: [...line.points] });
          }}
          onResponderRelease={finish}
          onResponderTerminate={finish}
          accessibilityLabel={x.canvas}
          accessibilityRole="image"
        />
      </View>
      {adding && <AddPicturePanel onClose={() => setAdding(false)} onPicture={(p) => (put(p), setAdding(false))} />}
    </View>
  );
}

function PictureView({ pic, outlined }: { pic: Picture; outlined: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.picture, { left: pic.x, top: pic.y, width: pic.w, height: pic.h }, outlined && styles.pictureOn]}>
      <Image source={{ uri: pic.uri }} style={{ width: '100%', height: '100%', opacity: pic.opacity }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** "Add a picture": the device's pictures, the camera, a copied picture, or a web address. */
function AddPicturePanel({ onClose, onPicture }: { onClose: () => void; onPicture: (p: BoardPicture) => void }) {
  const app = useApp();
  const { t } = app;
  const x = boardToolsStrings(app.profile.settings.uiLang);
  const [link, setLink] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const take = async (get: () => Promise<BoardPicture | null>, none: string | null) => {
    setMsg(null);
    setBusy(true);
    const p = await get();
    setBusy(false);
    if (!p) return none && setMsg(none);
    // A size the source did not give is read from the picture itself.
    const s = p.width > 0 && p.height > 0 ? p : { ...p, ...((await pictureSize(p.uri)) ?? { width: 4, height: 3 }) };
    onPicture(s);
  };
  const fromLink = () => {
    const url = webPictureLink(link);
    if (!url) return setMsg(x.linkBad);
    void take(async () => {
      const s = await pictureSize(url);
      return s ? { uri: url, ...s } : null;
    }, x.linkBad);
  };
  return (
    <Panel title={x.pictureTitle} onClose={onClose} tone="default" maxWidth={620}>
      <Text style={styles.note}>{x.pictureNote}</Text>
      <View style={styles.group}>
        <Btn icon="image" label={t.pickPicture} disabled={busy} onPress={() => void take(() => pickBoardPicture('library'), null)} />
        <Btn icon="camera" label={t.takePhoto} disabled={busy} onPress={() => void take(() => pickBoardPicture('camera'), null)} />
        <Btn icon="clipboard" label={x.pastePicture} disabled={busy} onPress={() => void take(pastedPicture, x.pasteNone)} />
      </View>
      <Text style={styles.note}>{x.webHow}</Text>
      <Field
        label={x.webLink}
        value={link}
        onChangeText={(v) => {
          setLink(v);
          setMsg(null);
        }}
        onSubmitEditing={fromLink}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Btn kind="primary" icon="plus" label={x.addLink} disabled={busy || !link.trim()} onPress={fromLink} />
      {msg ? (
        <Text style={styles.warn} accessibilityRole="alert">
          {msg}
        </Text>
      ) : null}
    </Panel>
  );
}

function Tool({ icon, label, on, onPress }: { icon: IconName; label: string; on: boolean; onPress: () => void }) {
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
  pictureBar: { paddingVertical: 6 },
  thumb: { width: 40, height: 40, borderRadius: radius.sm, backgroundColor: C.surfaceAlt },
  picture: { position: 'absolute' },
  pictureOn: { borderWidth: 2, borderColor: C.accent, borderStyle: 'dashed' },
  note: { fontSize: 13, color: C.textMuted },
  warn: { backgroundColor: C.editSoft, color: C.edit, padding: 10, borderRadius: radius.md, fontWeight: '700' },
});
