/**
 * Where the sign-in session is written on a phone or tablet: the system's secure storage
 * (iOS Keychain, Android Keystore), not the app's ordinary storage. A copy of the app's files
 * (a backup, a rooted device, a forensic tool) then holds no usable session.
 *
 *  - "after first unlock, this device only": readable once the device was unlocked after start-up
 *    (the session can be renewed in the background), never copied to another device by a restore;
 *  - long values are cut in pieces (some Android versions refuse more than about 2 KB per entry);
 *  - a session written by an older version in the ordinary storage is moved here the first time it
 *    is read, then removed from there;
 *  - if the secure storage cannot be used at all (a rare broken device), the ordinary storage is
 *    used rather than signing the family out: the board must keep working.
 * The browser version (deviceVault.web.ts) uses the browser's storage, as before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const PIECE = 1800;
const OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

/** Secure-storage keys may only hold letters, digits, ".", "-" and "_". */
const safe = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${safe(key)}.n`;
const pieceKey = (key: string, i: number) => `${safe(key)}.${i}`;

async function secureRead(key: string): Promise<string | null> {
  const n = Number(await SecureStore.getItemAsync(countKey(key), OPTS));
  if (!n) return null;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = await SecureStore.getItemAsync(pieceKey(key, i), OPTS);
    if (p === null) return null; // half-written: treated as nothing
    parts.push(p);
  }
  return parts.join('');
}

async function secureRemove(key: string): Promise<void> {
  const n = Number(await SecureStore.getItemAsync(countKey(key), OPTS)) || 0;
  await SecureStore.deleteItemAsync(countKey(key), OPTS);
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(pieceKey(key, i), OPTS);
}

async function secureWrite(key: string, value: string): Promise<void> {
  await secureRemove(key);
  const n = Math.max(1, Math.ceil(value.length / PIECE));
  for (let i = 0; i < n; i++) await SecureStore.setItemAsync(pieceKey(key, i), value.slice(i * PIECE, (i + 1) * PIECE), OPTS);
  // The count last: a value is only "there" once every piece is written.
  await SecureStore.setItemAsync(countKey(key), String(n), OPTS);
}

export const deviceVault = {
  /** True on phones and tablets: the session is in the system's secure storage. */
  secure: true,
  async getItem(key: string): Promise<string | null> {
    try {
      const v = await secureRead(key);
      if (v !== null) return v;
      // Written by an older version of the app: moved into the secure storage once.
      const old = await AsyncStorage.getItem(key);
      if (old !== null) {
        await secureWrite(key, old);
        await AsyncStorage.removeItem(key);
      }
      return old;
    } catch {
      return AsyncStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    try {
      await secureWrite(key, value);
      await AsyncStorage.removeItem(key);
    } catch {
      await AsyncStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    await secureRemove(key).catch(() => {});
    await AsyncStorage.removeItem(key);
  },
};
