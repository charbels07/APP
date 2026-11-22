/**
 * A child's photos and recordings, copied through the account (the pure part: which names travel,
 * what to send, what to fetch, when to try again). The files themselves move in
 * `src/state/mediaSync.ts`; the server's rules are in `supabase/migrations/20261118000300_media_sync.sql`.
 *
 * A file keeps the name the app gave it everywhere (`1762000000000_ab12cd.jpg`; a recording can
 * carry its start and stop moments: `….t120-980.m4a`), on every device and in the account
 * (`profile-media/<profile id>/<name>`), so the profile never changes when a file travels.
 * Nothing here touches a file or the network: only names and numbers, so it can be tested.
 */

/** Every name the app gives a photo or a recording (any extension): what `mediaNamesIn` looks for. */
const ANY_MEDIA = /\b\d{13}_[a-z0-9]{6}(?:\.t\d+-\d+)?\.[a-z0-9]{2,4}\b/g;

/** The photos and recordings a profile uses (anywhere in it: words, folders, pictures of boards). */
export function mediaNamesIn(profile: unknown): string[] {
  return [...new Set(JSON.stringify(profile ?? null).match(ANY_MEDIA) ?? [])];
}

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
};

/** The exact shape the account accepts (the same rule as `media_name_ok` in the database). */
const SYNCED = /^\d{13}_[a-z0-9]{6}(?:\.t\d{1,7}-\d{1,7})?\.(jpg|jpeg|png|webp|m4a|aac|mp4|wav|webm|mp3)$/;

/** A photo or a recording that can be copied to the account (never a path, never another kind of file). */
export const isSyncable = (name: string): boolean => SYNCED.test(name);

export type MediaKind = 'image' | 'audio';

export function mediaKind(name: string): MediaKind | undefined {
  const type = mimeOf(name);
  return type?.startsWith('image/') ? 'image' : type?.startsWith('audio/') ? 'audio' : undefined;
}

/** The kind of file sent with it (`audio/mp4` for a tablet's recording, `audio/wav` for a browser's). */
export function mimeOf(name: string): string | undefined {
  return MIME[name.split('.').pop()?.toLowerCase() ?? ''];
}

/** What the account accepts (the database checks it again): one file, and all the files of one child. */
export const MEDIA_LIMITS = {
  image: 2 * 1024 * 1024,
  audio: 3 * 1024 * 1024,
  files: 1500,
  bytes: 150 * 1024 * 1024,
} as const;

/** A photo travels small: about 200 KB, its longest side 1024 px at most (JPEG). */
export const PHOTO_TARGET = { bytes: 200 * 1024, side: 1024 } as const;

/** Size of a picture whose longest side becomes `max` at most (the other side follows). */
export function fitSide(width: number, height: number, max: number = PHOTO_TARGET.side): { width: number; height: number } {
  const big = Math.max(width, height);
  if (!(big > max)) return { width, height };
  const k = max / big;
  return { width: Math.max(1, Math.round(width * k)), height: Math.max(1, Math.round(height * k)) };
}

/**
 * What this device knows about the copies of one child's files (kept with the device copy of the
 * profile: `caa.media.<profile id>`, erased with it).
 */
export interface MediaBook {
  v: 1;
  /** On the account (sent from here, received from there, or seen in the account's list). */
  sent: string[];
  /** Received from the account (not made here): they leave this device with the child's copy. */
  received: string[];
  /** Copies in the account to remove (replaced or removed here by a manager). */
  remove: string[];
  /** Refused by the account for good (too big, wrong kind): not tried again. */
  refused: string[];
  /** After a failure: how many in a row, and not before when. */
  retry: Record<string, { n: number; at: number }>;
  /** The child's space in the account is full: sending waits until then. */
  fullUntil?: number;
  /** Too many files sent today: sending waits until then. */
  pauseUntil?: number;
  /** Last time the account's list was read (it corrects what this device believes). */
  checkedAt?: number;
}

export const emptyBook = (): MediaBook => ({ v: 1, sent: [], received: [], remove: [], refused: [], retry: {} });

