/**
 * Turns a dictated (or typed) sentence into board words (spec §29 "je modèle"):
 * "je veux manger" → [je, vouloir, manger]. Words that are not on the boards
 * are kept as plain text so the sentence stays complete.
 */
import type { DemoStep, Lang, Profile } from '../model/types';
import { inflectedForms } from './grammar';
import { allConceptIds, getConcept, label } from './lexicon';
import { locate, normalize } from './search';

/** Splits French elisions so "j'aime" and "je n'aime pas" tokenise the same way. */
export function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/\b(qu|[jlmntsdc])'/g, "$1' ")
    .replace(/-/g, ' ')
    .split(' ')
    .filter(Boolean);
}

/** Lower is better: words on the main board win over folders, TLAs and inflected forms. */
function priority(profile: Profile, where: ReturnType<typeof locate>, id: string): number {
  const locs = where.get(id) ?? [];
  if (locs.some((l) => l.board === 'core' && l.visible)) return 0;
  if (locs.some((l) => l.path[0] === 'core')) return 1;
  if (locs.length) return 2;
  return getConcept(profile, id)?.cls === 'folder' ? 9 : 3;
}

export function buildDictionary(profile: Profile, lang: Lang): Map<string, { id: string; p: number }> {
  const where = locate(profile);
  const best = new Map<string, { id: string; p: number }>();
  const add = (phrase: string, id: string, p: number) => {
    const key = tokenize(phrase).join(' ');
    if (!key) return;
    const cur = best.get(key);
    if (!cur || p < cur.p) best.set(key, { id, p });
  };
  for (const id of allConceptIds(profile)) {
    const c = getConcept(profile, id);
    if (!c || c.cls === 'folder') continue;
    const p = priority(profile, where, id);
    add(label(profile, id, lang), id, p);
    add(c.labels[lang], id, p);
    const f = c.labelsF?.[lang];
    if (f) add(f, id, p);
  }
  // A conjugated form ranks just after a label of the same priority ("aime" → aimer, on the core board).
  for (const [form, id] of inflectedForms(lang)) add(form, id, priority(profile, where, id) + 0.5);
  if (lang === 'fr') add("j'", 'i', 0);
  return best;
}

export function parseSentence(profile: Profile, text: string, lang: Lang): DemoStep[] {
  const dict = buildDictionary(profile, lang);
  const tokens = tokenize(text);
  const steps: DemoStep[] = [];
  let pendingText: string[] = [];
  const flush = () => {
    if (pendingText.length) steps.push({ kind: 'text', text: pendingText.join(' ').replace(/' /g, "'") });
    pendingText = [];
  };
  let i = 0;
  while (i < tokens.length) {
    // French negation particle: the strip grammar adds it back automatically.
    if (lang === 'fr' && (tokens[i] === 'ne' || tokens[i] === "n'")) {
      i++;
      continue;
    }
    let matched = false;
    for (let n = Math.min(5, tokens.length - i); n >= 1; n--) {
      const phrase = tokens.slice(i, i + n).join(' ');
      let hit = dict.get(phrase);
      if (!hit && n === 1 && /[sx]$/.test(phrase) && phrase.length > 3) hit = dict.get(phrase.slice(0, -1));
      // Model with core words when they cover the whole phrase ("je n'aime pas" → je + aimer + pas).
      if (hit && n > 1 && hit.p > 0) {
        const parts = tokens.slice(i, i + n).filter((t) => !(lang === 'fr' && (t === 'ne' || t === "n'")));
        if (parts.every((t) => (dict.get(t)?.p ?? 9) < 1)) hit = undefined;
      }
      const id = hit?.id;
      if (id) {
        flush();
        steps.push({ kind: 'word', concept: id });
        i += n;
        matched = true;
        break;
      }
    }
    if (!matched) pendingText.push(tokens[i++]);
  }
  flush();
  return steps;
}
