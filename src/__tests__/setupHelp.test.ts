/** The "?" beside each question of the set-up: an explanation in three languages, tied to the guide. */
import fs from 'fs';
import path from 'path';
import { GUIDE } from '../data/guide';
import { SETUP_HELP, setupHelp, type SetupHelpId } from '../data/setupHelp';
import { dataStrings } from '../i18n/data';
import { onboardingStrings } from '../i18n/onboarding';
import { strings } from '../i18n/ui';

const IDS = Object.keys(SETUP_HELP) as SetupHelpId[];
const LANGS = ['fr', 'en', 'ar'] as const;

describe('set-up: the "?" beside each question', () => {
  it('every question of the set-up has its "?"', () => {
    const screen = fs.readFileSync(path.join(__dirname, '../ui/onboarding/Onboarding.tsx'), 'utf8');
    // The steps of the journey, as the screen lists them ("try" is the board itself: no question).
    const steps = /const STEPS = \[([^\]]+)\]/.exec(screen)![1].split(',').map((x) => x.trim().replace(/'/g, ''));
    const questions = steps.filter((x) => x !== 'try');
    expect(questions.sort()).toEqual([...IDS].sort());
    for (const id of IDS) expect(screen).toContain(`help="${id}"`);
  });

  it('is written in the three languages, with the same lines, about "the child"', () => {
    for (const id of IDS) {
      const { lines } = SETUP_HELP[id];
      expect(lines.fr.length).toBeGreaterThanOrEqual(2);
      expect(lines.en.length).toBe(lines.fr.length);
      expect(lines.ar.length).toBe(lines.fr.length);
      for (const line of lines.ar) expect(line).toMatch(/[؀-ۿ]/);
      for (const lang of LANGS)
        for (const line of lines[lang]) {
          expect(line.length).toBeGreaterThan(15);
          expect(line).not.toMatch(/undefined|TODO/);
          // The same text is read by parents and by professionals.
          expect(line).not.toMatch(/votre enfant|your child|طفلك/i);
        }
    }
  });

  it('shows real parts of the guide: the chapter and its steps exist, in every language', () => {
    for (const id of IDS) {
      for (const part of SETUP_HELP[id].guide ?? []) {
        const chapter = GUIDE.find((c) => c.id === part.chapter);
        expect(chapter).toBeDefined();
        for (const i of part.steps) for (const lang of LANGS) expect(chapter!.steps[lang][i]).toBeTruthy();
      }
      for (const lang of LANGS) {
        const shown = setupHelp(id, lang);
        expect(shown.lines).toBe(SETUP_HELP[id].lines[lang]);
        expect(shown.guide.length).toBe((SETUP_HELP[id].guide ?? []).length);
        for (const g of shown.guide) expect(g.title && g.steps.length).toBeTruthy();
      }
    }
    // Most questions lead somewhere in the guide.
    expect(IDS.filter((id) => SETUP_HELP[id].guide?.length).length).toBeGreaterThanOrEqual(10);
    expect(setupHelp('langs', 'en').guide[0].title).toBe('Choosing languages');
  });

  it('names the settings and buttons as they are written on screen', () => {
    for (const lang of LANGS) {
      const o = onboardingStrings(lang);
      const t = strings(lang);
      const text = (id: SetupHelpId) => SETUP_HELP[id].lines[lang].join(' ');
      expect(text('visual')).toContain(o.presentationAccess);
      expect(text('access')).toContain(o.presentationAccess);
      expect(text('voice')).toContain(t.sVoice);
      expect(text('voice')).toContain(o.listen);
      expect(text('review')).toContain(o.edit);
      expect(text('plans')).toContain(t.sBar);
      expect(text('data')).toContain(dataStrings(lang).tab);
      expect(text('activities')).toContain({ fr: 'mes mots', en: 'my words', ar: 'كلماتي' }[lang]);
    }
  });
});
