/**
 * AI proposals in the browser demo: uses the Claude access the demo page is
 * given by claude.ai (the viewer is asked to allow it on first use).
 * Only the topic text is sent — never the child's name, vocabulary or messages
 * (spec GEN-04), and nothing is spoken or added without the family's choice (GEN-02/03).
 */
import { DRAWING_PROMPT, photoPrompt, tlaPrompt } from '../../supabase/functions/_shared/aiPrompts';
import type { DrawingGuess, Stroke } from './aiPlanner';
import type { AiPhoto } from './photoForAi';
import type { AiPlan } from './tlaPlanner';

export type { DrawingGuess, Stroke } from './aiPlanner';

type SampleJson = (
  input: string,
  options?: { modelTier?: string; signal?: AbortSignal; images?: Blob[] },
) => Promise<unknown>;
type Sample = { json: SampleJson };

let samplePromise: Promise<Sample | null> | null = null;
function getSample(): Promise<Sample | null> {
  const claude = (globalThis as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  if (!claude?.use) return Promise.resolve(null);
  samplePromise ??= claude
    .use('sample')
    .then((s) => (s ? (s as Sample) : null))
    .catch(() => null);
  return samplePromise;
}

export async function aiAvailable(): Promise<boolean> {
  return (await getSample()) !== null;
}

export async function askAiForTla(topic: string, signal?: AbortSignal): Promise<AiPlan | null> {
  const sample = await getSample();
  if (!sample) return null;
  try {
    const data = (await sample.json(tlaPrompt(topic), { modelTier: 'default', signal })) as AiPlan;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/** Photo → activity board: only the photo (and the parent's few words) is sent. */
export async function askAiForPhoto(photo: AiPhoto, hint: string, signal?: AbortSignal): Promise<AiPlan | null> {
  const sample = await getSample();
  if (!sample) return null;
  try {
    const bytes = Uint8Array.from(atob(photo.data), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: photo.mediaType });
    const data = (await sample.json(photoPrompt(hint), { images: [blob], modelTier: 'default', signal })) as AiPlan;
    return data && typeof data === 'object' && Array.isArray(data.words) ? data : null;
  } catch {
    return null;
  }
}

/** Draws the strokes, cropped and centred, black on white (what Claude looks at). */
function drawingToPng(strokes: Stroke[]): Promise<Blob | null> {
  const size = 512;
  const xs = strokes.flatMap((st) => st.filter((_, i) => i % 2 === 0));
  const ys = strokes.flatMap((st) => st.filter((_, i) => i % 2 === 1));
  if (!xs.length) return Promise.resolve(null);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const scale = (size * 0.84) / Math.max(maxX - minX, maxY - minY, 1);
  const offX = (size - (maxX - minX) * scale) / 2;
  const offY = (size - (maxY - minY) * scale) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return Promise.resolve(null);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 9;
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const st of strokes) {
    ctx.beginPath();
    for (let i = 0; i < st.length; i += 2) {
      const x = offX + (st[i] - minX) * scale;
      const y = offY + (st[i + 1] - minY) * scale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    if (st.length === 2) ctx.lineTo(offX + (st[0] - minX) * scale + 0.1, offY + (st[1] - minY) * scale);
    ctx.stroke();
  }
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'));
}

/** Search by drawing: only the drawing is sent (spec GEN-04). null = AI unavailable here. */
export async function askAiToReadDrawing(
  strokes: Stroke[],
  _width: number,
  _height: number,
  signal?: AbortSignal,
): Promise<DrawingGuess[] | null> {
  const sample = await getSample();
  if (!sample) return null;
  const png = await drawingToPng(strokes);
  if (!png) return [];
  try {
    const data = (await sample.json(DRAWING_PROMPT, { images: [png], modelTier: 'quick', signal })) as {
      guesses?: DrawingGuess[];
    };
    return Array.isArray(data?.guesses) ? data.guesses.filter((g) => g && (g.fr || g.en || g.ar)).slice(0, 5) : [];
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'not_granted' || code === 'images_unavailable') return null;
    return [];
  }
}
