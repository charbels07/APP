/**
 * Choosing the synthetic voice: woman or man, adult or child (Settings → Voice).
 *
 * Devices don't say whether a voice is male or female, so voices are recognised by
 * name: Apple, Google and Microsoft voices have known names (Thomas, Amélie, Samantha,
 * Maged…), and Siri voices carry "male"/"female" in their identifier.
 * Tablets have no real child voices. The girl's voice is a woman's voice of the language, higher.
 * The boy's voice is brought as near as a device voice can be to the young voice the owner chose
 * by ear (Azure's "Dustin" raised 8 %). Measured on the same sentences: Dustin about 160–190 Hz,
 * ordinary men's voices 100–140 Hz, women's about 190–200 Hz. So the boy is a man's voice raised
 * by about 40 % (`BOY_HZ` / the voice's own height when it is known), and, on a device with no
 * man's voice for the language, a woman's voice a little LOWER (raised, as before, it came out
 * near 215 Hz and was judged odd): the other woman's voice of the same country when there are two.
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
  'yvette', 'charline', 'aude', 'caroline', 'hortence',
  // English
  'samantha', 'karen', 'moira', 'tessa', 'victoria', 'allison', 'ava', 'susan', 'zoe', 'fiona', 'veena', 'serena',
  'kate', 'nicky', 'martha', 'catherine', 'kathy', 'vicki', 'princess', 'zira', 'hazel', 'heather', 'linda', 'aria',
  'jenny', 'emma', 'libby', 'sonia', 'natasha', 'clara', 'joanna', 'salli', 'kimberly', 'ivy', 'kendra', 'amy',
  'michelle', 'jane', 'nancy', 'sara', 'ana', 'ashley', 'cora', 'elizabeth', 'amber', 'monica', 'agnes',
  'stephanie', 'matilda', 'isha', 'sangeeta', 'tara', 'joelle', 'heera', 'neerja', 'hayley', 'emily', 'leah', 'molly', 'luna',
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
  'jamie', 'aman', 'ravi', 'sean', 'richard', 'luke', 'connor', 'mitchell', 'prabhat',
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

/**
 * Android's own voices have no first name, only a code ("fr-fr-x-frd-local", "en-us-x-iom-network").
 * Woman / man for each code, from the public list of device voices kept by the Readium project
 * (github.com/readium/speech, json/fr.json and en.json, November 2026).
 */
const ANDROID_MEN = new Set(['frb', 'frd', 'cab', 'cad', 'iol', 'iom', 'tpd', 'rjs', 'gbb', 'gbd', 'aub', 'aud', 'end', 'ene']);
const ANDROID_WOMEN = new Set(['fra', 'frc', 'vlf', 'caa', 'cac', 'iob', 'iog', 'tpc', 'tpf', 'sfg', 'gba', 'gbc', 'gbg', 'aua', 'auc', 'ena', 'enc']);
const androidCode = (v: Pick<VoiceInfo, 'id' | 'name'>) => /\b[a-z]{2}-[a-z]{2}-x-([a-z]{3})\b/.exec(`${v.id} ${v.name}`.toLowerCase())?.[1];

/** Whole names that are a known gender without a first name (browser voices). */
const FEMALE_NAMES = ['google francais', 'google us english', 'google espanol'];

/** Woman / man for a device voice, if its name tells. */
export function voiceGender(v: Pick<VoiceInfo, 'id' | 'name'>): VoiceGender | undefined {
  const name = normalize(v.name);
  if (FEMALE_NAMES.some((n) => name.startsWith(n))) return 'f';
  const code = androidCode(v);
  if (code && ANDROID_MEN.has(code)) return 'm';
  if (code && ANDROID_WOMEN.has(code)) return 'f';
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
  /** the girl, from a woman's voice */
  girl: 1.4,
  /** the boy without a man's voice: a woman's voice a little lower, the height of "Dustin" */
  boy: 0.9,
  boyOwnVoice: 0.9,
  /** from the device's own voice (woman or man: unknown) */
  device: 1.3,
  /** the boy, from a man's voice whose own height is not known (see boyPitch) */
  boyFromMan: 1.4,
  /** the girl from a man's voice, when the language has no woman's voice */
  girlFromMan: 1.65,
  /** no named voice at all for the language */
  girlUnknown: 1.45,
  /** devices' default voices are women's: about the same height as the boy from a woman's voice */
  boyUnknown: 0.95,
};

/** The height aimed at for the boy: the young voice chosen by the owner ("Dustin" + 8 %). */
const BOY_HZ = 170;
/**
 * Own height (Hz) of the men's voices that Edge offers ("… Online (Natural)": the same voices as
 * Azure's, measured there on the same sentences as Dustin). Other men's voices (Apple, Google,
 * Windows) could not be measured: they get the average.
 */
