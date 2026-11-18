/** "No voice for Arabic on this device": the check and what it tells the family. */
import fs from 'fs';
import path from 'path';
import { langsWithoutVoice } from '../lib/voices';
import { installSteps, NO_VOICE } from '../i18n/voiceCheck';

const voice = (language: string) => ({ language });

describe('which of the child’s languages the device cannot say', () => {
  it('an Android tablet without Arabic voice data', () => {
    const android = [voice('fr-FR'), voice('en-US'), voice('en-GB')];
    expect(langsWithoutVoice(android, ['fr', 'ar'])).toEqual(['ar']);
    expect(langsWithoutVoice(android, ['en', 'fr'])).toEqual([]);
  });

  it('reads every way devices write a language (ar-SA, ar_EG, ar, AR-001)', () => {
    for (const code of ['ar-SA', 'ar_EG', 'ar', 'AR-001']) expect(langsWithoutVoice([voice(code)], ['ar'])).toEqual([]);
    // "arn" (Mapudungun) is not Arabic.
    expect(langsWithoutVoice([voice('arn-CL')], ['ar'])).toEqual(['ar']);
  });

  it('says nothing when the device did not tell its voices (a browser that never answered)', () => {
    expect(langsWithoutVoice([], ['fr', 'ar'])).toEqual([]);
  });

  it('names each language once', () => {
    expect(langsWithoutVoice([voice('fr-FR')], ['ar', 'ar', 'en'])).toEqual(['ar', 'en']);
  });
});

describe('the warning', () => {
  it('is written in the three languages, with where to install a voice on iPad, Android and a computer', () => {
    for (const ui of ['fr', 'en', 'ar'] as const) {
      const t = NO_VOICE[ui];
      expect(t.none(t.names.ar)).toContain(t.names.ar);
      for (const l of ['fr', 'en', 'ar'] as const) expect(t.names[l]).toBeTruthy();
      expect(t.ios).toMatch(/iPad/);
      expect(t.android).toMatch(/Android/);
      if (ui === 'ar') for (const line of [t.none('x'), t.ios, t.android, t.computer]) expect(line).toMatch(/[؀-ۿ]/);
    }
    expect(NO_VOICE.en.ios).toContain('Settings → Accessibility → Spoken Content → Voices');
    expect(NO_VOICE.en.android).toContain('Settings → System → Languages → Text-to-speech');
  });

  it('shows the steps of the device in use (a browser can be on a tablet or a computer)', () => {
    expect(installSteps('en', 'ios')).toEqual([NO_VOICE.en.ios]);
    expect(installSteps('en', 'android')).toEqual([NO_VOICE.en.android]);
    expect(installSteps('fr', 'web')).toEqual([NO_VOICE.fr.ios, NO_VOICE.fr.android, NO_VOICE.fr.computer]);
  });

  it('is shown in the set-up’s voice step and in Settings → Voice, for the child’s languages', () => {
    const setup = fs.readFileSync(path.join(__dirname, '../ui/onboarding/Onboarding.tsx'), 'utf8');
    const voiceStep = setup.slice(setup.indexOf('function VoiceStep'), setup.indexOf('function CommStep'));
    expect(voiceStep).toContain('<NoVoiceWarning langs={a.langs}');
    const settings = fs.readFileSync(path.join(__dirname, '../ui/panels/CaregiverPanels.tsx'), 'utf8');
    const voiceGroup = settings.slice(settings.indexOf('<Group title={t.sVoice}'), settings.indexOf('<Group title={t.sBar}'));
    expect(voiceGroup).toContain('<NoVoiceWarning langs={childLangs}');
  });
});
