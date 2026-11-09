/**
 * Picks the server the app talks to.
 *  - If the project's `.env` gives a Supabase address and key, the real online server is used.
 *  - Otherwise the demo server built into the app (everything stays on this device).
 * Screens call `backend()` and never need to know which one it is.
 */
import type { Backend } from './Backend';
import { LocalBackend } from './local';

let instance: Backend | null = null;

export function backend(): Backend {
  if (instance) return instance;
  // Expo copies EXPO_PUBLIC_* values into the app when it is built.
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SupabaseBackend } = require('./supabase') as typeof import('./supabase');
    instance = new SupabaseBackend(url, key);
  } else {
    instance = new LocalBackend();
  }
  return instance;
}

/** Tests only: start again with another server. */
export function setBackendForTests(b: Backend | null) {
  instance = b;
}

export { BackendError } from './Backend';
export type { Backend } from './Backend';
