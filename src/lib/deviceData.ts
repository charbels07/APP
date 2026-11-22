/**
 * What this device keeps about the children (the copy of each profile, the usage figures not
 * sent yet, the answers being typed during set-up) and how it leaves the device with the
 * account: on "Sign out", on "Delete", and when the session ended elsewhere.
 *
 * Photos and voice recordings: the ones made on this device stay when the person signs out,
 * unless she asks to erase them (a shared computer); deleting the account always erases them.
 * The ones received from the account (made on another device, `src/state/mediaSync.ts`) belong
 * to the device copy of the child's profile: they leave with it (`caa.media.<profile id>` lists them).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearMedia, deleteMedia } from './media';
import { eraseLater, LATER_KEY } from './mediaKeep';
import { mediaNamesIn as namesIn, readBook } from './mediaPlan';
import { clearExports } from './platform';

/** Children erased during this run of the app: nothing may write their copy back. */
const gone = new Set<string>();
export const isForgotten = (profileId: string) => gone.has(profileId);
/** The profile is opened again (same or another account): its copy may be kept again. */
export const remember = (profileId: string) => {
  gone.delete(profileId);
};

/** Open boards register a "send what is not sent yet" here, called before the account leaves. */
export const pendingSaves = new Set<() => Promise<unknown>>();

async function sendPending(maxMs = 4000): Promise<void> {
  if (!pendingSaves.size) return;
  const all = Promise.all([...pendingSaves].map((f) => f().catch(() => {})));
  await Promise.race([all, new Promise((r) => setTimeout(r, maxMs))]);
}

/** The photos and recordings this device received for these children: erased with their copies. */
async function eraseReceived(mediaKeys: string[]): Promise<void> {
  for (const k of mediaKeys) {
    let received: string[] = [];
    try {
      received = readBook(JSON.parse((await AsyncStorage.getItem(k)) ?? '{}')).received;
    } catch {
      /* unreadable: nothing to erase */
    }
    for (const name of received) await deleteMedia(name).catch(() => {});
  }
}

/** One child leaves this device (access removed, profile deleted). */
export async function forgetChild(profileId: string): Promise<void> {
  gone.add(profileId);
  await eraseReceived([`caa.media.${profileId}`]);
  await AsyncStorage.multiRemove([`caa.child.${profileId}`, `caa.child.${profileId}.bad`, `caa.usage.${profileId}`, `caa.product.${profileId}`, `caa.media.${profileId}`]).catch(() => {});
}

/**
 * After the account's list of children was read: the copies kept here of children it can no longer
 * open (access removed elsewhere, profile deleted, another account's) leave this device, with the
 * files received for them. A copy with changes never sent stays (they would be lost). Returns the
 * children forgotten.
 */
export async function forgetOthers(keep: string[]): Promise<string[]> {
  const mine = new Set(keep);
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  const out: string[] = [];
  for (const k of keys) {
    const m = /^caa\.child\.([^.]+)$/.exec(k);
    if (!m || mine.has(m[1])) continue;
    try {
      if (JSON.parse((await AsyncStorage.getItem(k)) ?? '{}')?.dirty === true) continue;
    } catch {
      /* unreadable: it goes */
    }
    await forgetChild(m[1]);
    out.push(m[1]);
  }
  return out;
}

const CHILD_DATA = /^caa\.(child|usage|product|media|onboarding)\./;
const OTHER_KEYS = ['caa.pendingRole', 'caa.pinlock'];

/** True when a previous account left children's data here (session ended without a clean sign-out). */
export async function hasChildData(): Promise<boolean> {
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  return keys.some((k) => CHILD_DATA.test(k));
}

/**
 * Everything about the children leaves this device. `beforeSignOut`: changes not sent yet are
 * sent first (call it while the session still works).
 */
export async function forgetEverything(opts: { media?: boolean; beforeSignOut?: boolean; keepUnsent?: boolean } = {}): Promise<void> {
  if (opts.beforeSignOut) await sendPending();
  const keys = await AsyncStorage.getAllKeys().catch(() => [] as readonly string[]);
  let mine = keys.filter((k) => CHILD_DATA.test(k) || OTHER_KEYS.includes(k));
  if (opts.keepUnsent) {
    // The session ended by itself (not a sign-out): a board with changes that were never sent
    // waits for its account to come back, so that nothing the family did is lost.
    const unsent = new Set<string>();
    for (const k of mine.filter((x) => x.startsWith('caa.child.'))) {
      try {
        if (JSON.parse((await AsyncStorage.getItem(k)) ?? '{}').dirty === true) unsent.add(k.slice('caa.child.'.length));
      } catch {
        /* unreadable: erased */
      }
    }
    mine = mine.filter((k) => !unsent.has(k.replace(/^caa\.(child|usage|product|media)\./, '')));
  }
  for (const k of mine) {
    const m = /^caa\.(?:child|usage|product|media)\.(.+)$/.exec(k);
    if (m) gone.add(m[1]);
  }
  if (!opts.media) await eraseReceived(mine.filter((k) => k.startsWith('caa.media.')));
  await AsyncStorage.multiRemove(opts.media ? [...mine, LATER_KEY] : mine).catch(() => {});
  await clearExports().catch(() => {});
  if (opts.media) await clearMedia().catch(() => {});
}

/**
 * The photos and recordings a profile uses (their file names follow one fixed pattern; a
 * recording can carry its start and stop moments: `1762000000001_zz99zz.t120-980.m4a`).
 */
export const mediaNamesIn = (profile: unknown): string[] => namesIn(profile);

/**
 * A deleted child's photos and recordings leave this device too, 30 days later (the profile waits
 * in the family's bin meanwhile), and only those no other board kept here uses (a brother's board
 * made from this one shares its files): `src/lib/mediaKeep.ts`.
 */
export async function eraseMediaOf(profile: unknown): Promise<void> {
  await eraseLater(mediaNamesIn(profile));
}
