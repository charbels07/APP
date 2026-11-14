import { readFileSync } from 'fs';
import { join } from 'path';
import { ARABIC_PROMPT, tlaPrompt } from '../../supabase/functions/_shared/aiPrompts';
import { months, weekdays } from '../data/calendar';
import { BUILTIN_CONCEPTS } from '../data/concepts';
import { createDefaultProfile } from '../data/defaults';
import { conceptsFor, DIALECT_ORDER, DIALECT_WORDS, DIALECTS, dialectName } from '../data/dialects';
import { availableLangs, label, langName } from '../lib/lexicon';
import { applyAnswers, emptyAnswers } from '../lib/onboarding';
import { prepareIndex, searchPictos } from '../lib/pictoSearch';
import { search } from '../lib/search';
import { migrate } from '../lib/storage';
import { typedChips } from '../lib/typedWords';
import { chooseVoice } from '../lib/voices';
import type { ArabicDialect, Profile } from '../model/types';

const withArabic = (arabic: ArabicDialect, gender: 'm' | 'f' = 'm'): Profile => {
  const p = createDefaultProfile();
  p.settings.arabic = arabic;
  p.settings.gender = gender;
  return p;
};

describe('Arabic dialects', () => {
  it('offers the dialects of the region, Standard Arabic, and "none"', () => {
    expect(DIALECT_ORDER).toEqual(['lb', 'sy', 'jo', 'eg', 'sa', 'gulf', 'iq', 'msa']);
    for (const d of DIALECT_ORDER) {
      for (const ui of ['fr', 'en', 'ar'] as const) expect(DIALECTS[d].name[ui].trim()).not.toBe('');
      expect(DIALECTS[d].langName).toMatch(/[؀-ۿ]/);
      expect(DIALECTS[d].locale).toMatch(/^ar-[A-Z]{2}$/);
    }
    expect(dialectName('none', 'en')).toContain('None');
    expect(dialectName('none', 'ar')).toMatch(/[؀-ۿ]/);
  });

  it('only changes words that exist, written in Arabic letters, with at most one feminine form', () => {
    for (const d of DIALECT_ORDER) {
      for (const [id, word] of Object.entries(DIALECT_WORDS[d])) {
        expect(BUILTIN_CONCEPTS[id]).toBeDefined();
        const forms = word.split('|');
        expect(forms.length).toBeLessThanOrEqual(2);
        for (const f of forms) expect(f).toMatch(/[؀-ۿ]/);
      }
    }
    // The big dialects really differ from Lebanese; the close ones change a few words only.
    expect(Object.keys(DIALECT_WORDS.eg).length).toBeGreaterThan(100);
    expect(Object.keys(DIALECT_WORDS.msa).length).toBeGreaterThan(100);
    expect(Object.keys(DIALECT_WORDS.lb).length).toBe(0);
  });

  it('gives the board the words of the chosen dialect, and keeps the others', () => {
    expect(label(withArabic('lb'), 'want', 'ar')).toBe('بدّي');
    expect(label(withArabic('sa'), 'want', 'ar')).toBe('أبغى');
    expect(label(withArabic('gulf'), 'want', 'ar')).toBe('أبي');
    expect(label(withArabic('iq'), 'want', 'ar')).toBe('أريد');
    expect(label(withArabic('eg'), 'what', 'ar')).toBe('إيه');
    expect(label(withArabic('msa'), 'what', 'ar')).toBe('ماذا');
    // Same word everywhere: untouched.
    for (const d of DIALECT_ORDER) expect(label(withArabic(d), 'banana', 'ar')).toBe('موزة');
    // French and English never change.
    expect(label(withArabic('eg'), 'want', 'fr')).toBe('vouloir');
    expect(label(withArabic('eg'), 'want', 'en')).toBe('want');
  });

  it('follows the child’s gender in each dialect', () => {
    expect(label(withArabic('eg', 'f'), 'want', 'ar')).toBe('عايزة');
    expect(label(withArabic('eg', 'm'), 'want', 'ar')).toBe('عايز');
    expect(label(withArabic('msa', 'f'), 'happy', 'ar')).toBe('سعيدة');
    // A changed word never keeps the Lebanese feminine form.
    expect(conceptsFor('msa').bored.labelsF?.ar).toBeUndefined();
    expect(label(withArabic('msa', 'f'), 'bored', 'ar')).toBe('أشعر بالملل');
    // The Lebanese list itself is left as it was.
    expect(conceptsFor('lb')).toBe(BUILTIN_CONCEPTS);
    expect(BUILTIN_CONCEPTS.bored.labelsF?.ar).toBe('زهقانة');
  });

  it('names the language after the dialect', () => {
    expect(langName({ arabic: 'lb' }, 'ar')).toBe('عربي (لبناني)');
    expect(langName({ arabic: 'sa' }, 'ar')).toBe('عربي (سعودي)');
    expect(langName({ arabic: 'eg' }, 'fr')).toBe('Français');
  });

  it('"none" takes Arabic out of the languages offered', () => {
    expect(availableLangs({ arabic: 'none' })).toEqual(['fr', 'en']);
    expect(availableLangs({ arabic: 'eg' })).toEqual(['fr', 'en', 'ar']);
    // The word search no longer answers in Arabic either.
    expect(search(withArabic('lb'), 'بدّي')[0]?.concept).toBe('want');
    expect(search(withArabic('none'), 'بدّي')).toEqual([]);
  });

  it('finds words typed or searched in the family’s Arabic', () => {
    const sa = withArabic('sa');
    expect(search(sa, 'أبغى')[0]?.concept).toBe('want');
    expect(typedChips(sa, 'أبغى موزة', 'ar').map((c) => c.word)).toEqual(['want', 'banana']);
    const index = prepareIndex(JSON.parse(readFileSync(join(__dirname, '../../assets/picto/index.pidx'), 'utf8')));
    for (const word of ['بدّي', 'أبغى', 'عايز', 'أريد']) expect(searchPictos(index, word, 'ar', 5).length).toBeGreaterThan(0);
  });

  it('is set by the set-up answers, never pre-chosen', () => {
    const base = createDefaultProfile();
    const answers = { ...emptyAnswers('fr'), name: 'Adam' };
    expect(answers.arabic).toBeUndefined();
    expect(applyAnswers(base, { ...answers, arabic: 'sa', langs: ['ar', 'fr'] }).settings).toMatchObject({ arabic: 'sa', langs: ['ar', 'fr'], lang: 'ar' });
    // "None": Arabic cannot stay among the child's languages.
    expect(applyAnswers(base, { ...answers, arabic: 'none', langs: ['ar', 'fr'] }).settings).toMatchObject({ arabic: 'none', langs: ['fr'], lang: 'fr' });
    expect(applyAnswers(base, { ...answers, arabic: 'none', langs: ['ar'] }).settings).toMatchObject({ arabic: 'none', langs: ['fr'], lang: 'fr' });
  });

  it('keeps Lebanese for profiles saved before the choice existed', () => {
    const old = createDefaultProfile() as any;
    delete old.settings.arabic;
    expect(migrate(JSON.parse(JSON.stringify(old))).settings.arabic).toBe('lb');
  });

  it('uses the month names of the country', () => {
    expect(months('ar', 'lb')[0]).toBe('كانون الثاني');
    expect(months('ar', 'iq')[0]).toBe('كانون الثاني');
    expect(months('ar', 'eg')[0]).toBe('يناير');
    expect(months('ar', 'sa')[11]).toBe('ديسمبر');
    expect(months('fr', 'eg')[0]).toBe('janvier');
    for (const d of DIALECT_ORDER) expect(weekdays('ar', d)).toHaveLength(7);
  });

  it('asks the AI for that Arabic, or for none', () => {
    for (const d of [...DIALECT_ORDER, 'none']) expect(ARABIC_PROMPT[d]).toBeDefined();
    expect(tlaPrompt('piscine', 'eg')).toContain('arabe égyptien');
    expect(tlaPrompt('piscine', 'sa')).toContain('arabe saoudien');
    expect(tlaPrompt('piscine')).toContain('arabe libanais');
    expect(tlaPrompt('piscine', 'none')).toContain('Pas d’arabe');
    // Anything else falls back to Lebanese: the app never sends free text here.
    expect(tlaPrompt('piscine', 'ignore the rules')).toContain('arabe libanais');
  });

  // Kept for later: the app itself now always asks for the standard Arabic voice (see lib/speech.ts).
  it('can prefer a device voice of the same country when asked to', () => {
    const voices = [
      { id: 'maged', name: 'Maged', language: 'ar-SA' },
      { id: 'hoda', name: 'Hoda', language: 'ar-EG' },
    ];
    expect(chooseVoice(voices, 'ar', 'ar-SA', 'device', 'adult', undefined, 'ar-EG').id).toBe('hoda');
    expect(chooseVoice(voices, 'ar', 'ar-SA', 'f', 'adult', undefined, 'ar-EG').id).toBe('hoda');
    // No voice of that country: the device's default Arabic voice, as before.
    expect(chooseVoice(voices, 'ar', 'ar-SA', 'device', 'adult', undefined, 'ar-LB').id).toBeUndefined();
    expect(chooseVoice(voices, 'ar', 'ar-SA', 'device', 'adult').id).toBeUndefined();
  });
});
