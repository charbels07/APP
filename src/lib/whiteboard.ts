/**
 * The whiteboard (button of the bar, under the timer): lines drawn with the finger, in colours
 * and thicknesses, an eraser, undo / redo and "Clear the drawing", and pictures (from the device,
 * the camera or the web) under the ink, moved, resized and made see-through. Pure: the screen is
 * src/ui/screens/WhiteboardScreen.tsx.
 *
 * What is drawn stays on this device, in memory, while the app is open (going to the board and
 * back keeps it): it is never saved in the child's profile, so it never travels.
 */

export type WhiteboardColor = 'black' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'brown' | 'pink';
export type WhiteboardBackground = 'plain' | 'grid' | 'lines';

/** The colours offered, in order (strong enough to be seen on white). */
export const WB_COLORS: Record<WhiteboardColor, string> = {
  black: '#1D2939',
  red: '#D92D20',
  orange: '#EF6820',
  yellow: '#F5B800',
  green: '#079455',
  blue: '#1570EF',
  purple: '#7A5AF8',
  brown: '#93502B',
  pink: '#E31B8A',
};

/** The thicknesses offered (pixels); the eraser is wider than the line it removes. */
export const WB_SIZES = [4, 9, 16, 28];
export const ERASER_FACTOR = 2.5;

export interface Line {
  /** x, y, x, y… in pixels from the top left of the drawing area. */
  points: number[];
  color: string;
  width: number;
  /** Drawn with the eraser: rubs out the ink drawn before it (never the pictures under the ink). */
  erase?: boolean;
}

/** A picture put on the whiteboard; the ink is drawn over it. Pixels of the drawing area. */
export interface Picture {
  id: string;
  /** file:, blob:, data: or https: address, used on this device only (never saved or sent). */
  uri: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** 1 = solid; the transparency steps are `PICTURE_OPACITIES`. */
  opacity: number;
}

/** Transparency offered for a picture (0 %, 25 %, 50 %, 75 % see-through). */
export const PICTURE_OPACITIES = [1, 0.75, 0.5, 0.25];
/** Each "bigger" / "smaller" changes the size by this much. */
export const PICTURE_STEP = 1.2;
const MIN_PICTURE = 40;
const MAX_PICTURE = 4000;

export interface Whiteboard {
  lines: Line[];
  /** Lines taken back with "Undo", for "Redo" (emptied by a new line). */
  undone: Line[];
  color: WhiteboardColor;
  size: number;
  /** 'move': touching a picture chooses it and sliding moves it (nothing is drawn). */
  tool: 'pen' | 'eraser' | 'move';
  background: WhiteboardBackground;
  /** Pictures, the first one lowest. */
  pictures: Picture[];
  /** The picture whose size and transparency are being changed. */
  selected?: string;
}

export const EMPTY_WHITEBOARD: Whiteboard = { lines: [], undone: [], color: 'black', size: 1, tool: 'pen', background: 'plain', pictures: [] };

/** The SVG path of a line; a single touch leaves a dot. */
export function linePath(points: number[]): string {
  if (points.length < 2) return '';
  let d = `M${points[0].toFixed(1)} ${points[1].toFixed(1)}`;
  for (let i = 2; i + 1 < points.length; i += 2) d += ` L${points[i].toFixed(1)} ${points[i + 1].toFixed(1)}`;
  if (points.length === 2) d += ` L${(points[0] + 0.1).toFixed(1)} ${points[1].toFixed(1)}`;
  return d;
}

/** The line the next touch draws, with the tool, colour and thickness chosen. */
export function newLine(wb: Whiteboard, x: number, y: number): Line {
  const width = WB_SIZES[Math.max(0, Math.min(WB_SIZES.length - 1, wb.size))];
  return wb.tool === 'eraser'
    ? { points: [x, y], color: '#FFFFFF', width: Math.round(width * ERASER_FACTOR), erase: true }
    : { points: [x, y], color: WB_COLORS[wb.color], width };
}

/** A finished line joins the drawing; what "Redo" could bring back is forgotten. */
export function addLine(wb: Whiteboard, line: Line): Whiteboard {
  if (!line.points.length) return wb;
  return { ...wb, lines: [...wb.lines, line], undone: [] };
}

export function undo(wb: Whiteboard): Whiteboard {
  const last = wb.lines[wb.lines.length - 1];
  return last ? { ...wb, lines: wb.lines.slice(0, -1), undone: [...wb.undone, last] } : wb;
}

export function redo(wb: Whiteboard): Whiteboard {
  const back = wb.undone[wb.undone.length - 1];
  return back ? { ...wb, lines: [...wb.lines, back], undone: wb.undone.slice(0, -1) } : wb;
}

