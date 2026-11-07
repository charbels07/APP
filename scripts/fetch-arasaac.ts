/**
 * Downloads ARASAAC pictograms for the built-in concepts and generates
 * src/data/arasaacMap.ts.
 *
 *   node --experimental-strip-types scripts/fetch-arasaac.ts
 *
 * Picks are cached in scripts/arasaac-picks.json; pin a specific pictogram for a
 * concept in scripts/arasaac-pins.json ({"conceptId": pictogramId}) and re-run.
 *
 * ARASAAC pictograms: author Sergio Palao, origin ARASAAC (https://arasaac.org),
 * licence CC BY-NC-SA, owned by the Government of Aragón (Spain).
 * Non-commercial use only until a commercial licence is obtained.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_CONCEPTS } from '../src/data/concepts.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const picksPath = join(root, 'scripts/arasaac-picks.json');
const pinsPath = join(root, 'scripts/arasaac-pins.json');
const imgDir = join(root, 'assets/arasaac');
const outPath = join(root, 'src/data/arasaacMap.ts');

/** Better search terms for labels that are phrases or ambiguous. */
const HINTS: Record<string, string[]> = {
  i: ['je', 'moi'],
  you: ['tu', 'toi'],
  you_pl: ['vous'],
  they: ['ils'],
  want: ['vouloir'],
  be: ['être'],
  stop_v: ['arrêter'],
  not: ['non', 'pas'],
  more: ['encore', 'plus'],
  for: ['pour'],
  there: ['là-bas', 'là'],
  same: ['égal', 'pareil'],
  a_lot: ['beaucoup'],
  a_little: ['peu', 'un peu'],
  loud: ['bruit', 'fort'],
  wait_s: ['attendre'],
  done: ['terminer', 'fini'],
  please: ["s'il vous plaît", 'por favor'],
  grandma: ['grand-mère'],
  grandpa: ['grand-père'],
  teacher: ['enseignante', 'professeur'],
  doctor: ['médecin'],
  therapist: ['orthophoniste', 'logopède'],
  manakish: ['pizza'],
  labneh: ['fromage frais', 'yaourt'],
  hummus: ['purée', 'pois chiche'],
  hot_chocolate: ['chocolat chaud', 'cacao'],
  bored: ["s'ennuyer", 'ennui'],
  hungry: ['faim', 'avoir faim'],
  thirsty: ['soif', 'avoir soif'],
  scared: ['peur', 'effrayé'],
  angry: ['fâché', 'en colère'],
  tummy: ['ventre'],
  tv: ['télévision'],
  bike: ['vélo', 'bicyclette'],
  walk: ['promenade', 'se promener'],
  chair: ['fauteuil dentaire', 'fauteuil'],
  recess: ['récréation', 'cour de récréation'],
  reward: ['récompense', 'prix'],
  waiting_room: ["salle d'attente"],
  yummy: ['délicieux', 'savoureux'],
  gently: ['doucement', 'lentement'],
  dont_understand: ['ne pas comprendre', 'comprendre'],
  repeat: ['répéter'],
  not_that: ['erreur', 'non'],
  i_meant: ['penser', 'vouloir dire'],
  dont_know: ['je ne sais pas', 'ne pas savoir'],
  maybe: ['peut-être'],
  joking: ['plaisanter', 'blague'],
  me_too: ['moi aussi', 'aussi'],
  and_you: ['et toi', 'toi'],
  leave_me: ['laisse-moi tranquille', 'seul'],
  need_break: ['pause', 'se reposer'],
  agree: ["d'accord"],
  disagree: ['pas d’accord', 'désaccord'],
  funny: ['rire', 'drôle'],
  look_at: ['regarder'],
  my_turn: ['mon tour', 'tour'],
  your_turn: ['ton tour', 'tour'],
  i_like_it: ['aimer', "j'aime"],
  dont_like: ['ne pas aimer', "je n'aime pas"],
  help_me: ['aider', 'aide'],
  it_hurts: ['douleur', 'avoir mal'],
  im_scared: ['peur'],
  want_leave: ['partir', 'sortir'],
  is_it_done: ['terminer', 'fini'],
  how_long: ['combien de temps', 'temps'],
  f_people: ['famille', 'personnes'],
  f_food: ['nourriture', 'aliments'],
  f_drinks: ['boissons', 'boisson'],
  f_places: ['lieux', 'endroit'],
  f_feelings: ['émotions', 'sentiments'],
  f_body: ['corps'],
  f_activities: ['activités', 'loisirs'],
  f_chat: ['parler', 'conversation'],
  f_time: ['temps', 'horloge'],
  f_mine: ['étoile', 'favori'],
  b_core: ['communication', 'tableau de communication'],
  t_meal: ['repas', 'déjeuner'],
  t_park: ['parc', 'aire de jeux'],
  t_dentist: ['dentiste'],
  t_school: ['école'],
  s_morning: ['matin', 'routine'],
  first: ["d'abord", 'premier'],
  then: ['ensuite', 'après'],
  later: ['plus tard'],
  up: ['en haut', 'haut'],
  down: ['en bas', 'bas'],
  in: ['dans', 'dedans'],
  on: ['sur', 'dessus'],
  eyes: ['yeux', 'œil'],
  brush_teeth: ['se brosser les dents', 'brosser les dents'],
  get_dressed: ["s'habiller"],
  wake_up: ['se réveiller'],
};

