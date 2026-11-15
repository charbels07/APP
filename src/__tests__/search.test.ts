import { createDefaultProfile } from '../data/defaults';
import { isFolderName } from '../lib/lexicon';
import { normalize, search, searchWords } from '../lib/search';

const profile = createDefaultProfile();
const top = (q: string) => search(profile, q)[0]?.concept;

describe('universal search (spec §11)', () => {
  it('finds a word and where it lives', () => {
    const r = search(profile, 'pomme')[0];
    expect(r.concept).toBe('apple');
    expect(r.locations[0].path).toEqual(['core', 'food']);
  });

  it('tolerates spelling mistakes', () => {
    expect(top('pome')).toBe('apple');
    expect(top('chocolt')).toBe('chocolate');
  });

  it('works across languages and scripts', () => {
    expect(top('apple')).toBe('apple');
    expect(top('تفاحة')).toBe('apple'); // without shadda
    expect(top('mamie')).toBe('grandma');
  });

  it('answers "how do I say…" questions through tags', () => {
    const results = search(profile, "comment dire qu'il y a trop de bruit").map((r) => r.concept);
    expect(results).toEqual(expect.arrayContaining(['loud', 'need_break', 'stop']));
  });

  it('a folder is found to see where it is, but its name is never offered as a word', () => {
    const folders = Object.values(profile.boards.core.cells)
      .filter((c) => c?.folder)
      .map((c) => c!.concept);
    expect(folders.length).toBeGreaterThan(3);
    for (const id of folders) {
      expect(isFolderName(profile, id)).toBe(true);
      const name = profile.customConcepts[id]?.labels.fr ?? require('../data/concepts').BUILTIN_CONCEPTS[id].labels.fr;
      // The home search still finds the folder (to show where it is)…
      expect(search(profile, name).map((r) => r.concept)).toContain(id);
      // …but where a word is chosen (a card, a step of a sequence, a material) it is not there.
      expect(searchWords(profile, name).map((r) => r.concept)).not.toContain(id);
    }
    // Ordinary words are untouched.
    expect(isFolderName(profile, 'apple')).toBe(false);
    expect(searchWords(profile, 'pomme')[0].concept).toBe('apple');
    expect(searchWords(profile, 'pomme', 3).length).toBeLessThanOrEqual(3);
  });

  it('normalises Arabic and Latin text', () => {
    expect(normalize('Évité !')).toBe('evite');
    expect(normalize('أنا')).toBe('انا');
  });
});
