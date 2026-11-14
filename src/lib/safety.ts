/**
 * Small guards for data that can come from someone else: a profile synchronised from the
 * server (another team member edited it), a shared material, an imported file, a proposal.
 * The database refuses what it can; these make sure the app itself never trusts such data
 * with a link, a file name or a piece of page.
 */

/** Names that change how an object behaves in JavaScript: never accepted as an identifier. */
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
export const badKey = (k: unknown) => typeof k !== 'string' || BAD_KEYS.has(k);

/** A copy of a dictionary without those names (and always a plain object). */
export function plain<T>(o: Record<string, T> | undefined | null): Record<string, T> {
  const out: Record<string, T> = {};
  if (!o || typeof o !== 'object') return out;
  for (const k of Object.keys(o)) if (!BAD_KEYS.has(k)) out[k] = o[k];
  return out;
}

/** A whole number between two limits (a board's rows and columns end up in a printed page). */
export function intBetween(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

/**
 * What a card may open: a web page (https) or one of the apps families use to call, write,
 * listen and watch. Everything else is refused, in particular "javascript:" (it would run
 * code inside the app's page), "data:", "file:" and "intent:".
 */
const APP_SCHEMES = new Set([
  'tel', 'sms', 'mailto', 'facetime', 'facetime-audio', 'whatsapp', 'tg', 'viber', 'skype', 'zoomus', 'msteams',
  'spotify', 'anghami', 'music', 'deezer', 'youtube', 'vnd.youtube', 'youtubekids', 'netflix', 'nflx', 'shahid',
  'maps', 'geo', 'comgooglemaps',
]);
const WEB_ADDRESS = /^https:\/\/([\p{L}\p{N}-]+\.)+[\p{L}\p{N}-]{2,}(:\d{1,5})?([/?#]\S*)?$/u;

/** The link as it will be opened, or '' when it is not one of the accepted kinds. */
export function safeLink(url: unknown): string {
  if (typeof url !== 'string') return '';
  // Browsers ignore tabs and line breaks inside an address ("java\nscript:"): so do we, before looking.
  const u = url.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  if (!u || u.length > 2000) return '';
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(u)?.[1].toLowerCase();
  if (!scheme) return WEB_ADDRESS.test(`https://${u}`) ? `https://${u}` : '';
  if (scheme === 'http' || scheme === 'https') {
    const web = `https:${u.slice(scheme.length + 1)}`;
    return WEB_ADDRESS.test(web) ? web : '';
  }
  return APP_SCHEMES.has(scheme) ? u : '';
}

/** "youtube.com" for a web link, "spotify" for an app link: shown before the link is opened. */
export function linkTarget(url: string): string {
  const u = safeLink(url);
  const web = /^https:\/\/([^/?#:]+)/.exec(u)?.[1];
  if (web) return web.replace(/^www\./, '');
  return /^([a-z][a-z0-9+.-]*):/i.exec(u)?.[1].toLowerCase() ?? '';
}

/** A name of a stored file (photo, recording): letters, digits, dot, dash, underscore — never a path. */
export const safeFileName = (name: unknown): name is string => typeof name === 'string' && /^[\w.-]{1,120}$/.test(name) && !name.includes('..');

/** A cell of a table opened in a spreadsheet must not start like a formula. */
export const csvSafe = (v: string) => (/^[=+\-@\t\r]/.test(v) ? `'${v}` : v);
