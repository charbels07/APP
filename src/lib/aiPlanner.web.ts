/**
 * AI proposals in the browser demo: uses the Claude access the demo page is
 * given by claude.ai (the viewer is asked to allow it on first use).
 * Only the topic text is sent — never the child's name, vocabulary or messages
 * (spec GEN-04), and nothing is spoken or added without the family's choice (GEN-02/03).
 */
import type { DrawingGuess, Stroke } from './aiPlanner';
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

export function tlaPrompt(topic: string): string {
  return `Tu aides une orthophoniste à créer un tableau de langage assisté (TLA) pour un enfant qui communique avec la CAA (pictogrammes ARASAAC).

Situation : « ${topic.slice(0, 200)} »

1. Donne les 18 mots les plus utiles pour PARTICIPER à cette situation précise — pas à une situation voisine (ex. pour « préparer un gâteau » : les ingrédients, les ustensiles et les gestes de la recette, pas l'anniversaire). Mélange : objets/ingrédients concrets, actions (verbes à l'infinitif), 2 ou 3 mots pour commenter ou ressentir. Du plus utile au moins utile.
2. N'inclus pas ces mots déjà présents sur le tableau : je, tu, vouloir, aimer, encore, pas, fini, stop, aide-moi, quoi, regarde, à mon tour, j'aime ça, où.
3. Si la situation se fait en étapes, donne aussi les étapes dans l'ordre (5 à 10, chacune 1 à 4 mots : un geste ou un objet). Sinon "steps": [].
4. Pour chaque mot : français simple au singulier (comme dans un imagier), anglais, et arabe libanais parlé écrit en lettres arabes.

Réponds uniquement avec ce JSON :
{"title":{"fr":"","en":"","ar":""},"words":[{"fr":"farine","en":"flour","ar":"طحين","type":"nom"}],"steps":[{"fr":"se laver les mains","en":"wash hands","ar":"إغسل إيديك"}]}
"type" vaut "nom", "verbe", "adjectif" ou "social".`;
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

const DRAWING_PROMPT = `Un enfant (ou un parent) a dessiné ceci avec le doigt dans une application de communication par pictogrammes (CAA), pour trouver un mot.
Le dessin peut représenter un objet, un animal, un aliment, une personne, un lieu, une action, une émotion… ou être un mot écrit à la main. C'est souvent un dessin simple et maladroit.

Devine ce que c'est : 1 à 5 propositions, la plus probable d'abord. Des mots simples d'imagier : français au singulier, anglais, et arabe libanais parlé en lettres arabes. Si c'est un mot écrit, la première proposition est ce mot.

Réponds uniquement avec ce JSON :
{"guesses":[{"fr":"ballon","en":"ball","ar":"طابة"}]}`;

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
