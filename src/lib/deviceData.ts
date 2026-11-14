/**
 * What this device keeps about the children (the copy of each profile, the usage figures not
 * sent yet, the answers being typed during set-up) and how it leaves the device with the
 * account: on "Sign out", on "Delete", and when the session ended elsewhere.
 *
 * Photos and voice recordings are different: they live only on the device where they were
 * made (they are not saved online), so signing out keeps them unless the person asks to erase
 * them (a shared computer); deleting the account always erases them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearMedia, deleteMedia } from './media';
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

/** One child leaves this device (access removed, profile deleted). */
export async function forgetChild(profileId: string): Promise<void> {
  gone.add(profileId);
  await AsyncStorage.multiRemove([`caa.child.${profileId}`, `caa.usage.${profileId}`]).catch(() => {});
}

const CHILD_DATA = /^caa\.(child|usage|onboarding)\./;
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
    mine = mine.filter((k) => !unsent.has(k.replace(/^caa\.(child|usage)\./, '')));
  }
  for (const k of mine) {
    const m = /^caa\.(?:child|usage)\.(.+)$/.exec(k);
    if (m) gone.add(m[1]);
  }
  await AsyncStorage.multiRemove(mine).catch(() => {});
  await clearExports().catch(() => {});
  if (opts.media) await clearMedia().catch(() => {});
}

/** The photos and recordings a profile uses (their file names follow one fixed pattern). */
export function mediaNamesIn(profile: unknown): string[] {
  return [...new Set(JSON.stringify(profile ?? null).match(/\b\d{13}_[a-z0-9]{6}\.[a-z0-9]{2,4}\b/g) ?? [])];
}

/** A deleted child's photos and recordings leave this device too. */
export async function eraseMediaOf(profile: unknown): Promise<void> {
  for (const name of mediaNamesIn(profile)) await deleteMedia(name).catch(() => {});
}
