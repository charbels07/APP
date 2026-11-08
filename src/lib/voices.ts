/**
 * Choosing the synthetic voice: woman or man, adult or child (Settings → Voice).
 *
 * Devices don't say whether a voice is male or female, so voices are recognised by
 * name: Apple, Google and Microsoft voices have known names (Thomas, Amélie, Samantha,
 * Maged…), and Siri voices carry "male"/"female" in their identifier.
 * Tablets have no real child voices: a child voice is the chosen voice, higher pitched.
 * When a language has no voice of the chosen kind, the device voice is pitched towards it
 * ("approximate" — shown in Settings).
 */
import type { Lang } from '../model/types';
import { normalize } from './search';

export type VoiceGender = 'f' | 'm';
export type VoiceKind = 'device' | VoiceGender;
export type VoiceAge = 'adult' | 'child';

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  quality?: string;
}

const FEMALE = new Set([
  // French
  'amelie', 'audrey', 'aurelie', 'marie', 'virginie', 'julie', 'denise', 'hortense', 'josephine', 'eloise',
  'vivienne', 'celine', 'chantal', 'sylvie', 'lea', 'charlotte', 'ariane',
  // English
  'samantha', 'karen', 'moira', 'tessa', 'victoria', 'allison', 'ava', 'susan', 'zoe', 'fiona', 'veena', 'serena',
  'kate', 'nicky', 'martha', 'catherine', 'kathy', 'vicki', 'princess', 'zira', 'hazel', 'heather', 'linda', 'aria',
  'jenny', 'emma', 'libby', 'sonia', 'natasha', 'clara', 'joanna', 'salli', 'kimberly', 'ivy', 'kendra', 'amy',
  // Arabic
  'laila', 'layla', 'mariam', 'hoda', 'salma', 'amina', 'zariyah', 'fatima', 'nour', 'reem', 'hala', 'zeina',
  // Apple "Eloquence" voices and generic words
  'sandy', 'shelley', 'grandma', 'flo', 'female', 'femme', 'woman', 'girl',
]);
const MALE = new Set([
  'thomas', 'nicolas', 'henri', 'paul', 'claude', 'jacques', 'jean', 'remi', 'mathieu', 'antoine',
  'alex', 'daniel', 'fred', 'rishi', 'tom', 'aaron', 'arthur', 'oliver', 'gordon', 'lee', 'ralph', 'albert', 'bruce',
  'junior', 'david', 'mark', 'george', 'guy', 'ryan', 'eric', 'christopher', 'william', 'matthew', 'joey', 'justin',
  'maged', 'majed', 'tarik', 'hamed', 'naayf', 'shakir', 'bassel', 'omar', 'hamdan', 'zayd',
  'reed', 'grandpa', 'rocko', 'eddy', 'male', 'homme', 'man', 'boy',
]);
/** Whole names that are a known gender without a first name (browser voices). */
const FEMALE_NAMES = ['google francais', 'google us english', 'google espanol'];

/** Woman / man for a device voice, if its name tells. */
export function voiceGender(v: Pick<VoiceInfo, 'id' | 'name'>): VoiceGender | undefined {
  const name = normalize(v.name);
  if (FEMALE_NAMES.some((n) => name.startsWith(n))) return 'f';
  const tokens = `${name} ${normalize(v.id)}`.split(/[^a-z]+/).filter(Boolean);
  // "female" is checked as a token, so it never counts as "male".
  if (tokens.some((x) => FEMALE.has(x))) return 'f';
  if (tokens.some((x) => MALE.has(x))) return 'm';
  return undefined;
}

export interface VoiceChoice {
  /** Device voice to use (undefined: the device's default voice for the language). */
  id?: string;
  name?: string;
  pitch: number;
  /** A voice of the requested kind exists; false = default voice pitched towards it. */
  exact: boolean;
}

const CHILD_PITCH: Record<VoiceKind, number> = { f: 1.5, m: 1.35, device: 1.4 };
const clamp = (p: number) => Math.min(2, Math.max(0.5, +p.toFixed(2)));

export function chooseVoice(
  voices: VoiceInfo[],
  lang: Lang,
  tag: string,
  kind: VoiceKind,
  age: VoiceAge,
  explicitId?: string,
): VoiceChoice {
  const child = age === 'child' ? CHILD_PITCH[kind] : 1;
  const prefix = tag.slice(0, 2).toLowerCase();
  const forLang = voices.filter((v) => v.language.toLowerCase().replace('_', '-').startsWith(prefix));
  if (explicitId) {
    const v = voices.find((x) => x.id === explicitId);
    return { id: explicitId, name: v?.name, pitch: clamp(child), exact: true };
  }
  if (kind === 'device') return { pitch: clamp(child), exact: true };
  const score = (v: VoiceInfo) =>
    (/enhanced|premium/i.test(v.quality ?? '') ? 4 : 0) + (v.language.toLowerCase().replace('_', '-') === tag.toLowerCase() ? 2 : 0);
  const match = forLang.filter((v) => voiceGender(v) === kind).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
  if (match) return { id: match.id, name: match.name, pitch: clamp(child), exact: true };
  // No voice of that kind for this language: the default voice, pitched lower (man) or higher (woman).
  return { pitch: clamp((kind === 'm' ? 0.8 : 1.2) * child), exact: false };
}
