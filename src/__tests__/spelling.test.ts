import { readFileSync } from 'fs';
import { join } from 'path';
import { fuzzyPictos, guessSpelling, prepareIndex, searchPictos, type PictoIndex } from '../lib/pictoSearch';
import { levenshtein, soundKey, wordForms } from '../lib/spelling';

const raw: PictoIndex = JSON.parse(readFileSync(join(__dirname, '../../assets/picto/index.pidx'), 'utf8'));
const index = prepareIndex(raw);
const keyOf = (id: number | undefined) => (id === undefined ? undefined : index.byId.get(id)?.[10]);
const frOf = (id: number | undefined) => (id === undefined ? [] : index.byId.get(id)?.[4] ?? []);

describe('spelling mistakes', () => {
  it('gives the same sound to two spellings of a word', () => {
    expect(soundKey('trotinette')).toBe(soundKey('trottinette'));
    expect(soundKey('elefan')).toBe(soundKey('éléphant'));
    expect(soundKey('chocola')).toBe(soundKey('chocolat'));
    expect(soundKey('verte')).toBe(soundKey('vert'));
    expect(soundKey('ماء')).toBe('ما' + 'ء');
  });

  it('counts the letters that differ, and stops early', () => {
    expect(levenshtein('souris', 'souri')).toBe(1);
    expect(levenshtein('piscine', 'pisicne')).toBe(2);
    expect(levenshtein('chat', 'elephant')).toBe(3);
  });

  it('finds the dictionary form of a word of a sentence', () => {
    expect(wordForms('verte')).toContain('vert');
    expect(wordForms('courait')).toContain('courir');
    expect(wordForms('mange')).toContain('manger');
    expect(wordForms('heureuse')).toContain('heureux');
    expect(wordForms('playing')).toContain('play');
    expect(wordForms('souris')[0]).toBe('souris');
  });

  it('finds a picture for a word typed with a mistake', () => {
    for (const [typed, right] of [
      ['trotinette', 'trottinette'],
      ['elefan', 'éléphant'],
      ['chocola', 'chocolat'],
      ['pisine', 'piscine'],
    ]) {
      const ids = searchPictos(index, typed, 'fr', 6);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.some((id) => frOf(id).some((k) => k.toLowerCase().includes(right)))).toBe(true);
    }
  });

  it('keeps the exact spelling first', () => {
    expect(keyOf(searchPictos(index, 'souris', 'fr', 1)[0])).toBe('mulberry/mouse');
    // A word spelt right is never replaced by a word that only sounds like it.
    expect(fuzzyPictos(index, 'zz', 'fr')).toEqual([]);
  });

  it('suggests the spelling of the library', () => {
    expect(guessSpelling(index, 'trotinette', 'fr')).toBe('trottinette');
    expect(guessSpelling(index, 'elefan', 'fr')).toBe('éléphant');
    expect(guessSpelling(index, 'souris', 'fr')).toBeUndefined();
    expect(guessSpelling(index, 'une souri verte', 'fr')).toBeUndefined();
    // A conjugated verb or a word after an apostrophe is spelt right.
    expect(guessSpelling(index, "Une souris verte qui courait dans l'herbe", 'fr')).toBeUndefined();
    expect(guessSpelling(index, "dans l'herbbe", 'fr')).toBe("dans l'herbe");
  });
});

describe('a sentence as the topic of a new board', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { contentWords, planAutomatically, planFromLibrary, pictoForWord } = require('../lib/tlaPlanner') as typeof import('../lib/tlaPlanner');

  it('keeps the words that can have a picture', () => {
    expect(contentWords('Une souris verte')).toEqual(['souris', 'verte']);
    expect(contentWords("Une souris verte qui courait dans l'herbe")).toEqual(['souris', 'verte', 'courait', 'herbe']);
    expect(contentWords('The big red bus')).toEqual(['big', 'red', 'bus']);
  });

  it('finds the picture of each word, from its dictionary form', () => {
    expect(keyOf(pictoForWord(index, 'verte', 'fr'))).toBe('mulberry/green');
    expect(keyOf(pictoForWord(index, 'courait', 'fr'))).toBe('mulberry/run_,_to');
    expect(keyOf(pictoForWord(index, 'souri', 'fr'))).toBe('mulberry/mouse');
  });

  it('puts each word of the sentence first, then pictures related to them', () => {
    const plan = planAutomatically(index, 'Une souris verte', 'fr');
    const keys = plan.words.map((w) => keyOf(w.id));
    expect(keys.slice(0, 2)).toEqual(['mulberry/mouse', 'mulberry/green']);
    expect(keys.length).toBeGreaterThan(6);
    expect(plan.sentence).toBe(true);
    // Nothing unrelated to a mouse or a colour (the old suggestion offered bread and pizza).
    expect(keys).not.toContain('mulberry/bread');
  });

  it('a sentence is not taken for a situation that only sounds like one of its words', () => {
    // "courait" sounds like "courses" (shopping): no situation, its words instead.
    expect(planFromLibrary(index, "Une souri verte qui courait dans l'herbe", 'fr')).toBeUndefined();
    const keys = planAutomatically(index, "Une souri verte qui courait dans l'herbe", 'fr').words.map((w) => keyOf(w.id));
    expect(keys.slice(0, 4)).toEqual(['mulberry/mouse', 'mulberry/green', 'mulberry/run_,_to', 'mulberry/grass']);
  });

  it('never leaves a board empty for a single word', () => {
    expect(planAutomatically(index, 'trotinette', 'fr').words.length).toBeGreaterThan(0);
  });

  it('recognises a situation typed with a mistake, and adds the other words of the sentence', () => {
    const plan = planFromLibrary(index, 'on va à la pisine avec mon chien', 'fr');
    expect(plan?.situation).toBe('piscine');
    expect(plan?.words.map((w) => keyOf(w.id))).toContain('mulberry/dog');
  });
});