type Result = { _id: number; keywords?: { keyword: string }[]; aac?: boolean; violence?: boolean; sex?: boolean };

const norm = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, "'").trim();

async function search(term: string): Promise<Result[]> {
  const url = `https://api.arasaac.org/v1/pictograms/fr/search/${encodeURIComponent(term)}`;
  const res = await fetch(url);
  if (!res.ok) return [];
  return (await res.json()) as Result[];
}

function pick(results: Result[], term: string): number | undefined {
  const t = norm(term);
  const safe = results.filter((r) => !r.violence && !r.sex);
  const scored = safe.map((r, index) => {
    const kws = (r.keywords ?? []).map((k) => norm(k.keyword));
    let score = 0;
    if (kws[0] === t) score += 4;
    else if (kws.includes(t)) score += 3;
    if (r.aac) score += 1;
    return { id: r._id, score, index };
  });
  scored.sort((a, b) => b.score - a.score || a.index - b.index);
  return scored[0]?.id;
}

async function main() {
  const picks: Record<string, number> = existsSync(picksPath) ? JSON.parse(readFileSync(picksPath, 'utf8')) : {};
  const pins: Record<string, number> = existsSync(pinsPath) ? JSON.parse(readFileSync(pinsPath, 'utf8')) : {};
  mkdirSync(imgDir, { recursive: true });

  const missing: string[] = [];
  for (const c of Object.values(BUILTIN_CONCEPTS)) {
    if (pins[c.id]) {
      picks[c.id] = pins[c.id];
      continue;
    }
    if (picks[c.id]) continue;
    const terms = [...(HINTS[c.id] ?? []), c.labels.fr];
    let id: number | undefined;
    for (const term of terms) {
      id = pick(await search(term), term);
      if (id) break;
    }
    if (id) picks[c.id] = id;
    else missing.push(c.id);
  }

  for (const id of new Set(Object.values(picks))) {
    const file = join(imgDir, `${id}.png`);
    if (existsSync(file)) continue;
    const res = await fetch(`https://static.arasaac.org/pictograms/${id}/${id}_300.png`);
    if (!res.ok) throw new Error(`download ${id}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }

  writeFileSync(picksPath, JSON.stringify(picks, null, 2) + '\n');
  const ids = [...new Set(Object.values(picks))].sort((a, b) => a - b);
  const lines = [
    '// GENERATED by scripts/fetch-arasaac.ts — do not edit by hand.',
    '// Pictograms: Sergio Palao. Origin: ARASAAC (https://arasaac.org). Licence: CC BY-NC-SA.',
    '// Property of the Government of Aragón (Spain).',
    '',
    '/** Default ARASAAC pictogram for each built-in concept. */',
    'export const ARASAAC_DEFAULTS: Record<string, number> = {',
    ...Object.entries(picks)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `  ${JSON.stringify(k)}: ${v},`),
    '};',
    '',
    '/** Bundled pictogram images (works offline). */',
    'export const ARASAAC_IMAGES: Record<number, number> = {',
    ...ids.map((id) => `  ${id}: require('../../assets/arasaac/${id}.png'),`),
    '};',
    '',
  ];
  writeFileSync(outPath, lines.join('\n'));
  console.log(`concepts with pictogram: ${Object.keys(picks).length}, images: ${ids.length}`);
  if (missing.length) console.log('no pictogram found (emoji fallback):', missing.join(', '));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
