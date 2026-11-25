/**
 * Visual scene of an activity board (pure): the size of the big picture beside the board, and the
 * circles drawn on the picture with a double touch (to show "here", to talk about a part of it).
 * The circles are a pointing gesture of the moment: never saved, never sent.
 */

/** The share of the room the picture takes (the board takes the rest). */
export const SCENE_MIN = 0.2;
export const SCENE_MAX = 0.75;
export const SCENE_DEFAULT = 0.35;
export const SCENE_STEP = 0.05;

/** A saved size, or the usual one when there is none (or it cannot be read). */
export function sceneSize(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= SCENE_MIN && v <= SCENE_MAX ? v : SCENE_DEFAULT;
}

/** One step bigger (+1) or smaller (−1), within bounds, rounded to the step. */
export function stepScene(v: unknown, dir: 1 | -1): number {
  const next = Math.round((sceneSize(v) + dir * SCENE_STEP) * 100) / 100;
  return Math.min(SCENE_MAX, Math.max(SCENE_MIN, next));
}

/** Where a picture of this size is drawn inside its place, whole and centred ("contain"). */
export function containRect(boxW: number, boxH: number, natW: number, natH: number): { x: number; y: number; w: number; h: number } {
  if (!(natW > 0 && natH > 0 && boxW > 0 && boxH > 0)) return { x: 0, y: 0, w: Math.max(0, boxW), h: Math.max(0, boxH) };
  const scale = Math.min(boxW / natW, boxH / natH);
  const w = natW * scale;
  const h = natH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

/** A circle, its centre as a share of the picture's width and height (it follows the picture when resized). */
export interface Mark {
  x: number;
  y: number;
}

/** The circle's radius, in pixels, for a picture drawn this size. */
export const markRadius = (w: number, h: number) => Math.max(26, Math.min(w, h) * 0.12);

/**
 * A double touch at (x, y) on the picture drawn w × h: a circle there, or, on a circle already
 * drawn, that circle goes away.
 */
export function toggleMark(marks: Mark[], x: number, y: number, w: number, h: number): Mark[] {
  if (!(w > 0 && h > 0)) return marks;
  const r = markRadius(w, h);
  const hit = marks.findIndex((m) => Math.hypot(m.x * w - x, m.y * h - y) <= r);
  if (hit >= 0) return marks.filter((_, i) => i !== hit);
  return [...marks, { x: Math.min(1, Math.max(0, x / w)), y: Math.min(1, Math.max(0, y / h)) }];
}

/** Two touches close in time and place make a double touch. */
export const DOUBLE_TOUCH_MS = 350;
export function isDoubleTouch(prev: { x: number; y: number; at: number } | null, x: number, y: number, at: number): boolean {
  return !!prev && at - prev.at <= DOUBLE_TOUCH_MS && Math.hypot(prev.x - x, prev.y - y) <= 40;
}
