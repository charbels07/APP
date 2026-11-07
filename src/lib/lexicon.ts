import { ARASAAC_DEFAULTS } from '../data/arasaacMap';
import { BUILTIN_CONCEPTS } from '../data/concepts';
import type { CellDisplay, Concept, Lang, Profile, SymbolRef, WordClass } from '../model/types';

/** Resolves concepts through the profile (custom words + family overrides). */
export function getConcept(profile: Profile, id: string): Concept | undefined {
  return profile.customConcepts[id] ?? BUILTIN_CONCEPTS[id];
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
  const key = s.kind === 'arasaac' ? `a${s.id}` : s.kind === 'emoji' ? `e${s.value}` : `m${s.name}`;
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
    if (override.kind === 'arasaac' && profile.settings.symbolSet === 'emoji') {
      return { kind: 'emoji', value: getConcept(profile, id)?.emoji ?? '⬜' };
    }
    return override;
  }
  const c = getConcept(profile, id);
  if (profile.settings.symbolSet === 'arasaac' && ARASAAC_DEFAULTS[id]) {
    return { kind: 'arasaac', id: ARASAAC_DEFAULTS[id] };
  }
  return { kind: 'emoji', value: c?.emoji || '⬜' };
}

export function audioOf(profile: Profile, id: string, lang: Lang): string | undefined {
  return profile.overrides[id]?.audio?.[lang];
}

/** BCP-47 tag for speech synthesis. Lebanese Arabic falls back to an Arabic voice. */
export function speechTag(lang: Lang): string {
  return lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'ar-SA';
}

export const LANG_NAMES: Record<Lang, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'عربي (لبناني)',
};

export const isRtl = (lang: Lang) => lang === 'ar';
