/**
 * Picks the server the app talks to.
 *  - If the project's `.env` gives a Supabase address and key, the real online server is used.
 *  - Otherwise the demo server built into the app (everything stays on this device).
 * Screens call `backend()` and never need to know which one it is.
 */
import type { Backend } from './Backend';
import { LocalBackend } from './local';

let instance: Backend | null = null;

/**
 * 'online': the real server. 'demo': the demo server inside the app, asked for on purpose
 * (EXPO_PUBLIC_APP_MODE=demo) or while developing. 'missing': a finished build that was made
 * without the server's address — it must say so instead of quietly becoming a demo where
 * accounts are not real and nothing is saved online.
 */
export function serverMode(): 'online' | 'demo' | 'missing' {
  if (process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) return 'online';
  if (process.env.EXPO_PUBLIC_APP_MODE === 'demo' || (typeof __DEV__ !== 'undefined' && __DEV__)) return 'demo';
  return 'missing';
}

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
