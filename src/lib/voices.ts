/**
 * Choosing the synthetic voice: woman or man, adult or child (Settings → Voice).
 *
 * Devices don't say whether a voice is male or female, so voices are recognised by
 * name: Apple, Google and Microsoft voices have known names (Thomas, Amélie, Samantha,
 * Maged…), and Siri voices carry "male"/"female" in their identifier.
 * Tablets have no real child voices. A child's voice is nearest to a woman's voice, a little
 * higher: a girl's and a boy's voice both start from a woman's voice of the language (a man's
 * voice made higher still sounds like a man), the boy's a little lower than the girl's.
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
  'vivienne', 'celine', 'chantal', 'sylvie', 'lea', 'charlotte', 'ariane', 'brigitte', 'celeste', 'coralie', 'jacqueline',
  'yvette', 'charline',
  // English
  'samantha', 'karen', 'moira', 'tessa', 'victoria', 'allison', 'ava', 'susan', 'zoe', 'fiona', 'veena', 'serena',
  'kate', 'nicky', 'martha', 'catherine', 'kathy', 'vicki', 'princess', 'zira', 'hazel', 'heather', 'linda', 'aria',
  'jenny', 'emma', 'libby', 'sonia', 'natasha', 'clara', 'joanna', 'salli', 'kimberly', 'ivy', 'kendra', 'amy',
  'michelle', 'jane', 'nancy', 'sara', 'ana', 'ashley', 'cora', 'elizabeth', 'amber', 'monica', 'agnes',
  // Arabic
  'laila', 'layla', 'mariam', 'hoda', 'salma', 'amina', 'zariyah', 'fatima', 'nour', 'reem', 'hala', 'zeina',
  'amany', 'rana', 'sana', 'aysha', 'iman', 'mouna', 'amal', 'noura', 'maryam', 'aisha',
  // Apple "Eloquence" voices and generic words
  'sandy', 'shelley', 'grandma', 'flo', 'female', 'femme', 'woman', 'girl',
]);
const MALE = new Set([
  'thomas', 'nicolas', 'henri', 'paul', 'claude', 'jacques', 'jean', 'remi', 'remy', 'mathieu', 'antoine', 'thierry',
  'gerard', 'fabrice', 'alain', 'jerome', 'maurice', 'yves', 'lucien',
  'alex', 'daniel', 'fred', 'rishi', 'tom', 'aaron', 'arthur', 'oliver', 'gordon', 'lee', 'ralph', 'albert', 'bruce',
  'junior', 'david', 'mark', 'george', 'guy', 'ryan', 'eric', 'christopher', 'william', 'matthew', 'joey', 'justin',
  'andrew', 'brian', 'roger', 'steffan', 'davis', 'tony', 'jason', 'jacob', 'evan', 'nathan', 'liam', 'james', 'elliot',
  'maged', 'majed', 'tarik', 'hamed', 'naayf', 'shakir', 'bassel', 'omar', 'hamdan', 'zayd',
  'rami', 'laith', 'taim', 'fahed', 'moaz', 'abdullah', 'ismael', 'jamal', 'ali', 'hedi', 'saleh',
  'reed', 'grandpa', 'rocko', 'eddy', 'male', 'homme', 'man', 'boy',
]);
/**
 * Voices that sound like a machine or a joke: the old Macintosh voices (Albert, Fred, Bad News,
 * Bubbles…) and Apple's "Eloquence" set (Eddy, Flo, Grandpa, Rocko…, also offered in French).
 * Their names tell a gender, so they used to be picked first by alphabetical order ("Eddy" before
 * "Thomas"). They are now kept for the case where the device has nothing else.
 */
const ROBOTIC = new Set([
  'albert', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'jester', 'organ', 'superstar', 'trinoids', 'whisper',
  'wobble', 'zarvox', 'junior', 'ralph', 'fred', 'kathy', 'princess', 'bruce', 'agnes', 'vicki', 'deranged',
  'hysterical', 'news', 'eloquence', 'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
]);
const tokensOf = (v: Pick<VoiceInfo, 'id' | 'name'>) => `${normalize(v.name)} ${normalize(v.id)}`.split(/[^a-z]+/).filter(Boolean);
/** True for a machine-like or joke voice (see ROBOTIC). */
export const isRobotic = (v: Pick<VoiceInfo, 'id' | 'name'>) => tokensOf(v).some((x) => ROBOTIC.has(x));
/** True for the better voices: Apple "Enhanced / Premium" and Siri, Microsoft "Natural", "Neural" voices. */
const isNatural = (v: VoiceInfo) => /enhanced|premium/i.test(v.quality ?? '') || /natural|neural|enhanced|premium|siri/i.test(`${v.name} ${v.id}`);

