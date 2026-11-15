/**
 * The children's voice: in French and English, when the family chose "Child" as the voice's age,
 * a real child's voice of a speech service says the words and sentences (server function
 * "caa-voice"), instead of a woman's voice of the tablet made higher. The tablet keeps each sound
 * it received, so a phrase is asked once and then works without internet.
 *
 * The tablet's own voice remains the safety net: no connection yet for a phrase never said, the
 * service not installed, Arabic, or a precise device voice chosen by the family.
 * A word recorded by the family always comes first (see grammar.ts: `audio`).
 * Pure: nothing is fetched here (see childVoiceSound.ts).
 */
import type { Lang, Settings } from '../model/types';

export type ChildVoiceLang = 'fr' | 'en';
export type ChildVoiceKind = 'f' | 'm';
type VoiceSettings = Pick<Settings, 'voiceAge' | 'voiceKind' | 'gender' | 'voices' | 'childVoiceOnline'>;

/** Longest text sent to be said (the server refuses more). */
export const CHILD_VOICE_MAX = 300;
/** Changes when the voices change on the server, so tablets do not keep the old sounds. */
const VOICES_VERSION = 'v1';

export const hasChildVoice = (lang: Lang): lang is ChildVoiceLang => lang === 'fr' || lang === 'en';

/**
 * Girl or boy's voice for this language, or undefined when the tablet's voice speaks.
 * Girl / boy as chosen in Settings → Voice; "device voice": like the child.
 */
export function childVoiceKind(settings: VoiceSettings, lang: Lang): ChildVoiceKind | undefined {
  if (settings.voiceAge !== 'child' || !hasChildVoice(lang) || settings.childVoiceOnline === false) return undefined;
  // A precise voice of the device chosen by the family for this language is respected.
  if (settings.voices?.[lang]) return undefined;
  if (settings.voiceKind === 'f' || settings.voiceKind === 'm') return settings.voiceKind;
  return settings.gender === 'f' ? 'f' : 'm';
}

/** The text as it is sent and kept: one line, no spaces around. Empty = nothing to say with this voice. */
export function sayable(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= CHILD_VOICE_MAX && /[\p{L}\p{N}]/u.test(clean) ? clean : '';
}

/** Name under which a sound is kept on the device (letters and digits only: it is a file name). */
export function soundKey(lang: ChildVoiceLang, kind: ChildVoiceKind, text: string): string {
  // Two simple hashes side by side: enough to tell a child's phrases apart.
  let a = 0x811c9dc5;
  let b = 5381;
  const s = `${VOICES_VERSION}|${lang}|${kind}|${text}`;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193) >>> 0;
    b = (Math.imul(b, 33) + c) >>> 0;
  }
  return `${lang}${kind}-${a.toString(36)}${b.toString(36)}-${s.length}`;
}
