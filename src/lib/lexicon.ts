import { SYMBOL_DEFAULTS } from '../data/symbolMap';
import { BUILTIN_CONCEPTS } from '../data/concepts';
import { conceptsFor, DIALECTS } from '../data/dialects';
import { LANGS, type CellDisplay, type Concept, type Lang, type Profile, type Settings, type SymbolRef, type WordClass } from '../model/types';

/**
 * Resolves concepts through the profile (custom words + family overrides). The Arabic words of
 * the built-in vocabulary are those of the dialect the family chose (settings.arabic).
 */
export function getConcept(profile: Profile, id: string): Concept | undefined {
  return profile.customConcepts[id] ?? conceptsFor(profile.settings.arabic)[id];
}

/** Communication languages the app offers for this child: no Arabic when the family chose "none". */
export function availableLangs(settings: Pick<Settings, 'arabic'>): Lang[] {
  return settings.arabic === 'none' ? LANGS.filter((l) => l !== 'ar') : LANGS;
}

export function allConceptIds(profile: Profile): string[] {
  return [...Object.keys(BUILTIN_CONCEPTS), ...Object.keys(profile.customConcepts)];
}

export function label(profile: Profile, id: string, lang: Lang): string {
  const override = profile.overrides[id]?.labels?.[lang];
  if (override) return override;
  const c = getConcept(profile, id);
  if (!c) return id;
  if (profile.settings.gender === 'f' && c.labelsF?.[lang]) return c.labelsF[lang]!;
  return c.labels[lang] || c.labels.fr || c.labels.en || id;
}

/** Default (non-gendered, non-overridden) label, used by the grammar engine. */
export function baseLabel(profile: Profile, id: string, lang: Lang): string {
  return getConcept(profile, id)?.labels[lang] ?? id;
}

export function hasOverrideLabel(profile: Profile, id: string, lang: Lang): boolean {
  return !!profile.overrides[id]?.labels?.[lang];
}

export function wordClass(profile: Profile, id: string): WordClass {
  return profile.overrides[id]?.cls ?? getConcept(profile, id)?.cls ?? 'noun';
}

export function display(profile: Profile, id: string): CellDisplay {
  return profile.overrides[id]?.display ?? 'both';
}

const symbolCache = new Map<string, SymbolRef>();
/** Returns a shared object per distinct symbol so memoised cells don't re-render. */
function intern(s: SymbolRef): SymbolRef {
  const key = s.kind === 'picto' ? `p${s.key}` : s.kind === 'emoji' ? `e${s.value}` : `m${s.name}`;
  let v = symbolCache.get(key);
  if (!v) symbolCache.set(key, (v = s));
  return v;
}

/** Symbol shown for a concept, honouring personal photos and the chosen symbol set. */
export function symbolOf(profile: Profile, id: string): SymbolRef {
  return intern(rawSymbolOf(profile, id));
}

function rawSymbolOf(profile: Profile, id: string): SymbolRef {
  const override = profile.overrides[id]?.symbol;
  if (override) {
    if (override.kind === 'picto' && profile.settings.symbolSet === 'emoji') {
      return { kind: 'emoji', value: getConcept(profile, id)?.emoji ?? '⬜' };
    }
    return override;
  }
  const c = getConcept(profile, id);
  if (profile.settings.symbolSet !== 'emoji' && SYMBOL_DEFAULTS[id]) {
    return { kind: 'picto', key: SYMBOL_DEFAULTS[id] };
  }
  return { kind: 'emoji', value: c?.emoji || '⬜' };
}

export function audioOf(profile: Profile, id: string, lang: Lang): string | undefined {
  return profile.overrides[id]?.audio?.[lang];
}

/**
 * BCP-47 tag for speech synthesis. Tablets rarely have a voice per Arabic dialect: Arabic asks
 * for the Standard (Saudi) voice, and lib/voices picks the dialect's own voice when one exists.
 */
export function speechTag(lang: Lang): string {
  return lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-SA';
}

/** Locale of the chosen Arabic (ar-EG, ar-LB…): the voice and the speech recognition to prefer. */
export function arabicLocale(settings: Pick<Settings, 'arabic'>): string {
  const d = settings.arabic;
  return DIALECTS[!d || d === 'none' ? 'lb' : d].locale;
}

/** Name of a communication language as shown to the family: « عربي (مصري) ». */
export function langName(settings: Pick<Settings, 'arabic'>, lang: Lang): string {
  if (lang === 'fr') return 'Français';
  if (lang === 'en') return 'English';
  const d = settings.arabic;
  return DIALECTS[!d || d === 'none' ? 'lb' : d].langName;
}

export const isRtl = (lang: Lang) => lang === 'ar';
