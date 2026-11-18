/**
 * "Keep me logged in" (ticked by default at sign-in and sign-up, chosen per device).
 *  - ticked: the session is kept on the device, the app opens on the child's board next time;
 *  - not ticked (someone else's computer): the session lasts for this visit only. It is kept in
 *    the visit's own store, never written on the device, and the app signs out when it is next
 *    opened if anything was left.
 * A tablet linked with a code always stays connected (the child must never meet a sign-in page).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deviceVault } from './deviceVault';
import { visitStore } from './visit';

const KEY = 'caa.keep.v1';
let choice: Promise<boolean> | null = null;

/** The choice made on this device (yes until someone unticks it). */
export function keepSignedIn(): Promise<boolean> {
  choice ??= AsyncStorage.getItem(KEY).then(
    (v) => v !== '0',
    () => true,
  );
  return choice;
}

export async function setKeepSignedIn(keep: boolean): Promise<void> {
  choice = Promise.resolve(keep);
  await AsyncStorage.setItem(KEY, keep ? '1' : '0').catch(() => {});
}

/**
 * Where a sign-in session is written: on the device (in the iOS Keychain / Android Keystore on
 * phones and tablets: `deviceVault`), or in the visit's store. Reading looks in both (the visit
 * first), so a session is found wherever the choice put it.
 */
export const sessionStore = {
  async getItem(key: string): Promise<string | null> {
    return visitStore.get(key) ?? (await deviceVault.getItem(key));
  },
  async setItem(key: string, value: string): Promise<void> {
    if (await keepSignedIn()) {
      visitStore.remove(key);
      await deviceVault.setItem(key, value);
    } else {
      visitStore.set(key, value);
      await deviceVault.removeItem(key);
    }
  },
  async removeItem(key: string): Promise<void> {
    visitStore.remove(key);
    await deviceVault.removeItem(key);
  },
};

/** For the tests. */
export function resetKeepSignedInForTests(): void {
  choice = null;
}
