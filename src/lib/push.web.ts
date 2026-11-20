/**
 * Notifications outside the app, in a browser ("Web Push").
 *
 * The person says yes once per browser. The browser then gives an address and two keys, which the
 * app hands to the account's server (`pushSubscribe`); the server writes to that address when it
 * has something to say, and the small worker `public/sw.js` shows it, even when the app is closed.
 *
 * iPhone and iPad: Safari only allows this once the app was added to the Home Screen
 * (`pushSupport() === 'homeScreen'` until then).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import type { UiLang } from '../model/types';

export type PushSupport = 'ok' | 'homeScreen' | 'no';

const ASKED_KEY = 'caa.push.asked.v1';

const has = (): boolean =>
  typeof navigator !== 'undefined' && typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

function appleTouchDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function pushSupport(): PushSupport {
  if (has()) return 'ok';
  // Safari on iPhone / iPad shows none of this in a tab: only in the app added to the Home Screen.
  return appleTouchDevice() ? 'homeScreen' : 'no';
}

export const pushRefused = (): boolean => has() && Notification.permission === 'denied';

/** The page says where its Home Screen description is (name, icon, "opens like an app"). */
function linkManifest(): void {
  if (typeof document === 'undefined' || document.querySelector('link[rel="manifest"]')) return;
  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = '/manifest.json';
  document.head.appendChild(link);
}
linkManifest();

let worker: Promise<ServiceWorkerRegistration> | null = null;
function registration(): Promise<ServiceWorkerRegistration> {
  worker ??= navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready);
  worker.catch(() => (worker = null));
  return worker;
}

const b64u = (s: string): string => s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const bytes = (key: string): Uint8Array<ArrayBuffer> => {
  const raw = atob(key.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
};
const sameKey = (sub: PushSubscription, key: Uint8Array): boolean => {
  const k = sub.options.applicationServerKey;
  if (!k) return false;
  const a = new Uint8Array(k);
  return a.length === key.length && a.every((v, i) => v === key[i]);
};

function timeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

async function tell(api: Backend, sub: PushSubscription, lang: UiLang): Promise<void> {
  const keys = sub.toJSON().keys ?? {};
  await api.pushSubscribe({ endpoint: sub.endpoint, p256dh: b64u(keys.p256dh ?? ''), auth: b64u(keys.auth ?? ''), lang, tz: timeZone() });
}

async function current(): Promise<PushSubscription | null> {
  if (!has() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return (await reg?.pushManager.getSubscription()) ?? null;
}

export async function pushIsOn(): Promise<boolean> {
  return !!(await current().catch(() => null));
}

/**
 * Called from the person's own touch on "Turn on": the browser's question comes first (a browser
 * only shows it right after a touch), then the device is registered with the account.
 */
export async function turnPushOn(api: Backend, lang: UiLang): Promise<'on' | 'refused' | 'failed'> {
  if (!has()) return 'failed';
  try {
    const answer = await Notification.requestPermission();
    if (answer !== 'granted') return answer === 'denied' ? 'refused' : 'failed';
    const key = await api.pushKey();
    if (!key) return 'failed';
    const server = bytes(key);
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    // Registered for another server key (the server's keys were made again): start afresh.
    if (sub && !sameKey(sub, server)) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: server });
    await tell(api, sub, lang);
    return 'on';
  } catch {
    return 'failed';
  }
}

export async function turnPushOff(api: Backend): Promise<void> {
  const sub = await current().catch(() => null);
  if (!sub) return;
  await api.pushUnsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export async function refreshPush(api: Backend, lang: UiLang): Promise<void> {
  const sub = await current().catch(() => null);
  if (sub) await tell(api, sub, lang).catch(() => {});
}

async function askedList(): Promise<string[]> {
  try {
    const v = JSON.parse((await AsyncStorage.getItem(ASKED_KEY)) ?? '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export async function pushAsked(accountId: string): Promise<void> {
  const list = await askedList();
  if (!list.includes(accountId)) await AsyncStorage.setItem(ASKED_KEY, JSON.stringify([...list, accountId].slice(-20))).catch(() => {});
}

/** Once per account on a device, where it can work, and only when the server can really send. */
export async function shouldAskPush(api: Backend, accountId: string): Promise<boolean> {
  if (!has() || Notification.permission === 'denied') return false;
  if ((await askedList()).includes(accountId)) return false;
  if (await pushIsOn()) return false;
  // Never keeps the person waiting at the door: no answer within 3 seconds is "not now".
  const key = await Promise.race([api.pushKey().catch(() => null), new Promise<null>((r) => setTimeout(() => r(null), 3000))]);
  return !!key;
}
