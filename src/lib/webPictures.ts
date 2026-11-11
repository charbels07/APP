/**
 * Pictures from the internet for a word (the family's choice, stored locally):
 *  - pictograms from Global Symbols, limited to the collections whose licence was checked at the
 *    source and allows commercial use (Mulberry, OpenMoji): see docs/PICTOGRAM-LICENSES.md;
 *  - photos and drawings from Openverse, limited to licences that allow commercial use.
 * Both services are free, need no key and answer browsers (CORS).
 * Each result keeps its author and licence, shown under the word's picture.
 */
import type { Lang } from '../model/types';
import { saveMedia } from './media';

export type WebKind = 'symbols' | 'photos' | 'drawings';

export interface WebPicture {
  key: string;
  /** Small image for the results grid. */
  thumb: string;
  /** Image saved for the word. */
  full: string;
  title: string;
  /** "Mulberry Symbols — Creative Commons BY SA 4.0" */
  credit: string;
  ext: 'png' | 'jpg';
}

const ISO3: Record<Lang, string> = { fr: 'fra', en: 'eng', ar: 'ara' };
/** Global Symbols collections we may use (licence verified at the publisher, commercial use allowed). */
export const VERIFIED_SETS = new Set(['mulberry', 'openmoji']);
const hasArabic = (s: string) => /[؀-ۿ]/.test(s);

/** The service answered with an error (as opposed to no internet at all). */
export class ServiceError extends Error {}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new ServiceError(`HTTP ${res.status}`);
  return (await res.json()) as T;
}

interface GsLabel {
  text: string;
  picto?: { id: number; symbolset_id: number; image_url?: string };
}
interface GsSet {
  id: number;
  slug?: string;
  name: string;
  licence?: { name?: string };
}

let sets: Promise<Map<number, string>> | undefined;
/** Names and licences of the symbol sets — fetched once and shared, so never cancelled with one search. */
function symbolSetCredits(): Promise<Map<number, string>> {
  sets ??= getJson<GsSet[]>('https://globalsymbols.com/api/v1/symbolsets?per_page=300')
    // Only the verified collections are kept: a picture from any other set is never shown.
    .then((list) => new Map(list.filter((s) => s.slug && VERIFIED_SETS.has(s.slug)).map((s) => [s.id, [s.name, s.licence?.name].filter(Boolean).join(' — ')])))
    .catch(() => {
      sets = undefined;
      return new Map<number, string>();
    });
  return sets;
}

const LITTLE_WORDS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'un', 'une', 'à', 'au', 'aux', 'the', 'a', 'an', 'of', 'to']);

/**
 * Global Symbols matches whole labels: « bulles de savon » finds nothing, « bulles » finds 19.
 * So a phrase that finds nothing is retried with its main word, then that word in the singular.
 */
export function symbolQueries(q: string): string[] {
  const main = q
    .toLowerCase()
    .split(/[\s'’-]+/)
    .find((w) => w.length > 2 && !LITTLE_WORDS.has(w));
  const out = [q];
  if (main && main !== q.toLowerCase()) out.push(main);
  if (main && /[^s]s$/.test(main)) out.push(main.slice(0, -1));
  return out;
}

async function searchSymbols(q: string, lang: Lang, signal?: AbortSignal): Promise<WebPicture[]> {
  const language = hasArabic(q) ? 'ara' : ISO3[lang];
  const credits = symbolSetCredits();
  let labels: GsLabel[] = [];
  for (const query of symbolQueries(q)) {
    const url =
      `https://globalsymbols.com/api/v1/labels/search?query=${encodeURIComponent(query)}` +
      `&language=${language}&language_iso_format=639-3&limit=60`;
    labels = await getJson<GsLabel[]>(url, signal);
    if (labels.length) break;
  }
  return toPictures(labels, await credits);
}

function toPictures(labels: GsLabel[], credits: Map<number, string>): WebPicture[] {
  const seen = new Set<number>();
  const out: WebPicture[] = [];
  for (const l of labels) {
    const p = l.picto;
    // React Native's Image cannot show SVG: keep PNG / JPEG only.
    if (!p?.image_url || !/\.(png|jpe?g)$/i.test(p.image_url) || !credits.has(p.symbolset_id) || seen.has(p.id)) continue;
    seen.add(p.id);
    out.push({
      key: `gs${p.id}`,
      thumb: p.image_url,
      full: p.image_url,
      title: l.text,
      credit: credits.get(p.symbolset_id)!,
      ext: /\.png$/i.test(p.image_url) ? 'png' : 'jpg',
    });
  }
  // Sets whose licence allows commercial use first (stable order otherwise).
  const nc = (w: WebPicture) => (/\bNC\b/.test(w.credit) ? 1 : 0);
  return out.sort((a, b) => nc(a) - nc(b));
}

interface OvImage {
  id: string;
  title?: string;
  thumbnail: string;
  creator?: string;
  license: string;
  license_version?: string;
  provider?: string;
}

async function searchOpenverse(q: string, kind: 'photos' | 'drawings', signal?: AbortSignal): Promise<WebPicture[]> {
  const category = kind === 'photos' ? 'photograph' : 'illustration,digitized_artwork';
  const url =
    `https://api.openverse.org/v1/images/?q=${encodeURIComponent(q)}` +
    // 20 is the most Openverse gives without an account.
    `&page_size=20&license_type=commercial&mature=false&category=${category}`;
  const data = await getJson<{ results?: OvImage[] }>(url, signal);
  return (data.results ?? []).map((r) => {
    const licence = r.license === 'cc0' ? 'CC0' : r.license === 'pdm' ? 'Public Domain' : `CC ${r.license.toUpperCase()} ${r.license_version ?? ''}`.trim();
    return {
      key: `ov${r.id}`,
      // The thumbnail is served by Openverse itself (a few hundred pixels: plenty for a card).
      thumb: r.thumbnail,
      full: r.thumbnail,
      title: r.title ?? '',
      credit: [r.creator, licence, r.provider].filter(Boolean).join(' — '),
      ext: 'jpg',
    };
  });
}

export function searchWebPictures(q: string, kind: WebKind, lang: Lang, signal?: AbortSignal): Promise<WebPicture[]> {
  const query = q.trim();
  if (!query) return Promise.resolve([]);
  return kind === 'symbols' ? searchSymbols(query, lang, signal) : searchOpenverse(query, kind, signal);
}

/** Downloads the picture into the media store (works offline afterwards). */
export function saveWebPicture(p: WebPicture): Promise<string> {
  return saveMedia(p.full, p.ext);
}

/** A picture link pasted by the family. */
export function saveImageLink(url: string): Promise<string> {
  const ext = /\.png(\?|$)/i.test(url) ? 'png' : 'jpg';
  return saveMedia(url.trim(), ext);
}
