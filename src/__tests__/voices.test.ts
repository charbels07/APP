import { chooseVoice, voiceGender, type VoiceInfo, forVoice } from '../lib/voices';

const v = (id: string, name: string, language: string, quality = 'Default'): VoiceInfo => ({ id, name, language, quality });

describe('voice type: female / male', () => {
  it('recognises voices on Apple, Google and Microsoft devices', () => {
    expect(voiceGender(v('com.apple.voice.compact.fr-FR.Thomas', 'Thomas', 'fr-FR'))).toBe('m');
    expect(voiceGender(v('com.apple.ttsbundle.Amelie-compact', 'Amélie', 'fr-CA'))).toBe('f');
    expect(voiceGender(v('com.apple.ttsbundle.siri_female_fr-FR_compact', 'Siri Voice 1', 'fr-FR'))).toBe('f');
    expect(voiceGender(v('com.apple.ttsbundle.siri_male_en-US_compact', 'Siri Voice 2', 'en-US'))).toBe('m');
    expect(voiceGender(v('Google UK English Male', 'Google UK English Male', 'en-GB'))).toBe('m');
    expect(voiceGender(v('Google UK English Female', 'Google UK English Female', 'en-GB'))).toBe('f');
    expect(voiceGender(v('Google français', 'Google français', 'fr-FR'))).toBe('f');
    expect(voiceGender(v('MSTTS_V110_enUS_ZiraM', 'Microsoft Zira - English (United States)', 'en-US'))).toBe('f');
    expect(voiceGender(v('com.apple.ttsbundle.Maged-compact', 'Maged', 'ar-SA'))).toBe('m');
    expect(voiceGender(v('fr-fr-x-frc-local', 'fr-fr-x-frc-local', 'fr-FR'))).toBeUndefined();
  });
});

describe('choosing the voice for each language', () => {
  const voices = [
    v('t', 'Thomas', 'fr-FR'),
    v('am', 'Amélie', 'fr-CA'),
    v('au', 'Audrey', 'fr-FR', 'Enhanced'),
    v('s', 'Samantha', 'en-US'),
    v('d', 'Daniel', 'en-GB'),
    v('m', 'Maged', 'ar-SA'),
  ];
  it('picks a woman’s or a man’s voice, the best quality and the right country first', () => {
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'f', 'adult')).toMatchObject({ id: 'au', exact: true, pitch: 1 });
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'm', 'adult')).toMatchObject({ id: 't', exact: true });
    expect(chooseVoice(voices, 'en', 'en-US', 'm', 'adult')).toMatchObject({ id: 'd' });
  });
  it('a child voice is the chosen voice, higher pitched', () => {
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'f', 'child')).toMatchObject({ id: 'au', pitch: 1.5 });
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'm', 'child')).toMatchObject({ id: 't', pitch: 1.35 });
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'device', 'child')).toEqual({ pitch: 1.4, exact: true });
  });
  it('without a voice of that kind, the device voice is pitched towards it (and says so)', () => {
    expect(chooseVoice(voices, 'ar', 'ar-SA', 'f', 'adult')).toEqual({ pitch: 1.2, exact: false });
    expect(chooseVoice([], 'ar', 'ar-SA', 'm', 'adult')).toEqual({ pitch: 0.8, exact: false });
  });
  it('a precise voice chosen by the family wins', () => {
    expect(chooseVoice(voices, 'fr', 'fr-FR', 'f', 'adult', 't')).toMatchObject({ id: 't', name: 'Thomas' });
  });
});

describe('text handed to the voice', () => {
  it('a capital letter alone is said in lower case, so the voice does not announce "capital I"', () => {
    expect(forVoice('I')).toBe('i');
    expect(forVoice('I.')).toBe('i.');
    expect(forVoice(' A ')).toBe(' a ');
  });
  it('everything else is left exactly as it is', () => {
    for (const t of ['I want water', 'Adam', 'OK', 'i', '5', 'أنا', 'À table', '']) expect(forVoice(t)).toBe(t);
  });
});