/** Whole names that are a known gender without a first name (browser voices). */
const FEMALE_NAMES = ['google francais', 'google us english', 'google espanol'];

/** Woman / man for a device voice, if its name tells. */
export function voiceGender(v: Pick<VoiceInfo, 'id' | 'name'>): VoiceGender | undefined {
  const name = normalize(v.name);
  if (FEMALE_NAMES.some((n) => name.startsWith(n))) return 'f';
  const tokens = tokensOf(v);
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

/**
 * How much higher a child's voice is, depending on the voice it starts from. Kept moderate: a
 * voice raised a lot sounds like a cartoon, not like a child. Families fine-tune it by ear with
 * "voice height" in Settings.
 */
const CHILD = {
  /** from a woman's voice */
  girl: 1.25,
  boy: 1.1,
  /** from the device's own voice (woman or man: unknown) */
  device: 1.3,
  /** from a man's voice, when the language has no woman's voice */
  girlFromMan: 1.6,
  boyFromMan: 1.45,
};
const clamp = (p: number) => Math.min(2, Math.max(0.5, +p.toFixed(2)));

export function chooseVoice(
  voices: VoiceInfo[],
  lang: Lang,
  tag: string,
  kind: VoiceKind,
  age: VoiceAge,
  explicitId?: string,
  /** Locale to prefer inside the language (the family's Arabic: ar-EG, ar-LB…), when a voice has it. */
  preferLocale?: string,
): VoiceChoice {
  const child = age === 'child';
  const prefix = tag.slice(0, 2).toLowerCase();
  const locale = (v: VoiceInfo) => v.language.toLowerCase().replace('_', '-');
  const forLang = voices.filter((v) => locale(v).startsWith(prefix));
  const local = (v: VoiceInfo) => !!preferLocale && locale(v) === preferLocale.toLowerCase();
  if (explicitId) {
    // A precise voice chosen by the family: raised according to what that voice is.
    const v = voices.find((x) => x.id === explicitId);
    const g = v ? voiceGender(v) : undefined;
    const up = !child ? 1 : g === 'm' ? (kind === 'f' ? CHILD.girlFromMan : CHILD.boyFromMan) : kind === 'm' ? CHILD.boy : kind === 'f' ? CHILD.girl : CHILD.device;
    return { id: explicitId, name: v?.name, pitch: clamp(up), exact: true };
  }
  // A natural voice first, then the right country; a machine-like voice only when there is nothing else.
  const score = (v: VoiceInfo) => (local(v) ? 8 : 0) + (isRobotic(v) ? -16 : 0) + (isNatural(v) ? 4 : 0) + (locale(v) === tag.toLowerCase() ? 2 : 0);
  if (kind === 'device') {
    // The device's default voice, unless it has a voice of the family's own dialect.
    const own = forLang.filter(local).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
    const up = child ? CHILD.device : 1;
    return own ? { id: own.id, name: own.name, pitch: clamp(up), exact: true } : { pitch: clamp(up), exact: true };
  }
  const best = (g: VoiceGender) => forLang.filter((v) => voiceGender(v) === g).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
  if (child) {
    // Girl or boy: a woman's voice, a little higher (see CHILD); a man's voice only without one.
    const woman = best('f');
    if (woman) return { id: woman.id, name: woman.name, pitch: clamp(kind === 'm' ? CHILD.boy : CHILD.girl), exact: true };
    const man = best('m');
    if (man) return { id: man.id, name: man.name, pitch: clamp(kind === 'm' ? CHILD.boyFromMan : CHILD.girlFromMan), exact: false };
    return { pitch: clamp(kind === 'm' ? 1.35 : 1.5), exact: false };
  }
  const match = best(kind);
  if (match) return { id: match.id, name: match.name, pitch: 1, exact: true };
  // No voice of that kind for this language: the default voice, pitched lower (man) or higher (woman).
  // French and English: a clearly lower pitch for a man (0.8 still sounded like a woman). Arabic keeps
  // the pitch it always had.
  const towards = kind === 'm' ? (lang !== 'ar' ? 0.7 : 0.8) : 1.2;
  return { pitch: clamp(towards), exact: false };
}

/**
 * The text handed to the device's voice. A capital letter on its own ("I") is announced by several
 * voices as "capital I"; the same letter in lower case is simply read, and sounds the same.
 * The length never changes, so the word-by-word highlight keeps its positions.
 */
export function forVoice(text: string): string {
  return /^\s*\p{Lu}\s*[.!?…,;:]*\s*$/u.test(text) ? text.toLowerCase() : text;
}
