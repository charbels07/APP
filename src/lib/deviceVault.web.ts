/**
 * In a browser there is no Keychain: the session is kept in the browser's storage, as before
 * (a shared computer uses "Keep me logged in" unticked: then nothing is written at all).
 * The phone and tablet version is deviceVault.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const deviceVault = {
  secure: false,
  getItem: (key: string): Promise<string | null> => AsyncStorage.getItem(key),
  setItem: (key: string, value: string): Promise<void> => AsyncStorage.setItem(key, value),
  removeItem: (key: string): Promise<void> => AsyncStorage.removeItem(key),
};
