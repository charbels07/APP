/**
 * The whiteboard (button of the bar, under the timer): lines drawn with the finger, in colours
 * and thicknesses, an eraser, undo / redo and "Clear the drawing". Pure: the screen is
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
  /** Drawn with the eraser: paints the paper's white over what is under it. */
  erase?: boolean;
}

export interface Whiteboard {
  lines: Line[];
  /** Lines taken back with "Undo", for "Redo" (emptied by a new line). */
  undone: Line[];
  color: WhiteboardColor;
  size: number;
  tool: 'pen' | 'eraser';
  background: WhiteboardBackground;
}

export const EMPTY_WHITEBOARD: Whiteboard = { lines: [], undone: [], color: 'black', size: 1, tool: 'pen', background: 'plain' };

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
