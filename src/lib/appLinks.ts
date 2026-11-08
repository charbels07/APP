/**
 * Pictograms that open other apps (YouTube, WhatsApp, Spotify, Anghami…).
 *
 * An app word opens its app when it is touched, and — if the family allows it —
 * when the sentence the child says mentions it: « je veux écouter de la musique »
 * opens Spotify because « musique » is one of Spotify's trigger words.
 */
import { Linking, Platform } from 'react-native';
import type { AppLink, Profile, StripItem } from '../model/types';
import { allConceptIds, getConcept, label } from './lexicon';
import { normalize } from './search';
import { LANGS } from '../model/types';

export function appLinkOf(profile: Profile, conceptId: string): AppLink | undefined {
  const o = profile.overrides[conceptId]?.app;
  if (o === false) return undefined;
  return o ?? getConcept(profile, conceptId)?.app;
}

/** Ready-made links offered when the family turns a word into an app. */
export const APP_PRESETS: { name: string; url: string }[] = [
  { name: 'YouTube', url: 'https://www.youtube.com/' },
  { name: 'YouTube Kids', url: 'https://www.youtubekids.com/' },
  { name: 'WhatsApp', url: 'https://wa.me/' },
  { name: 'Spotify', url: 'https://open.spotify.com/' },
  { name: 'Anghami', url: 'https://play.anghami.com/' },
  { name: 'Netflix', url: 'https://www.netflix.com/' },
];

/** "wa.me/961…" → "https://wa.me/961…"; keeps app schemes ("spotify:") as they are. */
export function cleanUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(u)) return u;
  return `https://${u}`;
}

/** A WhatsApp link needs the person's number: "https://wa.me/" alone opens nothing useful. */
export function isIncomplete(link: AppLink | undefined): boolean {
  if (!link) return true;
  const u = cleanUrl(link.url);
  return !u || /^https?:\/\/(wa\.me|api\.whatsapp\.com)\/?$/i.test(u);
}

/**
 * In a browser this must run inside the tap itself: browsers block new windows that are
 * not opened right after a tap (Safari / iPhone / iPad allow about 1 second, Chrome 5).
 * Returns false when the browser refused (pop-up blocked, or a frame that forbids pop-ups).
 */
export async function openAppUrl(url: string): Promise<boolean> {
  const target = cleanUrl(url);
  if (Platform.OS === 'web') {
    // Called synchronously (no await before this line), so it still counts as the tap.
    const w = typeof window !== 'undefined' ? window.open(target, '_blank') : null;
    if (!w) return false;
    try {
      w.opener = null;
    } catch {
      /* cross-origin already */
    }
    return true;
  }
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    return false;
  }
}

/** Devices open apps by themselves after the countdown; browsers need one more tap (see openAppUrl). */
export const APPS_NEED_TAP = Platform.OS === 'web';

const words = (text: string) => normalize(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Same rule as the situation library: 5+ letters match the start of a word, shorter ones the whole word. */
const stemMatches = (stem: string, word: string) => (stem.length >= 5 ? word.startsWith(stem) : word === stem);

/**
 * The app the sentence asks for, if any. Naming the app itself (its pictogram,
 * or « YouTube » typed) wins over a trigger word (« vidéo »).
 */
export function findAppInSentence(profile: Profile, items: StripItem[]): string | undefined {
  const apps = allConceptIds(profile).filter((id) => appLinkOf(profile, id));
  if (!apps.length) return undefined;
  const said: string[] = [];
  for (const it of items) {
    if (it.kind === 'concept') {
      if (apps.includes(it.concept)) return it.concept;
      for (const l of LANGS) said.push(...words(label(profile, it.concept, l)));
    } else said.push(...words(it.text));
  }
  let best: string | undefined;
  let bestScore = 0;
  for (const id of apps) {
    const link = appLinkOf(profile, id)!;
    const names = LANGS.map((l) => label(profile, id, l));
    for (const phrase of [...names, ...link.triggers]) {
      const stems = words(phrase);
      if (!stems.length || !stems.every((st) => said.some((w) => stemMatches(st, w)))) continue;
      const score = (names.includes(phrase) ? 1000 : 0) + stems.join('').length;
      if (score > bestScore) {
        best = id;
        bestScore = score;
      }
    }
  }
  return best;
}
