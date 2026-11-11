/**
 * AI help (spec §20, "service de génération") on phones and tablets: the app's server function
 * "caa-ai" (supabase/functions/caa-ai) asks Claude. Without a configured server (offline demo build)
 * it is unavailable and the app uses the situation library and the pictogram library's categories instead.
 * The browser demo uses aiPlanner.web.ts. Only the topic or the photo is sent (spec GEN-04).
 */
import { backend } from '../backend';
import type { AiPhoto } from './photoForAi';
import type { AiPlan } from './tlaPlanner';

/** A finger stroke: [x0, y0, x1, y1, …] in drawing-pad coordinates. */
export type Stroke = number[];
export interface DrawingGuess {
  fr?: string;
  en?: string;
  ar?: string;
}

export async function aiAvailable(): Promise<boolean> {
  return !!backend().askAi;
}

const asPlan = (data: unknown): AiPlan | null => (data && typeof data === 'object' && Array.isArray((data as AiPlan).words) ? (data as AiPlan) : null);

export async function askAiForTla(topic: string, signal?: AbortSignal): Promise<AiPlan | null> {
  const api = backend();
  if (!api.askAi) return null;
  try {
    return asPlan(await api.askAi({ task: 'tla', topic }, signal));
  } catch {
    return null;
  }
}

/** Photo → activity board: what the photo shows, plus words to take part (see aiPrompts.photoPrompt). */
export async function askAiForPhoto(photo: AiPhoto, hint: string, signal?: AbortSignal): Promise<AiPlan | null> {
  const api = backend();
  if (!api.askAi) return null;
  try {
    return asPlan(await api.askAi({ task: 'photo', hint, image: { data: photo.data, mediaType: photo.mediaType } }, signal));
  } catch {
    return null;
  }
}

/** What a drawing shows (search by drawing). null = recognition unavailable on this device
 *  (drawings are read in the browser demo; on devices this needs the drawing as a picture). */
export async function askAiToReadDrawing(
  _strokes: Stroke[],
  _width: number,
  _height: number,
  _signal?: AbortSignal,
): Promise<DrawingGuess[] | null> {
  return null;
}
