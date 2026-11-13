/**
 * Dialect voices: which pre-generated clip says an Arabic word of the child's board.
 *
 * Tablets have one Arabic voice (Standard Arabic), so a Saudi « أبغى » or an Egyptian « عايز »
 * would be read with the wrong accent. When a voice pack exists for the family's dialect
 * (generated once from a speech service, see scripts/build-voice-packs.ts), the words it knows
 * are played from the pack; everything else (new words, typed text) keeps the tablet's voice.
 * Pure: no audio is loaded here.
 */
import { VOICE_INDEX } from '../data/voicePackIndex';
import type { Lang, Settings } from '../model/types';

type VoiceSettings = Pick<Settings, 'arabic' | 'voiceKind' | 'gender' | 'dialectVoice'>;

/** The pack used for this child (`eg.f`), if their dialect has one and the family left it on. */
export function dialectPack(settings: VoiceSettings, index = VOICE_INDEX): string | undefined {
  const d = settings.arabic;
  if (!d || d === 'none' || settings.dialectVoice === false) return undefined;
  // Woman / man as chosen in Settings → Voice; "device voice": like the child.
  const want = settings.voiceKind === 'f' || settings.voiceKind === 'm' ? settings.voiceKind : settings.gender === 'f' ? 'f' : 'm';
  const other = want === 'f' ? 'm' : 'f';
  return index[`${d}.${want}`] ? `${d}.${want}` : index[`${d}.${other}`] ? `${d}.${other}` : undefined;
}

/** The pack that has a clip for exactly this Arabic word, if any. */
export function clipFor(settings: VoiceSettings, lang: Lang, text: string, index = VOICE_INDEX): string | undefined {
  if (lang !== 'ar') return undefined;
  const pack = dialectPack(settings, index);
  return pack && index[pack].clips[text.trim()] ? pack : undefined;
}
