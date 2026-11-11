import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { SITUATIONS } from '../data/situations';
import { exactPicto, prepareIndex } from '../lib/pictoSearch';
import { normalize } from '../lib/search';
import { matchSituation, planFromAi, planFromLibrary, resolveSituationWord } from '../lib/tlaPlanner';

const indexFile = join(__dirname, '../../assets/picto/index.pidx');

describe('situation library (TLA suggestions)', () => {
  it('recognises the situation from what the family types', () => {
    expect(matchSituation('préparer un gâteau')?.id).toBe('gateau');
    expect(matchSituation('On fait des gâteaux avec mamie')?.id).toBe('gateau');
    expect(matchSituation("préparer un gâteau d'anniversaire")?.id).toBe('gateau');
    expect(matchSituation("fête d'anniversaire")?.id).toBe('anniversaire');
    expect(matchSituation('se laver les mains')?.id).toBe('mains');
    expect(matchSituation('aller à la mer')?.id).toBe('plage');
    expect(matchSituation('dire merci')).toBeUndefined(); // "mer" is not "merci"
    expect(matchSituation('xyz')).toBeUndefined();
  });

  (existsSync(indexFile) ? it : it.skip)('nearly every word and step has its pictogram, and every pinned pictogram exists', () => {
    const idx = prepareIndex(JSON.parse(readFileSync(indexFile, 'utf8')));
    const missing: string[] = [];
    const badPins: string[] = [];
    let total = 0;
    for (const s of SITUATIONS)
      for (const entry of [...s.words, ...(s.steps ?? [])]) {
        const w = typeof entry === 'string' ? entry : entry.w;
        total++;
        if (w.includes('#')) {
          // Pinned pictogram (library/name): it must exist in the library.
          if (!idx.byKey.has(w.slice(w.indexOf('#') + 1))) badPins.push(`${s.id}: ${w}`);
          continue;
        }
        const id = exactPicto(idx, w);
        const kws = id === undefined ? [] : idx.byId.get(id)![4].map(normalize);
        if (!kws.includes(normalize(w))) missing.push(`${s.id}: ${w}`);
      }
    expect(badPins).toEqual([]);
    // The open libraries have no drawing for a few words (« trapéziste », « emporte-pièces »…):
    // those are simply left out of the suggestion.
    expect(missing.length / total).toBeLessThan(0.08);
  });
});

(existsSync(indexFile) ? describe : describe.skip)('TLA plans on the real library', () => {
  const idx = existsSync(indexFile) ? prepareIndex(JSON.parse(readFileSync(indexFile, 'utf8'))) : (null as never);
  const fr = (id: number) => idx.byId.get(id)![4][0];

  it('« préparer un gâteau » gives ingredients, utensils and the steps — not the birthday', () => {
    const plan = planFromLibrary(idx, 'préparer un gâteau', 'fr')!;
    const words = plan.words.map((w) => w.labels?.fr ?? fr(w.id));
    expect(words).toEqual(expect.arrayContaining(['farine', 'sucre', 'fouet', 'four']));
    expect(words.some((w) => /anniversaire/.test(w))).toBe(false);
    const oven = plan.steps.find((s) => s.labels?.fr === 'four');
    expect(oven?.timerMin).toBe(30);
    expect(plan.steps.length).toBeGreaterThanOrEqual(8);
  });

  it('pins the right meaning for homonyms (moule = cake tin, not the mussel)', () => {
    const plan = planFromLibrary(idx, 'préparer un gâteau', 'fr')!;
    const mould = plan.words.find((w) => w.labels?.fr === 'moule')!;
    expect(idx.byId.get(mould.id)![10]).toBe('mulberry/cake_tin');
    expect(resolveSituationWord(idx, 'casser#mulberry/break_egg_,_to')).toEqual({ label: 'casser', id: idx.byKey.get('mulberry/break_egg_,_to') });
    // A pin from an older version (a number) is ignored: the word is looked up by name.
    expect(resolveSituationWord(idx, 'four#8984').id).toBe(exactPicto(idx, 'four'));
    // Accents decide: « où » is "where", not « ou » ("or").
    expect(idx.byId.get(exactPicto(idx, 'où')!)![5]).toContain('where');
  });

  it('maps an AI proposal to pictograms and keeps its Lebanese labels', () => {
    const plan = planFromAi(idx, 'faire du pain', 'fr', {
      words: [
        { fr: 'farine', en: 'flour', ar: 'طحين', type: 'nom' },
        { fr: 'mélanger', en: 'stir', ar: 'خلّط', type: 'verbe' },
        { fr: 'zzzz', en: 'zzzz' },
      ],
      steps: [{ fr: 'se laver les mains', en: 'wash hands', ar: 'إغسل إيديك' }],
    });
    expect(plan.words.map((w) => w.labels?.ar)).toEqual(['طحين', 'خلّط']);
    expect(plan.words[1].cls).toBe('verb');
    expect(plan.steps).toHaveLength(1);
  });
});
