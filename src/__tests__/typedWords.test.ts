import { readFileSync } from 'fs';
import { join } from 'path';
import { createDefaultProfile } from '../data/defaults';
import { renderStrip, toSegments } from '../lib/grammar';
import { label } from '../lib/lexicon';
import { prepareIndex } from '../lib/pictoSearch';
import { typedChips } from '../lib/typedWords';
import type { Lang, StripItem } from '../model/types';

const profile = createDefaultProfile();
const index = prepareIndex(JSON.parse(readFileSync(join(__dirname, '../../assets/picto/index.pidx'), 'utf8')));
/** "typed word → French name of the board word, or the library pictogram, or -" */
const read = (text: string, lang: Lang = 'fr', withLibrary = true) =>
  typedChips(profile, text, lang, withLibrary ? index : null).map((c) => `${c.text}→${c.word ? label(profile, c.word, 'fr') : (c.picto ?? '-')}`);

describe('keyboard: typed words become picture cards', () => {
  it('gives each word the picture of the matching board word, and keeps what was typed', () => {
    expect(read('je veux une pomme')).toEqual(['je→je', 'veux→vouloir', 'une→-', 'pomme→pomme']);
    expect(read('les pommes')).toEqual(['les→-', 'pommes→pomme']);
    expect(read('pomme!')).toEqual(['pomme!→pomme']);
  });

  it('keeps a word made of several words on one card', () => {
    expect(read('brosse à dents')).toEqual(['brosse à dents→brosse à dents']);
  });

  it("handles apostrophes: the picture is the one of the word after it", () => {
    expect(read("j'aime l'école")).toEqual(["j'aime→aimer", "l'école→école"]);
  });

  it('accepts missing accents, but never confuses little words', () => {
    expect(read('ecole')).toEqual(['ecole→école']);
    expect(read('où')).toEqual(['où→où']);
    expect(read('ou')).toEqual(['ou→-']);
    expect(read('il a faim')[1]).toBe('a→avoir');
    expect(read('à')).toEqual(['à→-']);
  });

  it('looks in the offline library for words that are not on the boards', () => {
    const [une, girafe] = typedChips(profile, 'une girafe', 'fr', index);
    expect(une).toEqual({ text: 'une' });
    expect(girafe.word).toBeUndefined();
    expect(index.byKey.has(girafe.picto!)).toBe(true);
    // Without the library (not loaded yet), the word is still added, without a picture.
    expect(read('une girafe', 'fr', false)).toEqual(['une→-', 'girafe→-']);
    // Accents typed on purpose are respected: « maïs » is corn, « mais » is the board word.
    expect(read('maïs mais')[0]).not.toBe('maïs→mais');
    expect(read('maïs mais')[1]).toBe('mais→mais');
  });

  it('never illustrates a word with a pictogram kept away from children', () => {
    expect(read('bière')).toEqual(['bière→-']);
  });

  it('works in English and in Arabic', () => {
    expect(read('I want a giraffe', 'en').slice(0, 3)).toEqual(['I→je', 'want→vouloir', 'a→-']);
    expect(typedChips(profile, 'I want a giraffe', 'en', index)[3].picto).toMatch(/giraffe|1F992/);
    expect(read(label(profile, 'apple', 'ar'), 'ar')).toEqual([`${label(profile, 'apple', 'ar')}→pomme`]);
    // Standard Arabic that is not the Lebanese word of the board is found in the library.
    expect(typedChips(profile, 'يأكل', 'ar', index)[0].picto).toBe('mulberry/eat_,_to');
  });

  it('is said exactly as typed, in one go', () => {
    const items: StripItem[] = typedChips(profile, 'je veux une girafe', 'fr', index).map((c, i) => ({ key: `k${i}`, kind: 'text', text: c.text, lang: 'fr', word: c.word, picto: c.picto }));
    const tokens = renderStrip(items, profile);
    expect(tokens.map((t) => !!t.picture)).toEqual([true, true, false, true]);
    expect(tokens[1].picture?.word).toBe('want');
    expect(toSegments(tokens)).toEqual([{ kind: 'tts', text: 'je veux une girafe', lang: 'fr' }]);
  });
});