/** "Clear the drawing": the paper is white again; the tool, colour, thickness and background stay. */
export function clear(wb: Whiteboard): Whiteboard {
  return { ...wb, lines: [], undone: [] };
}

/** Adds a point to a line being drawn, unless it is within 2 px of the last one (lighter lines). */
export function extend(line: Line, x: number, y: number): boolean {
  const n = line.points.length;
  if (n >= 2 && Math.hypot(x - line.points[n - 2], y - line.points[n - 1]) < 2) return false;
  line.points.push(x, y);
  return true;
}

// ── Pictures ──

let pictureSeq = 0;

/**
 * A new picture, as large as 60 % of the drawing area allows (its proportions kept), in the middle,
 * on top of the other pictures; it is the one chosen.
 */
export function addPicture(wb: Whiteboard, uri: string, natural: { width: number; height: number }, area: { w: number; h: number }): Whiteboard {
  const nw = natural.width > 0 ? natural.width : 1;
  const nh = natural.height > 0 ? natural.height : 1;
  const scale = Math.min((area.w * 0.6) / nw, (area.h * 0.6) / nh, 1e9);
  const w = Math.max(MIN_PICTURE, Math.round(nw * scale));
  const h = Math.max(MIN_PICTURE, Math.round(nh * scale));
  const id = `p${Date.now().toString(36)}${(pictureSeq++).toString(36)}`;
  const pic: Picture = { id, uri, x: Math.round((area.w - w) / 2), y: Math.round((area.h - h) / 2), w, h, opacity: 1 };
  return { ...wb, pictures: [...wb.pictures, pic], selected: id };
}

const change = (wb: Whiteboard, id: string | undefined, fn: (p: Picture) => Picture): Whiteboard =>
  id && wb.pictures.some((p) => p.id === id) ? { ...wb, pictures: wb.pictures.map((p) => (p.id === id ? fn(p) : p)) } : wb;

/** Bigger (factor > 1) or smaller, around its middle, within reasonable bounds. */
export function resizePicture(wb: Whiteboard, id: string | undefined, factor: number): Whiteboard {
  return change(wb, id, (p) => {
    const f = Math.min(MAX_PICTURE / Math.max(p.w, p.h), Math.max(MIN_PICTURE / Math.min(p.w, p.h), factor));
    const w = Math.round(p.w * f);
    const h = Math.round(p.h * f);
    return { ...p, w, h, x: Math.round(p.x + (p.w - w) / 2), y: Math.round(p.y + (p.h - h) / 2) };
  });
}

export function setPictureOpacity(wb: Whiteboard, id: string | undefined, opacity: number): Whiteboard {
  return change(wb, id, (p) => ({ ...p, opacity: Math.max(0.1, Math.min(1, opacity)) }));
}

/** Slid by the finger; at least a corner of it stays inside the drawing area. */
export function movePicture(wb: Whiteboard, id: string | undefined, x: number, y: number, area: { w: number; h: number }): Whiteboard {
  return change(wb, id, (p) => ({
    ...p,
    x: Math.round(Math.max(-p.w + 30, Math.min(area.w - 30, x))),
    y: Math.round(Math.max(-p.h + 30, Math.min(area.h - 30, y))),
  }));
}

export function removePicture(wb: Whiteboard, id: string | undefined): Whiteboard {
  if (!id) return wb;
  const pictures = wb.pictures.filter((p) => p.id !== id);
  // Nothing left to move: the pen is back.
  const tool = !pictures.length && wb.tool === 'move' ? 'pen' : wb.tool;
  return { ...wb, pictures, tool, selected: wb.selected === id ? undefined : wb.selected };
}

/** The picture under a point (the highest one), if any. */
export function pictureAt(wb: Whiteboard, x: number, y: number): Picture | undefined {
  for (let i = wb.pictures.length - 1; i >= 0; i--) {
    const p = wb.pictures[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return p;
  }
  return undefined;
}

/**
 * The ink in layers for drawing: the pen lines between two eraser passes, each layer rubbed out by
 * every eraser line that came after it (so the eraser removes ink, never a picture under it).
 */
export function inkLayers(lines: Line[]): { pens: Line[]; erasers: Line[] }[] {
  const out: { pens: Line[]; erasers: Line[] }[] = [];
  let cur: { pens: Line[]; erasers: Line[] } = { pens: [], erasers: [] };
  for (const l of lines) {
    if (l.erase) cur.erasers.push(l);
    else {
      if (cur.erasers.length) {
        out.push(cur);
        cur = { pens: [], erasers: [] };
      }
      cur.pens.push(l);
    }
  }
  if (cur.pens.length || cur.erasers.length) out.push(cur);
  return out;
}
