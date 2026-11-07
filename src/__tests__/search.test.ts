import { createDefaultProfile } from '../data/defaults';
import { normalize, search } from '../lib/search';

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

  it('normalises Arabic and Latin text', () => {
    expect(normalize('Évité !')).toBe('evite');
    expect(normalize('أنا')).toBe('انا');
  });
});
