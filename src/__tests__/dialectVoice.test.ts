import type { VoicePackInfo } from '../data/voicePackIndex';

// A pretend set of generated packs: Egyptian woman and man, Saudi man only.
const FAKE: Record<string, VoicePackInfo> = {
  'eg.f': { voice: 'ar-EG-SalmaNeural', locale: 'ar-EG', clips: { عايز: [0, 10], عايزة: [10, 12], موزة: [22, 9] } },
  'eg.m': { voice: 'ar-EG-ShakirNeural', locale: 'ar-EG', clips: { عايز: [0, 11], عايزة: [11, 12], موزة: [23, 9] } },
  'sa.m': { voice: 'ar-SA-HamedNeural', locale: 'ar-SA', clips: { أبغى: [0, 8] } },
};
jest.mock('../data/voicePackIndex', () => ({ VOICE_INDEX: FAKE, VOICE_BUILT: '2026-11-13', VOICE_PROVIDER: { name: 'Test', url: '' } }));

import { createDefaultProfile } from '../data/defaults';
import { clipFor, dialectPack } from '../lib/dialectVoice';
import { renderStrip, tokenSegment, toSegments, toSpeechPlan } from '../lib/grammar';
import type { Profile, StripItem } from '../model/types';

const child = (patch: Partial<Profile['settings']>): Profile => {
  const p = createDefaultProfile();
  Object.assign(p.settings, { lang: 'ar', arabic: 'eg', gender: 'm', voiceKind: 'device' }, patch);
  return p;
};
const word = (concept: string, i = 0): StripItem => ({ key: `k${i}`, kind: 'concept', concept, lang: 'ar' });

describe('dialect voices', () => {
  it('chooses the pack of the family’s dialect: woman or man as in Settings, else like the child', () => {
    expect(dialectPack(child({ voiceKind: 'f' }).settings)).toBe('eg.f');
    expect(dialectPack(child({ voiceKind: 'm' }).settings)).toBe('eg.m');
    expect(dialectPack(child({ voiceKind: 'device', gender: 'f' }).settings)).toBe('eg.f');
    expect(dialectPack(child({ voiceKind: 'device', gender: 'm' }).settings)).toBe('eg.m');
    // Only a man's voice exists for Saudi: better than the wrong accent.
    expect(dialectPack(child({ arabic: 'sa', voiceKind: 'f' }).settings)).toBe('sa.m');
    // No pack for that dialect, no Arabic, or turned off: the tablet's voice.
    expect(dialectPack(child({ arabic: 'iq' }).settings)).toBeUndefined();
    expect(dialectPack(child({ arabic: 'none' }).settings)).toBeUndefined();
    expect(dialectPack(child({ dialectVoice: false }).settings)).toBeUndefined();
  });

  it('only covers Arabic words the pack really has', () => {
    const st = child({ voiceKind: 'f' }).settings;
    expect(clipFor(st, 'ar', 'عايز')).toBe('eg.f');
    expect(clipFor(st, 'ar', 'كلمة جديدة')).toBeUndefined();
    expect(clipFor(st, 'fr', 'عايز')).toBeUndefined();
  });

  it('says the board’s words with the dialect voice and the rest with the tablet’s voice', () => {
    const p = child({ voiceKind: 'f' });
    const items: StripItem[] = [word('want', 0), { key: 'k1', kind: 'text', text: 'بيتزا هت', lang: 'ar' }, word('banana', 2)];
    const tokens = renderStrip(items, p);
    expect(tokens.map((t) => t.clip)).toEqual(['eg.f', undefined, 'eg.f']);
    expect(toSegments(tokens)).toEqual([
      { kind: 'clip', pack: 'eg.f', text: 'عايز', lang: 'ar' },
      { kind: 'tts', text: 'بيتزا هت', lang: 'ar' },
      { kind: 'clip', pack: 'eg.f', text: 'موزة', lang: 'ar' },
    ]);
    // Following along while speaking: one mark per segment, in order.
    expect(toSpeechPlan(tokens).marks.map((m) => m[0].token)).toEqual([0, 1, 2]);
  });

  it('follows the girl’s form, and French or English are never touched', () => {
    expect(renderStrip([word('want')], child({ gender: 'f' }))[0]).toMatchObject({ text: 'عايزة', clip: 'eg.f' });
    const fr = child({ lang: 'fr' });
    expect(renderStrip([{ key: 'k', kind: 'concept', concept: 'want', lang: 'fr' }], fr)[0].clip).toBeUndefined();
  });

  it('lets the family’s own recording or wording win', () => {
    const recorded = child({});
    recorded.overrides.want = { audio: { ar: 'maman.m4a' } };
    expect(tokenSegment(renderStrip([word('want')], recorded)[0])).toEqual({ kind: 'audio', media: 'maman.m4a' });
    const reworded = child({});
    reworded.overrides.want = { labels: { ar: 'نفسي' } };
    expect(tokenSegment(renderStrip([word('want')], reworded)[0])).toEqual({ kind: 'tts', text: 'نفسي', lang: 'ar' });
  });

  it('changes nothing when the family turns the dialect voice off', () => {
    const tokens = renderStrip([word('want'), word('banana', 1)], child({ dialectVoice: false }));
    expect(toSegments(tokens)).toEqual([{ kind: 'tts', text: 'عايز موزة', lang: 'ar' }]);
  });
});
