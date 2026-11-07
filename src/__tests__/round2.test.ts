import { createDefaultProfile } from '../data/defaults';
import { canSpan, coveredSlots, moveCell } from '../lib/boardOps';
import { joinTokens, renderStrip } from '../lib/grammar';
import { parseSentence } from '../lib/parseSentence';
import { prepareIndex, searchPictos } from '../lib/pictoSearch';
import type { Board, DemoStep, Lang, StripItem } from '../model/types';

const profile = createDefaultProfile();
const words = (steps: DemoStep[]) => steps.map((s) => (s.kind === 'word' ? s.concept : s.kind === 'text' ? `"${s.text}"` : s.kind));

describe('word spoken on tap (item 1)', () => {
  // The app speaks the last token of the strip after adding the word.
  const lastSpoken = (lang: Lang, ...concepts: string[]) => {
    const items: StripItem[] = concepts.map((concept, i) => ({ key: `k${i}`, kind: 'concept', concept, lang }));
    const tokens = renderStrip(items, profile);
    return tokens[tokens.length - 1].text;
  };
  it('says the conjugated form after every pronoun', () => {
    expect(lastSpoken('fr', 'i', 'want')).toBe('veux');
    expect(lastSpoken('fr', 'you', 'want')).toBe('veux');
    expect(lastSpoken('fr', 'he', 'want')).toBe('veut');
    expect(lastSpoken('fr', 'she', 'eat')).toBe('mange');
    expect(lastSpoken('fr', 'we', 'go')).toBe('allons');
    expect(lastSpoken('fr', 'you_pl', 'do')).toBe('faites');
    expect(lastSpoken('fr', 'they', 'be')).toBe('sont');
    expect(lastSpoken('en', 'she', 'want')).toBe('wants');
  });
  it('keeps the infinitive after another verb', () => {
    expect(lastSpoken('fr', 'i', 'want', 'eat')).toBe('manger');
  });
});

describe('dictation parser (item 6)', () => {
  it('maps a spoken sentence to board words', () => {
    expect(words(parseSentence(profile, 'Je veux manger', 'fr'))).toEqual(['i', 'want', 'eat']);
  });
  it('handles elision and negation', () => {
    expect(words(parseSentence(profile, "je n'aime pas jouer", 'fr'))).toEqual(['i', 'like', 'not', 'play']);
  });
  it('recognises multi-word labels and plurals, keeps unknown words as text', () => {
    expect(words(parseSentence(profile, 'je veux des pommes', 'fr'))).toEqual(['i', 'want', '"des"', 'apple']);
    expect(words(parseSentence(profile, "s'il te plaît", 'fr'))).toEqual(['please']);
  });
  it('works in English and Arabic', () => {
    expect(words(parseSentence(profile, 'she wants water', 'en'))).toEqual(['she', 'want', 'water']);
    expect(words(parseSentence(profile, 'أنا بدّي مي', 'ar'))).toEqual(['i', 'want', 'water']);
  });
});

describe('board operations (items 4 and 9)', () => {
  const board = (): Board => ({
    id: 'b',
    kind: 'tla',
    concept: 't_meal',
    rows: 2,
    cols: 3,
    cells: [{ concept: 'i' }, null, { concept: 'want' }, null, null, { concept: 'eat' }],
  });

  it('spreads a card only over empty slots inside the board', () => {
    const b = board();
    expect(canSpan(b, 0, [2, 1])).toBe(true);
    expect(canSpan(b, 0, [3, 1])).toBe(false); // "want" is in the way
    expect(canSpan(b, 0, [2, 2])).toBe(true);
    expect(canSpan(b, 2, [2, 1])).toBe(false); // outside the board
    b.cells[0]!.span = [2, 2];
    expect([...coveredSlots(b).keys()].sort()).toEqual([1, 3, 4]);
  });

  it('moves to an empty slot or swaps two words', () => {
    const b = board();
    moveCell(b, 0, 1);
    expect(b.cells.map((c) => c?.concept ?? null)).toEqual([null, 'i', 'want', null, null, 'eat']);
    moveCell(b, 1, 5);
    expect(b.cells.map((c) => c?.concept ?? null)).toEqual([null, 'eat', 'want', null, null, 'i']);
  });

  it('shrinks a spread card back to one slot if it no longer fits', () => {
    const b = board();
    b.cells[0]!.span = [2, 1];
    moveCell(b, 0, 4); // slot 5 (to its right) holds "eat"
    expect(b.cells[4]?.span).toBeUndefined();
  });
});

describe('offline pictogram search (item 2)', () => {
  const index = prepareIndex({
    size: 160,
    packs: ['p00.pack'],
    items: [
      [1, 0, 0, 10, ['voiture', 'auto'], ['car'], ['سيارة']],
      [2, 0, 10, 10, ['voiture de police'], ['police car'], []],
      [3, 0, 20, 10, ['pomme'], ['apple'], ['تفاحة']],
      [4, 0, 30, 10, ['bulle', 'bulle de savon'], ['bubble'], []],
      [5, 0, 40, 10, ['savon'], ['soap'], []],
      [6, 0, 50, 10, ['jeux de société'], ['board games'], []],
    ],
  });
  it('ranks exact keywords first, then longer phrases', () => {
    expect(searchPictos(index, 'voiture', 'fr')).toEqual([1, 2]);
    expect(searchPictos(index, 'car', 'en')[0]).toBe(1);
    expect(searchPictos(index, 'تفاحة', 'ar')).toEqual([3]);
    expect(searchPictos(index, 'Pommé', 'fr')).toEqual([3]);
  });
  it('matches plurals and phrases written differently', () => {
    expect(searchPictos(index, 'bulles de savon', 'fr')[0]).toBe(4);
    expect(searchPictos(index, 'bulles', 'fr')[0]).toBe(4);
    expect(searchPictos(index, 'jeu de societe', 'fr')[0]).toBe(6);
    expect(searchPictos(index, 'bulle de savo', 'fr')[0]).toBe(4); // still typing
  });
});

describe('pictogram packs', () => {
  it('decodes base64 packs byte for byte', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { base64ToBytes } = require('../lib/pictoLibrary');
    const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) % 256);
    for (const n of [300, 299, 298]) {
      const slice = bytes.subarray(0, n);
      const b64 = btoa(String.fromCharCode(...slice));
      expect(Array.from(base64ToBytes(b64))).toEqual(Array.from(slice));
    }
  });
});