const MEN_HZ: Record<string, number> = {
  henri: 122, remy: 97, gerard: 129, fabrice: 155, antoine: 110, jean: 139, thierry: 137,
  guy: 160, eric: 117, steffan: 119, christopher: 121, roger: 139, andrew: 128, brian: 129, ryan: 129,
  thomas: 122, william: 110, liam: 92, connor: 165,
};
/** How much a man's voice is raised to become the boy's. */
function boyPitch(v: Pick<VoiceInfo, 'id' | 'name'>): number {
  if (!/online \(natural\)/i.test(v.name)) return CHILD.boyFromMan;
  const hz = tokensOf(v).map((t) => MEN_HZ[t]).find(Boolean);
  return hz ? Math.min(1.6, Math.max(1, +(BOY_HZ / hz).toFixed(2))) : CHILD.boyFromMan;
}

/**
 * The four voices a family chooses from (owner's decision, November 2026): a woman, a man, a girl
 * or a boy, all made from the device's own voices, in every language. Nothing else is offered
 * (no "device voice", no height, no precise voice).
 */
export type VoiceOption = 'woman' | 'man' | 'girl' | 'boy';
type VoiceSettings = { voiceKind?: VoiceKind; voiceAge?: VoiceAge; gender?: string };

/** Female or male. A profile left on "device voice" (older versions, the default) follows the child's gender. */
export function plainKind(settings: VoiceSettings): VoiceGender {
  return settings.voiceKind === 'f' || settings.voiceKind === 'm' ? settings.voiceKind : settings.gender === 'f' ? 'f' : 'm';
}
export function voiceOption(settings: VoiceSettings): VoiceOption {
  const f = plainKind(settings) === 'f';
  return settings.voiceAge === 'child' ? (f ? 'girl' : 'boy') : f ? 'woman' : 'man';
}
export function optionParts(o: VoiceOption): { voiceKind: VoiceGender; voiceAge: VoiceAge } {
  return { voiceKind: o === 'woman' || o === 'girl' ? 'f' : 'm', voiceAge: o === 'girl' || o === 'boy' ? 'child' : 'adult' };
}
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
    const up = !child ? 1 : g === 'm' ? (kind === 'f' ? CHILD.girlFromMan : boyPitch(v!)) : kind === 'm' ? CHILD.boy : kind === 'f' ? CHILD.girl : CHILD.device;
    return { id: explicitId, name: v?.name, pitch: clamp(up), exact: true };
  }
  // A natural voice first, then the right country; a machine-like voice only when there is nothing else.
  // Chrome's "Google …" voices cannot be made higher or lower: for a child's voice, another
  // voice of the device comes first when there is one.
  const fixedHeight = (v: VoiceInfo) => child && /^google /i.test(v.name);
  const score = (v: VoiceInfo) =>
    (local(v) ? 8 : 0) + (isRobotic(v) ? -16 : 0) + (fixedHeight(v) ? -6 : 0) + (isNatural(v) ? 4 : 0) + (locale(v) === tag.toLowerCase() ? 2 : 0);
  if (kind === 'device') {
    // The device's default voice, unless it has a voice of the family's own dialect.
    const own = forLang.filter(local).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name))[0];
    const up = child ? CHILD.device : 1;
    return own ? { id: own.id, name: own.name, pitch: clamp(up), exact: true } : { pitch: clamp(up), exact: true };
  }
  const ranked = (g: VoiceGender) => forLang.filter((v) => voiceGender(v) === g).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  const best = (g: VoiceGender): VoiceInfo | undefined => ranked(g)[0];
  if (child) {
    // The girl: a woman's voice, higher. The boy: a man's voice a little higher (see CHILD).
    const women = ranked('f');
    const woman = women[0];
    if (woman && kind === 'f') return { id: woman.id, name: woman.name, pitch: clamp(CHILD.girl), exact: true };
    const youngMan = kind === 'm' ? ranked('m').find((v) => !isRobotic(v)) : undefined;
    if (youngMan) return { id: youngMan.id, name: youngMan.name, pitch: clamp(boyPitch(youngMan)), exact: true };
    if (woman) {
      // The boy without a man's voice: another woman's voice of the same country when the device has
      // one (never a machine-like one, never another accent); otherwise the girl's voice, clearly lower.
      const own = women.find((v) => v.id !== woman.id && locale(v) === locale(woman) && !isRobotic(v));
      const v = own ?? woman;
      return { id: v.id, name: v.name, pitch: clamp(own ? CHILD.boyOwnVoice : CHILD.boy), exact: true };
    }
    const man = best('m');
    if (man) return { id: man.id, name: man.name, pitch: clamp(kind === 'm' ? boyPitch(man) : CHILD.girlFromMan), exact: kind === 'm' };
    return { pitch: clamp(kind === 'm' ? CHILD.boyUnknown : CHILD.girlUnknown), exact: false };
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
