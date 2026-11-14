/**
 * Kinds of the situation library's words that are not things: the actions (green, verbs), the
 * describing words (blue) and the social words (pink). A word of the library that is in none of
 * these lists is a thing. Used to colour a new word and to put it in the right column of an
 * activity board; a word the child already has keeps its own kind.
 * (A test checks that every word listed here is still in the library.)
 */
import type { WordClass } from '../model/types';

const ACTIONS = [
  'mélanger', 'verser', 'casser', 'peser', 'goûter', 'attendre', 'retourner', 'manger', 'étaler', 'couper', 'mettre', 'éplucher', 'laver',
  'aider', 'cuire', 'boire', 'frotter', 'rincer', 'sécher', 'ouvrir le robinet', 'fermer le robinet', 'cracher', 'brosser', 'ranger', 'sortir',
  'faire pipi', "tirer la chasse d'eau", 'baisser', 'remonter', 'enlever', 'boutonner', 'dormir', 'éteindre', "s'habiller", 'souffler', 'ouvrir',
  'chanter', 'jouer', 'danser', 'applaudir', 'arriver', 'décorer', 'prier', 'visiter', 'embrasser', 'nager', 'sauter', 'plonger', "sortir de l'eau",
  'courir', 'grimper', 'glisser', 'pousser', 'regarder', 'nourrir', 'caresser', 'rire', 'acheter', 'commander', 'payer', 'coiffer',
  'couper les cheveux', 'laver les cheveux', 'lire', 'écrire', 'dessiner', 'lever la main', 'choisir', 'rendre', 'conduire', 'arrêter', 'monter',
  'descendre', "s'asseoir", 'être debout', 'décoller', 'atterrir', 'peindre', 'montrer', 'rouler', 'aplatir', 'construire', 'tomber', 'lancer',
  'gagner', 'perdre', 'avancer', 'reculer', 'tricher', 'tourner la page', 'écouter', 'planter', 'arroser', 'se laver les mains',
  'se brosser les dents', 'se déshabiller', 'se réveiller', 'se lever', 'se coiffer', 'se baigner',
];
const DESCRIBING = [
  'chaud', 'froid', 'délicieux', 'sale', 'propre', 'fatigué', 'content', 'bruyant', 'beau', 'grand', 'petit', 'drôle', 'assis', 'court', 'long',
  'courageux', 'vite', 'lentement', 'loin', 'rouge', 'bleu', 'jaune', 'vert', 'noir', 'mou', 'dur', 'triste', 'fort', 'doucement',
];
const SOCIAL = ['au revoir', 'merci', 'bravo', 'bonne nuit', 'Joyeux Anniversaire !', 'mon tour', 'silence'];

const norm = (w: string) => w.trim().toLocaleLowerCase('fr');
const KIND = new Map<string, WordClass>([
  ...ACTIONS.map((w): [string, WordClass] => [norm(w), 'verb']),
  ...DESCRIBING.map((w): [string, WordClass] => [norm(w), 'descriptor']),
  ...SOCIAL.map((w): [string, WordClass] => [norm(w), 'social']),
]);

/** The kind of a situation word (its French label), when it is not a thing. */
export function situationWordKind(label: string): WordClass | undefined {
  return KIND.get(norm(label));
}

/** For the tests: every word listed above. */
export const SITUATION_KIND_WORDS = [...ACTIONS, ...DESCRIBING, ...SOCIAL];
