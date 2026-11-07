import { createDefaultProfile } from '../data/defaults';
import { joinTokens, renderStrip, toSegments } from '../lib/grammar';
import type { Lang, StripItem } from '../model/types';

const profile = createDefaultProfile();
let n = 0;
const strip = (lang: Lang, ...concepts: string[]): StripItem[] =>
  concepts.map((concept) => ({ key: `k${n++}`, kind: 'concept', concept, lang }));
const say = (items: StripItem[]) => joinTokens(renderStrip(items, profile));

describe('French agreement', () => {
  it('conjugates a verb after a subject pronoun', () => {
    expect(say(strip('fr', 'i', 'want', 'eat'))).toBe('je veux manger');
    expect(say(strip('fr', 'he', 'want', 'drink', 'water'))).toBe('il veut boire eau');
    expect(say(strip('fr', 'we', 'go', 'park'))).toBe('nous allons parc');
  });

  it('elides "je" before a vowel', () => {
    expect(say(strip('fr', 'i', 'like', 'chocolate'))).toBe("j'aime chocolat");
    expect(say(strip('fr', 'i', 'have', 'a_lot'))).toBe("j'ai beaucoup");
  });

  it('adds "ne / n\'" for negation', () => {
    expect(say(strip('fr', 'i', 'want', 'not'))).toBe('je ne veux pas');
    expect(say(strip('fr', 'i', 'like', 'not', 'play'))).toBe("je n'aime pas jouer");
  });

  it('handles reflexive verbs', () => {
    expect(say(strip('fr', 'i', 'get_dressed'))).toBe("je m'habille");
  });

  it('leaves words untouched when grammar is turned off', () => {
    const p = createDefaultProfile();
    p.settings.grammar = false;
    expect(joinTokens(renderStrip(strip('fr', 'i', 'want'), p))).toBe('je vouloir');
  });
});

describe('English agreement', () => {
  it('uses third person -s and forms of "be"', () => {
    expect(say(strip('en', 'she', 'want', 'more'))).toBe('she wants more');
    expect(say(strip('en', 'i', 'be', 'happy'))).toBe('I am happy');
    expect(say(strip('en', 'they', 'be', 'tired'))).toBe('they are tired');
  });
});

describe('code-switching (spec §26)', () => {
  it('keeps each word in the language it was added in, one speech segment per language', () => {
    const items = [...strip('fr', 'i', 'want'), ...strip('ar', 'water')];
    const segments = toSegments(renderStrip(items, profile));
    expect(segments).toEqual([
      { kind: 'tts', text: 'je veux', lang: 'fr' },
      { kind: 'tts', text: 'مي', lang: 'ar' },
    ]);
  });

  it('plays a recorded word as audio', () => {
    const p = createDefaultProfile();
    p.overrides.grandma = { audio: { ar: 'teta.m4a' } };
    const segments = toSegments(renderStrip(strip('ar', 'i', 'want', 'grandma'), p));
    expect(segments[segments.length - 1]).toEqual({ kind: 'audio', media: 'teta.m4a' });
  });
});
