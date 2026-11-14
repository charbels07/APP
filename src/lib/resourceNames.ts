/**
 * The name a professional's material carries in the library. No name is asked when a material
 * is made: it is called by what it contains (the activity board's own name, the sequence's name,
 * the two pictures of a First / Then, the first cards). A name typed in an older version is kept.
 */
import type { Resource, ResourceData, ResourceKind } from '../backend/types';
import { proStrings } from '../i18n/pro';
import type { Profile, UiLang } from '../model/types';
import { label } from './lexicon';
import { sandboxFor } from './resources';

/** What the material contains, as a name ('' when it is still empty). */
export function materialTitle(kind: ResourceKind, data: ResourceData, sandbox: Profile | undefined, lang: UiLang): string {
  const words = sandbox ?? sandboxFor(kind, data);
  const say = (id?: string) => (id ? label(words, id, lang) : '');
  if (kind === 'tla') return say(data.boards[0]?.concept);
  if (kind === 'schedule') return data.schedules[0] ? data.schedules[0].title || say(data.schedules[0].concept) : '';
  if (kind === 'firstThen') return [say(data.firstThen?.first), say(data.firstThen?.then)].filter(Boolean).join(' → ');
  if (kind === 'timer') return data.timer ? `${data.timer.minutes} min` : '';
  if (kind === 'cards') return (data.cards ?? []).slice(0, 3).map(say).filter(Boolean).join(', ') + ((data.cards?.length ?? 0) > 3 ? '…' : '');
  return '';
}

/** Words that are not a real name: "Untitled" and the kind labels, in the three languages. */
const NO_NAME = new Set(
  (['fr', 'en', 'ar'] as UiLang[]).flatMap((l) => {
    const d = proStrings(l);
    return [d.untitled, ...Object.values(d.kinds)].map((w) => w.toLocaleLowerCase());
  }),
);

/** Was this name really given by someone (not "Untitled", not just the kind of material)? */
export function isRealName(title: string | undefined): boolean {
  const given = (title ?? '').trim();
  return !!given && !NO_NAME.has(given.toLocaleLowerCase());
}

/** The name shown for a material: the one it was given, or else what it contains. */
export function resourceName(r: Pick<Resource, 'kind' | 'title' | 'data'>, lang: UiLang): string {
  if (isRealName(r.title)) return r.title.trim();
  return materialTitle(r.kind, r.data, undefined, lang) || proStrings(lang).kinds[r.kind];
}

/**
 * Does the stored name simply follow the content (so it should keep following it when the content
 * is renamed)? True for "Untitled" and for a name equal to what the material contains, in any language.
 */
export function followsContent(r: Pick<Resource, 'kind' | 'title' | 'data'>): boolean {
  if (!isRealName(r.title)) return true;
  const given = r.title.trim();
  return (['fr', 'en', 'ar'] as UiLang[]).some((l) => materialTitle(r.kind, r.data, undefined, l) === given);
}
