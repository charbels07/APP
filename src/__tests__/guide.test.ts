import { GUIDE, GUIDE_TRACK_INTRO } from '../data/guide';
import { createDefaultProfile } from '../data/defaults';
import { migrate } from '../lib/storage';
import { adminStrings } from '../i18n/admin';
import { dataStrings } from '../i18n/data';
import { editStrings } from '../i18n/edit';
import { onboardingStrings } from '../i18n/onboarding';
import { proStrings } from '../i18n/pro';
import { settingsStrings } from '../i18n/settings';
import { strings } from '../i18n/ui';

describe('in-app guide', () => {
  it('covers both tracks, in French and English, with the same steps', () => {
    expect(GUIDE.filter((c) => c.track === 'start').length).toBeGreaterThanOrEqual(10);
    expect(GUIDE.filter((c) => c.track === 'pro').length).toBeGreaterThanOrEqual(8);
    for (const c of GUIDE) {
      expect(c.title.fr && c.title.en).toBeTruthy();
      expect(c.steps.fr.length).toBeGreaterThan(0);
      expect(c.steps.en.length).toBe(c.steps.fr.length);
      expect(c.steps.ar.length).toBe(c.steps.fr.length);
      expect(c.title.ar).toMatch(/[\u0600-\u06FF]/); // really translated, not the French fallback
      if (c.tip) expect(c.tip.fr && c.tip.en && c.tip.ar).toBeTruthy();
    }
    expect(new Set(GUIDE.map((c) => c.id)).size).toBe(GUIDE.length);
    expect(GUIDE_TRACK_INTRO.start.fr && GUIDE_TRACK_INTRO.pro.en && GUIDE_TRACK_INTRO.pro.ar).toBeTruthy();
  });

  it('quotes the buttons with their real names', () => {
    const text = (lang: 'fr' | 'en' | 'ar') => GUIDE.flatMap((c) => c.steps[lang]).join(' ');
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const t = strings(lang);
      for (const label of [t.speak, t.showMe, t.sayWord, t.drawWord, t.newTla, t.markDone, t.firstThen, t.recordDemo, t.saveDemo, t.moveCell, t.createWord, t.pasteImage, t.sExport, t.suggest])
        expect(text(lang)).toContain(label);
    }
  });

  it('describes the newer features with the names shown on screen', () => {
    const text = (lang: 'fr' | 'en' | 'ar') => GUIDE.flatMap((c) => c.steps[lang]).join(' ');
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const t = strings(lang);
      const e = editStrings(lang);
      const st = settingsStrings(lang);
      const pro = proStrings(lang);
      const ob = onboardingStrings(lang);
      const quoted = [
        // new board: empty, from a photo, imported
        t.emptyTla, e.photoTitle, e.importFile, e.importShared,
        // pictogram library
        t.pictoToReview, t.sAbout, t.sSymbols, t.sShowLabels,
        // languages now live in Settings; its pages
        t.sCommLang, t.sInterface, st.tabTeam, st.tabAccount, dataStrings(lang).tab,
        // presentation and access, lock
        ob.presentationAccess, t.lockTitle,
        // sequences (step lists) with suggested steps; settings are saved on demand; voice height; selection
        t.newSchedule, t.suggestSteps, t.createSeq, t.editSchedule, t.save, t.sDiscard, t.sPitch, e.selectAll, e.selectNone,
        // professionals
        pro.nav.users, pro.nav.create, pro.nav.library, pro.nav.learn, pro.sendForApproval, st.levels[1], st.levels[2], st.levels[3],
        // the certificate must be accepted first; writing to the app's team
        pro.nav.account, adminStrings(lang).writeTeam,
        // the account page: children, devices, deleting, preferences
        st.myAccount, st.addChild, st.devices, st.syncNow, st.linkDevice, st.unlink, st.privacy, st.deleteAccount, st.prefs, st.interfaceLang,
        // the team: ending an access, what happened, a new code
        st.expiry, st.revoke, st.news, st.renewCode,
        // the professional workspace: verification, connecting to a family, collaborations
        pro.verifyTitle, pro.submit, pro.connectUser, pro.familyCode, pro.sendRequest, pro.nav.dashboard, pro.nav.collab, pro.collabConnections,
        // anonymous statistics are a separate, optional choice
        dataStrings(lang).shareTitle,
        // a word recorded by the family, per language; which voice the device uses
        t.voice, e.recordVoice, t.voiceUsed,
      ];
      for (const label of quoted) expect(text(lang)).toContain(label);
      // Removed things are no longer described.
      expect(text(lang)).not.toMatch(/ARASAAC/i);
    }
    expect(GUIDE.map((c) => c.id)).toEqual(expect.arrayContaining(['pictos', 'proposals', 'keyboard', 'quickActions', 'progress', 'privacy', 'account', 'workspace']));
    // The language button left the bar: the bar is listed without it.
    expect(GUIDE.find((c) => c.id === 'screen')!.steps.en[0]).not.toContain('Language');
    expect(GUIDE.find((c) => c.id === 'language')!.action).toBe('settings');
  });

  it('greets new and existing profiles once', () => {
    expect(createDefaultProfile().guide?.seen).toBeFalsy();
    const p = createDefaultProfile();
    p.guide = { seen: true, read: ['screen'] };
    expect(migrate(JSON.parse(JSON.stringify(p))).guide).toEqual({ seen: true, read: ['screen'] });
  });
});

describe('navigation language, separate from the words language', () => {
  it('every interface text exists in French, English and Arabic', () => {
    const fr = strings('fr');
    for (const lang of ['en', 'ar'] as const) {
      const d = strings(lang) as Record<string, unknown>;
      for (const key of Object.keys(fr)) expect(d[key]).toBeTruthy();
    }
    // Arabic navigation is really in Arabic for everything a user reads first.
    const ar = strings('ar');
    for (const key of ['caa', 'tla', 'schedule', 'timer', 'help', 'search', 'keyboard', 'language', 'caregiver', 'speak', 'guide', 'settings', 'wordsLang', 'navLang'] as const)
      expect(ar[key]).toMatch(/[\u0600-\u06FF]/);
  });

  it('the two languages are stored separately', () => {
    const p = createDefaultProfile();
    p.settings.lang = 'ar';
    p.settings.uiLang = 'fr';
    const back = migrate(JSON.parse(JSON.stringify(p)));
    expect([back.settings.lang, back.settings.uiLang]).toEqual(['ar', 'fr']);
  });
});
