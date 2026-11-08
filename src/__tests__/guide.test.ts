import { GUIDE, GUIDE_TRACK_INTRO } from '../data/guide';
import { createDefaultProfile } from '../data/defaults';
import { migrate } from '../lib/storage';
import { strings } from '../i18n/ui';

describe('in-app guide', () => {
  it('covers both tracks, in French and English, with the same steps', () => {
    expect(GUIDE.filter((c) => c.track === 'start').length).toBeGreaterThanOrEqual(10);
    expect(GUIDE.filter((c) => c.track === 'pro').length).toBeGreaterThanOrEqual(8);
    for (const c of GUIDE) {
      expect(c.title.fr && c.title.en).toBeTruthy();
      expect(c.steps.fr.length).toBeGreaterThan(0);
      expect(c.steps.en.length).toBe(c.steps.fr.length);
      if (c.tip) expect(c.tip.fr && c.tip.en).toBeTruthy();
    }
    expect(new Set(GUIDE.map((c) => c.id)).size).toBe(GUIDE.length);
    expect(GUIDE_TRACK_INTRO.start.fr && GUIDE_TRACK_INTRO.pro.en).toBeTruthy();
  });

  it('quotes the buttons with their real names', () => {
    const text = (lang: 'fr' | 'en') => GUIDE.flatMap((c) => c.steps[lang]).join(' ');
    for (const lang of ['fr', 'en'] as const) {
      const t = strings(lang);
      for (const label of [t.speak, t.showMe, t.sayWord, t.drawWord, t.newTla, t.markDone, t.firstThen, t.recordDemo, t.saveDemo, t.moveCell, t.createWord, t.pasteImage, t.sExport, t.suggest])
        expect(text(lang)).toContain(label);
    }
  });

  it('greets new and existing profiles once', () => {
    expect(createDefaultProfile().guide?.seen).toBeFalsy();
    const p = createDefaultProfile();
    p.guide = { seen: true, read: ['screen'] };
    expect(migrate(JSON.parse(JSON.stringify(p))).guide).toEqual({ seen: true, read: ['screen'] });
  });
});
