import { chooseVoice, isRobotic, voiceGender, type VoiceInfo, forVoice } from '../lib/voices';

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

describe('a man’s voice that sounds like a man, not like a machine', () => {
  // What an iPad or a Mac lists: the joke and "Eloquence" voices come first by alphabetical order.
  const apple = [
    v('com.apple.eloquence.fr-FR.Eddy', 'Eddy', 'fr-FR'),
    v('com.apple.eloquence.fr-FR.Grandpa', 'Grandpa', 'fr-FR'),
    v('com.apple.eloquence.fr-FR.Jacques', 'Jacques', 'fr-FR'),
    v('com.apple.eloquence.fr-FR.Rocko', 'Rocko', 'fr-FR'),
    v('com.apple.voice.compact.fr-FR.Thomas', 'Thomas', 'fr-FR'),
    v('com.apple.speech.synthesis.voice.Albert', 'Albert', 'en-US'),
    v('com.apple.speech.synthesis.voice.Fred', 'Fred', 'en-US'),
    v('com.apple.speech.synthesis.voice.BadNews', 'Bad News', 'en-US'),
    v('com.apple.eloquence.en-US.Eddy', 'Eddy', 'en-US'),
    v('com.apple.voice.compact.en-GB.Daniel', 'Daniel', 'en-GB'),
    v('com.apple.voice.compact.en-US.Samantha', 'Samantha', 'en-US'),
  ];
  it('picks Thomas and Daniel, not Eddy or Albert', () => {
    expect(chooseVoice(apple, 'fr', 'fr-FR', 'm', 'adult')).toMatchObject({ name: 'Thomas', exact: true, pitch: 1 });
    expect(chooseVoice(apple, 'en', 'en-US', 'm', 'adult')).toMatchObject({ name: 'Daniel', exact: true, pitch: 1 });
    expect(isRobotic(apple[0]) && isRobotic(apple[5]) && isRobotic(apple[7])).toBe(true);
    expect(isRobotic(apple[4]) || isRobotic(apple[9])).toBe(false);
  });
  it('still uses a machine-like voice when the device has no other man’s voice', () => {
    expect(chooseVoice([apple[6], apple[10]], 'en', 'en-US', 'm', 'adult')).toMatchObject({ name: 'Fred', exact: true });
  });
  it('prefers the natural voices of a browser to the older ones', () => {
    const edge = [
      v('Microsoft David - English (United States)', 'Microsoft David - English (United States)', 'en-US'),
      v('Microsoft Guy Online (Natural) - English (United States)', 'Microsoft Guy Online (Natural) - English (United States)', 'en-US'),
      v('Microsoft Paul - French (France)', 'Microsoft Paul - French (France)', 'fr-FR'),
      v('Microsoft Henri Online (Natural) - French (France)', 'Microsoft Henri Online (Natural) - French (France)', 'fr-FR'),
    ];
    expect(chooseVoice(edge, 'en', 'en-US', 'm', 'adult').name).toContain('Guy');
    expect(chooseVoice(edge, 'fr', 'fr-FR', 'm', 'adult').name).toContain('Henri');
    expect(chooseVoice(edge.slice(0, 1), 'en', 'en-US', 'm', 'adult').name).toContain('David');
  });
  it('without any man’s voice: French and English are pitched clearly lower; Arabic and a boy’s voice as before', () => {
    const women = [v('g', 'Google français', 'fr-FR'), v('z', 'Microsoft Zira - English (United States)', 'en-US')];
    expect(chooseVoice(women, 'fr', 'fr-FR', 'm', 'adult')).toEqual({ pitch: 0.7, exact: false });
    expect(chooseVoice(women, 'en', 'en-US', 'm', 'adult')).toEqual({ pitch: 0.7, exact: false });
    expect(chooseVoice(women, 'ar', 'ar-SA', 'm', 'adult')).toEqual({ pitch: 0.8, exact: false });
    expect(chooseVoice(women, 'fr', 'fr-FR', 'm', 'child')).toEqual({ pitch: 1.08, exact: false });
  });
});
