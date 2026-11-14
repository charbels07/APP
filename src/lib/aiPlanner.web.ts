/**
 * AI proposals in a browser. Two cases:
 *  - the online demo (a page of claude.ai): it uses the Claude access that page is given
 *    (the viewer is asked to allow it on first use);
 *  - the real website: like tablets, it asks the app's own server function "caa-ai"
 *    (supabase/functions/caa-ai), which holds the key. Without that function deployed the
 *    request fails and the app falls back to its built-in library.
 * Only the topic, the photo or the drawing is sent — never the child's name, vocabulary or
 * messages (spec GEN-04), and nothing is spoken or added without the family's choice (GEN-02/03).
 */
import { backend } from '../backend';
import { drawingPrompt, photoPrompt, tlaPrompt } from '../../supabase/functions/_shared/aiPrompts';
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

/** After a request that failed, the AI is left alone until the page is opened again (no error sentence). */
let down = false;

export async function aiAvailable(): Promise<boolean> {
  if ((await getSample()) !== null) return true;
  const api = backend();
  if (down || !api.askAi) return false;
  return api.aiReady ? api.aiReady() : true;
}

/** The app's own server function (real website), when the page has no Claude access of its own. */
async function askServer(req: Parameters<NonNullable<ReturnType<typeof backend>['askAi']>>[0], signal?: AbortSignal): Promise<unknown> {
  const api = backend();
  if (!api.askAi) return null;
  try {
    return await api.askAi(req, signal);
  } catch {
    if (!signal?.aborted) down = true;
    return null;
  }
}
const isPlan = (d: unknown): d is AiPlan => !!d && typeof d === 'object' && Array.isArray((d as AiPlan).words);
const toBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });

export async function askAiForTla(topic: string, signal?: AbortSignal, arabic?: string): Promise<AiPlan | null> {
  const sample = await getSample();
  if (!sample) {
    const d = await askServer({ task: 'tla', topic, arabic }, signal);
    return isPlan(d) ? d : null;
  }
  try {
    const data = (await sample.json(tlaPrompt(topic, arabic), { modelTier: 'default', signal })) as AiPlan;
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

/** Photo → activity board: only the photo (and the parent's few words) is sent. */
export async function askAiForPhoto(photo: AiPhoto, hint: string, signal?: AbortSignal, arabic?: string): Promise<AiPlan | null> {
  const sample = await getSample();
  if (!sample) {
    const d = await askServer({ task: 'photo', hint, arabic, image: { data: photo.data, mediaType: photo.mediaType } }, signal);
    return isPlan(d) ? d : null;
  }
  try {
    const bytes = Uint8Array.from(atob(photo.data), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: photo.mediaType });
    const data = (await sample.json(photoPrompt(hint, arabic), { images: [blob], modelTier: 'default', signal })) as AiPlan;
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
  arabic?: string,
): Promise<DrawingGuess[] | null> {
  const sample = await getSample();
  if (!sample && !backend().askAi) return null;
  const png = await drawingToPng(strokes);
  if (!png) return [];
  if (!sample) {
    // Real website: the drawing goes to the app's server function as a picture.
    const data = (await askServer({ task: 'drawing', arabic, image: { data: await toBase64(png), mediaType: 'image/png' } }, signal)) as { guesses?: DrawingGuess[] } | null;
    if (!data) return null;
    return Array.isArray(data.guesses) ? data.guesses.filter((g) => g && (g.fr || g.en || g.ar)).slice(0, 5) : [];
  }
  try {
    const data = (await sample.json(drawingPrompt(arabic), { images: [png], modelTier: 'quick', signal })) as {
      guesses?: DrawingGuess[];
    };
    return Array.isArray(data?.guesses) ? data.guesses.filter((g) => g && (g.fr || g.en || g.ar)).slice(0, 5) : [];
  } catch (e) {
    const code = (e as { code?: string })?.code;
    if (code === 'not_granted' || code === 'images_unavailable') return null;
    return [];
  }
}
