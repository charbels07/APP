import { createDefaultProfile } from '../data/defaults';
import { CHILD_VOICE_MAX, childVoiceKind, sayable, soundKey } from '../lib/childVoice';
import { GUIDE } from '../data/guide';
import { strings } from '../i18n/ui';
import type { Profile } from '../model/types';

const st = (patch: Partial<Profile['settings']>) => ({ ...createDefaultProfile().settings, voiceAge: 'child' as const, ...patch });

describe('the children’s voice (French and English)', () => {
  it('is the real girl’s voice for a girl’s voice; the boy keeps the tablet’s voice', () => {
    expect(childVoiceKind(st({ voiceKind: 'f' }), 'fr')).toBe('f');
    expect(childVoiceKind(st({ voiceKind: 'device', gender: 'f' }), 'en')).toBe('f');
    // The boy: the device's own voice, tuned by ear (lib/voices.ts), never the speech service.
    expect(childVoiceKind(st({ voiceKind: 'm' }), 'en')).toBeUndefined();
    expect(childVoiceKind(st({ voiceKind: 'm', gender: 'f' }), 'fr')).toBeUndefined();
    expect(childVoiceKind(st({ voiceKind: 'device', gender: 'm' }), 'fr')).toBeUndefined();
  });

  it('leaves the tablet’s voice for an adult voice, Arabic, a refusal, or a precise device voice', () => {
    expect(childVoiceKind(st({ voiceAge: 'adult', voiceKind: 'f' }), 'fr')).toBeUndefined();
    // Arabic dialect voices are not used: the device's standard Arabic voice speaks.
    expect(childVoiceKind(st({ voiceKind: 'f' }), 'ar')).toBeUndefined();
    expect(childVoiceKind(st({ voiceKind: 'f', childVoiceOnline: false }), 'fr')).toBeUndefined();
    expect(childVoiceKind(st({ voiceKind: 'f', voices: { fr: 'com.apple.voice.Amelie' } }), 'fr')).toBeUndefined();
    expect(childVoiceKind(st({ voiceKind: 'f', voices: { fr: 'com.apple.voice.Amelie' } }), 'en')).toBe('f');
  });

  it('only sends a short text that has something to say', () => {
    expect(sayable('  je   veux\njouer ')).toBe('je veux jouer');
    expect(sayable(' … ')).toBe('');
    expect(sayable('a'.repeat(CHILD_VOICE_MAX + 1))).toBe('');
  });

  it('keeps each phrase, language and voice under its own file name', () => {
    const keys = [soundKey('fr', 'f', 'encore'), soundKey('en', 'f', 'encore'), soundKey('fr', 'f', 'encore !')];
    expect(new Set(keys).size).toBe(3);
    for (const k of keys) expect(k).toMatch(/^[a-z0-9-]+$/);
    expect(soundKey('fr', 'f', 'encore')).toBe(keys[0]);
  });

  it('tells the family what travels, in the three languages, and the guide names the setting', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      const t = strings(l);
      const text = GUIDE.flatMap((c) => c.steps[l]).join('\n');
      expect(t.sChildVoiceOnlineNote).toMatch(/Microsoft|مايكروسوفت/);
      expect(text).toContain(t.sChildVoiceOnline);
      expect(text).toContain(t.recordRequired);
    }
  });
});
