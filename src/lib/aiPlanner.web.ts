/**
 * AI proposals in the browser demo: uses the Claude access the demo page is
 * given by claude.ai (the viewer is asked to allow it on first use).
 * Only the topic text is sent — never the child's name, vocabulary or messages
 * (spec GEN-04), and nothing is spoken or added without the family's choice (GEN-02/03).
 */
import type { AiPlan } from './tlaPlanner';

type SampleJson = (input: string, options?: { modelTier?: string; signal?: AbortSignal }) => Promise<unknown>;
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
