/**
 * A photo or a recording that a board stops using (a picture replaced, a recording removed, a
 * child's profile deleted, "Reset") is not erased at once: "Undo", the earlier versions of the
 * board and the bins point to it for 30 days. This device keeps a list of such files with the day
 * after which they may go (`caa.mediaLater`); when a board opens, the ones whose day has passed and
 * that no copy of a profile on this device uses any more are erased.
 *
 * The account's copies follow the same rule, decided by the database (`media_in_use`, migration
 * `20261122000200_gap_batch5.sql`): see `afterList` in `mediaPlan.ts`.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteMedia } from './media';
import { mediaNamesIn } from './mediaPlan';

const DAY = 24 * 60 * 60 * 1000;
/** How long a file no board uses stays on the device and in the account. */
export const KEEP_MEDIA = 30 * DAY;
export const LATER_KEY = 'caa.mediaLater';

/** Name → the moment after which it may be erased. */
export type Later = Record<string, number>;

const NAME = /^\d{13}_[a-z0-9]{6}(?:\.t\d+-\d+)?\.[a-z0-9]{2,4}$/;

/** These files stopped being used now: they wait `KEEP_MEDIA` (a later stop starts the wait again). */
export function addLater(list: Later, names: string[], now: number): Later {
  const next = { ...list };
  for (const n of names) if (NAME.test(n)) next[n] = now + KEEP_MEDIA;
  return next;
}

/**
 * What may be erased now: waited long enough and used by no profile kept here. A name used again
 * (an undo) leaves the list: it is added again if it stops being used once more.
 */
export function dueLater(list: Later, now: number, used: Set<string>): { erase: string[]; list: Later } {
  const keep: Later = {};
  const erase: string[] = [];
  for (const [name, at] of Object.entries(list)) {
    if (used.has(name) || !NAME.test(name) || typeof at !== 'number' || !Number.isFinite(at)) continue;
    if (at <= now) erase.push(name);
    else keep[name] = at;
  }
  return { erase, list: keep };
}

export function readLater(raw: string | null): Later {
  try {
    const v = JSON.parse(raw ?? '{}');
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: Later = {};
    for (const [k, t] of Object.entries(v)) if (NAME.test(k) && typeof t === 'number' && Number.isFinite(t)) out[k] = t;
    return out;
  } catch {
    return {};
  }
}

// One change of the list at a time.
let chain: Promise<unknown> = Promise.resolve();
const queue = <T,>(fn: () => Promise<T>): Promise<T> => {
  const p = chain.then(fn, fn);
  chain = p.catch(() => {});
  return p;
};

/** These files are no longer used by the board that used them: erased in 30 days if nothing uses them then. */
export function eraseLater(names: string[], now = Date.now()): Promise<void> {
  if (!names.length) return Promise.resolve();
  return queue(async () => {
    const list = readLater(await AsyncStorage.getItem(LATER_KEY).catch(() => null));
    await AsyncStorage.setItem(LATER_KEY, JSON.stringify(addLater(list, names, now))).catch(() => {});
  });
}

/** Every photo and recording a copy kept on this device uses (boards, earlier copies, a set-up being typed). */
async function usedOnDevice(): Promise<Set<string> | null> {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => /^caa\.(child|onboarding)\./.test(k));
    const used = new Set<string>();
    for (const [, v] of await AsyncStorage.multiGet(keys)) for (const n of mediaNamesIn(v)) used.add(n);
    return used;
  } catch {
    // Not known: nothing is erased.
    return null;
  }
}

/** When a board opens: the files whose 30 days are over, and that no board here uses, are erased. */
export function sweepLater(now = Date.now()): Promise<string[]> {
  return queue(async () => {
    const list = readLater(await AsyncStorage.getItem(LATER_KEY).catch(() => null));
    if (!Object.keys(list).length) return [];
    const used = await usedOnDevice();
    if (!used) return [];
    const { erase, list: rest } = dueLater(list, now, used);
    for (const n of erase) await deleteMedia(n).catch(() => {});
    await AsyncStorage.setItem(LATER_KEY, JSON.stringify(rest)).catch(() => {});
    return erase;
  });
}