/** A book read back from the device (anything unexpected is dropped). */
export function readBook(raw: unknown): MediaBook {
  const b = (raw && typeof raw === 'object' ? raw : {}) as Partial<MediaBook>;
  const names = (v: unknown) => (Array.isArray(v) ? [...new Set(v.filter((n): n is string => typeof n === 'string' && isSyncable(n)))] : []);
  const retry: MediaBook['retry'] = {};
  if (b.retry && typeof b.retry === 'object') {
    for (const [k, r] of Object.entries(b.retry)) {
      if (isSyncable(k) && r && Number.isFinite(r.n) && Number.isFinite(r.at)) retry[k] = { n: r.n, at: r.at };
    }
  }
  const time = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  return {
    v: 1,
    sent: names(b.sent),
    received: names(b.received),
    // Removals are decided again at each sweep, with the database's answer (never from an older list).
    remove: [],
    refused: names(b.refused),
    retry,
    fullUntil: time(b.fullUntil),
    pauseUntil: time(b.pauseUntil),
    checkedAt: time(b.checkedAt),
  };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** The account's list is read again after this long (at board open). */
export const CHECK_EVERY = 12 * HOUR;
/**
 * A file in the account that no word uses any more is removed after this long (managers only), and
 * only when the database says that nothing else uses it either (`media_in_use`: the earlier
 * versions of the board, the last 30 days of its history, proposals waiting): "Undo", "Earlier
 * versions" and the bins never point to a file that is gone.
 */
export const ORPHAN_AFTER = 30 * 24 * HOUR;
/** No space left / too many sent today: sending waits this long before trying again. */
export const FULL_WAIT = 6 * HOUR;

/** Waiting time after the n-th failure in a row: 30 s, 1 min, 2 min… never more than an hour. */
export const backoff = (n: number): number => Math.min(HOUR, 30_000 * 2 ** Math.max(0, n - 1));

export const isDue = (book: MediaBook, name: string, now: number): boolean => !((book.retry[name]?.at ?? 0) > now);

/** One more failure for this name. */
export function failed(book: MediaBook, name: string, now: number): MediaBook {
  const n = (book.retry[name]?.n ?? 0) + 1;
  return { ...book, retry: { ...book.retry, [name]: { n, at: now + backoff(n) } } };
}

const add = (list: string[], name: string) => (list.includes(name) ? list : [...list, name]);
const without = (list: string[], name: string) => list.filter((n) => n !== name);
const dropRetry = (retry: MediaBook['retry'], name: string) => {
  if (!(name in retry)) return retry;
  const { [name]: _gone, ...rest } = retry;
  return rest;
};

/** The file is in the account now (sent from here, or `received` from there). */
export function markSent(book: MediaBook, name: string, received = false): MediaBook {
  return {
    ...book,
    sent: add(book.sent, name),
    received: received ? add(book.received, name) : book.received,
    retry: dropRetry(book.retry, name),
  };
}

/** The account refused the file for good (too big, wrong kind). */
export function markRefused(book: MediaBook, name: string): MediaBook {
  return { ...book, refused: add(book.refused, name), retry: dropRetry(book.retry, name) };
}

/** The copy in the account was removed (or there was none). */
export function markRemoved(book: MediaBook, name: string): MediaBook {
  return { ...book, remove: without(book.remove, name), sent: without(book.sent, name), retry: dropRetry(book.retry, name) };
}

/** What to do now, and how many files still wait. */
export interface MediaPlan {
  /** Here, not in the account yet, and due. */
  send: string[];
  /** In the profile, missing here, and due. */
  fetch: string[];
  /** Copies in the account to remove, due. */
  remove: string[];
  /** Here and not in the account yet (due or not). */
  waitingSend: number;
  /** Missing here (due or not). */
  waitingFetch: number;
}

/**
 * `used`: the names the profile uses; `here`: the ones this device has. `canSend`: this person may
 * change the board (a use-only tablet keeps its own files); `canRemove`: a manager (or not known yet).
 */
export function planMedia(
  book: MediaBook,
  used: string[],
  here: (name: string) => boolean,
  now: number,
  opts: { canSend: boolean; canRemove: boolean },
): MediaPlan {
  const sent = new Set(book.sent);
  const refused = new Set(book.refused);
  const plan: MediaPlan = { send: [], fetch: [], remove: [], waitingSend: 0, waitingFetch: 0 };
  const holding = (book.fullUntil ?? 0) > now || (book.pauseUntil ?? 0) > now;
  for (const name of used) {
    if (!isSyncable(name) || refused.has(name)) continue;
    if (here(name)) {
      if (sent.has(name)) continue;
      plan.waitingSend++;
      if (opts.canSend && !holding && isDue(book, name, now)) plan.send.push(name);
    } else {
      plan.waitingFetch++;
      if (isDue(book, name, now)) plan.fetch.push(name);
    }
  }
  if (opts.canRemove) {
    const inUse = new Set(used);
    plan.remove = book.remove.filter((n) => !inUse.has(n) && isDue(book, n, now));
  }
  return plan;
}

/** The next moment something is due again (a timer is set for it), or undefined. */
export function nextDue(book: MediaBook, now: number): number | undefined {
  const times = Object.values(book.retry)
    .map((r) => r.at)
    .concat([book.fullUntil ?? 0, book.pauseUntil ?? 0])
    .filter((t) => t > now);
  return times.length ? Math.min(...times) : undefined;
}

/** The syncable names a change removed from the profile (a picture replaced, a recording erased). */
export function removedNames(before: unknown, after: unknown): string[] {
  const still = new Set(mediaNamesIn(after));
  return mediaNamesIn(before).filter((n) => isSyncable(n) && !still.has(n));
}

/**
 * A change made here removed some names: copies received from the account are no longer needed
 * here (they come back from the account if an "Undo" uses them again). The account's copies stay:
 * they leave only through the sweep of `afterList`, 30 days later at the earliest.
 */
export function afterRemoval(book: MediaBook, gone: string[]): { book: MediaBook; eraseHere: string[] } {
  let next = book;
  const eraseHere: string[] = [];
  for (const name of gone) {
    if (next.received.includes(name)) {
      eraseHere.push(name);
      next = { ...next, received: without(next.received, name) };
    }
    next = { ...next, refused: without(next.refused, name), retry: dropRetry(next.retry, name) };
  }
  return { book: next, eraseHere };
}

/**
 * The profile changed (someone else's change, or opened): received copies that no word uses any
 * more leave this device; what waited for names no longer used is forgotten.
 */
export function prune(book: MediaBook, used: string[]): { book: MediaBook; eraseHere: string[] } {
  const inUse = new Set(used);
  const eraseHere = book.received.filter((n) => !inUse.has(n));
  const retry: MediaBook['retry'] = {};
  for (const [k, r] of Object.entries(book.retry)) if (inUse.has(k) || book.remove.includes(k)) retry[k] = r;
  return {
    book: {
      ...book,
      received: book.received.filter((n) => inUse.has(n)),
      refused: book.refused.filter((n) => inUse.has(n)),
      // A name used again (an undo) keeps its copy in the account.
      remove: book.remove.filter((n) => !inUse.has(n)),
      retry,
    },
    eraseHere,
  };
}

export interface ServerFile {
  name: string;
  size: number;
  createdAt: number;
}

/**
 * The account's list was read: it says what is really there. Names that are there are not sent
 * again (and missing ones are fetched at once); names believed sent but missing are sent again.
 * A manager's device also lists the old files that nothing uses any more (`sweep`): not the
 * profile, and not what the database still points to (`serverUsed`: earlier versions, recent
 * history, proposals waiting); kept for `ORPHAN_AFTER` first. Without the database's list (not
 * known, or a database not updated yet) nothing is swept.
 */
export function afterList(
  book: MediaBook,
  files: ServerFile[],
  used: string[],
  now: number,
  canRemove: boolean,
  serverUsed?: string[] | null,
): { book: MediaBook; sweep: string[] } {
  const there = new Set(files.map((f) => f.name).filter(isSyncable));
  const inUse = new Set([...used, ...(serverUsed ?? [])]);
  if (!serverUsed) canRemove = false;
  const retry: MediaBook['retry'] = {};
  // A name that failed because the account did not have it yet is tried again at once now that it does.
  for (const [k, r] of Object.entries(book.retry)) if (!there.has(k)) retry[k] = r;
  const sweep = canRemove
    ? files
        // (a file whose date is unknown is never removed)
        .filter((f) => isSyncable(f.name) && !inUse.has(f.name) && f.createdAt > 0 && now - f.createdAt > ORPHAN_AFTER && !book.remove.includes(f.name))
        .map((f) => f.name)
    : [];
  return {
    // (a name waiting to be removed that something uses again is kept)
    book: { ...book, sent: [...there], retry, checkedAt: now, remove: [...book.remove.filter((n) => there.has(n) && !inUse.has(n)), ...sweep] },
    sweep,
  };
}
