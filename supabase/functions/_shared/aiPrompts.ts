/**
 * What the app asks Claude, shared by the browser demo (src/lib/aiPlanner.web.ts) and the
 * server function used by the real app (supabase/functions/caa-ai). Plain TypeScript, no imports.
 * Only the topic, the drawing or the photo is sent — never the child's name, words or sentences.
 */

/** Words already on every activity board (left columns + communication words): not to repeat. */
const ALREADY = 'je, tu, vouloir, aimer, encore, pas, fini, stop, aide-moi, quoi, regarde, à mon tour, j’aime ça, où';

const LANGS = 'français simple au singulier (comme dans un imagier), anglais, et arabe libanais parlé écrit en lettres arabes';

const PLAN_JSON = `{"title":{"fr":"","en":"","ar":""},"words":[{"fr":"farine","en":"flour","ar":"طحين","type":"nom"}],"steps":[{"fr":"se laver les mains","en":"wash hands","ar":"إغسل إيديك"}]}
"type" vaut "nom", "verbe", "adjectif" ou "social".`;

export function tlaPrompt(topic: string): string {
  return `Tu aides une orthophoniste à créer un tableau de langage assisté (TLA) pour un enfant qui communique avec la CAA (pictogrammes ARASAAC).

Situation : « ${topic.slice(0, 200)} »

1. Donne les 18 mots les plus utiles pour PARTICIPER à cette situation précise — pas à une situation voisine (ex. pour « préparer un gâteau » : les ingrédients, les ustensiles et les gestes de la recette, pas l'anniversaire). Mélange : objets/ingrédients concrets, actions (verbes à l'infinitif), 2 ou 3 mots pour commenter ou ressentir. Du plus utile au moins utile.
2. N'inclus pas ces mots déjà présents sur le tableau : ${ALREADY}.
3. Si la situation se fait en étapes, donne aussi les étapes dans l'ordre (5 à 10, chacune 1 à 4 mots : un geste ou un objet). Sinon "steps": [].
4. Pour chaque mot : ${LANGS}.

Réponds uniquement avec ce JSON :
${PLAN_JSON}`;
}

/** Photo → TLA: the parent photographs a menu, a game, a place, ingredients… */
export function photoPrompt(hint?: string): string {
  const h = hint?.trim() ? `\nLe parent précise : « ${hint.trim().slice(0, 200)} »\n` : '';
  return `Un parent a pris cette photo pour préparer un tableau de langage assisté (TLA) : un enfant qui communique avec des pictogrammes (CAA) va vivre cette activité (ex. : le menu d'un restaurant, une boîte de jeu, des ingrédients, un lieu).
${h}
1. Identifie ce qui est visible et utile pour l'activité (ex. pour un menu : les plats et boissons qu'on peut commander, en mots simples d'imagier — « pizza », « frites », pas le nom commercial). Pas de personnes ni de noms propres.
2. Ajoute ce qu'il faut pour PARTICIPER : 4 à 6 actions de l'activité (ex. au restaurant : commander, couper, ajouter, goûter, partager, payer), 2 ou 3 mots pour commenter ou dire ses préférences (ex. délicieux, piquant, trop chaud), et des mots pour demander ou refuser s'ils manquent.
3. N'inclus pas ces mots déjà présents sur le tableau : ${ALREADY}.
4. 12 à 20 mots au total, du plus utile au moins utile. Pas d'étapes : "steps": [].
5. Un titre court pour le tableau (ex. « restaurant », « jeu de l'oie »).
6. Pour chaque mot : ${LANGS}.
Si la photo ne montre rien d'utilisable (floue, vide), réponds avec "words": [].

Réponds uniquement avec ce JSON :
${PLAN_JSON}`;
}

export const DRAWING_PROMPT = `Un enfant (ou un parent) a dessiné ceci avec le doigt dans une application de communication par pictogrammes (CAA), pour trouver un mot.
Le dessin peut représenter un objet, un animal, un aliment, une personne, un lieu, une action, une émotion… ou être un mot écrit à la main. C'est souvent un dessin simple et maladroit.

Devine ce que c'est : 1 à 5 propositions, la plus probable d'abord. Des mots simples d'imagier : français au singulier, anglais, et arabe libanais parlé en lettres arabes. Si c'est un mot écrit, la première proposition est ce mot.

Réponds uniquement avec ce JSON :
{"guesses":[{"fr":"ballon","en":"ball","ar":"طابة"}]}`;

const LABELS = {
  type: 'object',
  properties: { fr: { type: 'string' }, en: { type: 'string' }, ar: { type: 'string' } },
  required: ['fr', 'en', 'ar'],
  additionalProperties: false,
} as const;

/** JSON shape of a proposal (structured outputs on the server). */
export const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    title: LABELS,
    words: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          fr: { type: 'string' },
          en: { type: 'string' },
          ar: { type: 'string' },
          type: { type: 'string', enum: ['nom', 'verbe', 'adjectif', 'social'] },
        },
        required: ['fr', 'en', 'ar', 'type'],
        additionalProperties: false,
      },
    },
    steps: { type: 'array', items: LABELS },
  },
  required: ['title', 'words', 'steps'],
  additionalProperties: false,
} as const;

export const DRAWING_SCHEMA = {
  type: 'object',
  properties: { guesses: { type: 'array', items: LABELS } },
  required: ['guesses'],
  additionalProperties: false,
} as const;

export type AiTask = 'tla' | 'photo' | 'drawing';

/** What the app sends to the server function. */
export interface AiRequest {
  task: AiTask;
  topic?: string;
  hint?: string;
  /** JPEG or PNG, base64 without the "data:" prefix (photo or drawing). */
  image?: { data: string; mediaType: 'image/jpeg' | 'image/png' };
}

/** Largest picture accepted (base64 characters ≈ 3 MB of image). */
export const MAX_IMAGE_B64 = 4_000_000;
