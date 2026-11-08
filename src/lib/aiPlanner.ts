/**
 * AI proposals for TLAs (spec §20, "service de génération").
 *
 * On devices this needs the family's generation service (a small server that
 * calls Claude with the same prompt): not built yet, so it is unavailable and
 * the app uses the situation library and ARASAAC categories instead.
 * The browser demo uses aiPlanner.web.ts.
 */
import type { AiPlan } from './tlaPlanner';

/** A finger stroke: [x0, y0, x1, y1, …] in drawing-pad coordinates. */
export type Stroke = number[];
export interface DrawingGuess {
  fr?: string;
  en?: string;
  ar?: string;
}

export async function aiAvailable(): Promise<boolean> {
  return false;
}

export async function askAiForTla(_topic: string, _signal?: AbortSignal): Promise<AiPlan | null> {
  return null;
}

/** What a drawing shows (search by drawing). null = recognition unavailable on this device. */
export async function askAiToReadDrawing(
  _strokes: Stroke[],
  _width: number,
  _height: number,
  _signal?: AbortSignal,
): Promise<DrawingGuess[] | null> {
  return null;
}
