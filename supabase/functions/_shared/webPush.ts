/**
 * Browser notifications ("Web Push"), with nothing but the platform's own cryptography
 * (crypto.subtle: the same code runs in the server function and in the tests).
 *
 *  - The message is encrypted for one browser (RFC 8291, "aes128gcm"): the notification service
 *    that carries it (Google, Mozilla, Apple, Microsoft) cannot read it.
 *  - The server signs who it is (RFC 8292, "VAPID"): a browser only accepts notifications signed
 *    with the key it was given when the person said yes.
 */

const text = new TextEncoder();

export const toB64u = (b: Uint8Array): string => {
  let s = '';
  for (const byte of b) s += String.fromCharCode(byte);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
export const fromB64u = (s: string): Uint8Array => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));

const join = (...parts: Uint8Array[]): Uint8Array => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
};

/** For the type checker only: these bytes never sit in shared memory. */
const src = (b: Uint8Array) => b as unknown as BufferSource;

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', src(ikm), 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: src(salt), info: src(info) }, key, length * 8));
}

/** The server's pair of keys: `publicKey` (65 bytes) goes to the browsers, `privateKey` (32 bytes) never leaves the server. Both base64url. */
export interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

export async function makeVapidKeys(): Promise<VapidKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: toB64u(pub), privateKey: jwk.d as string };
}

/** The "Authorization" line: a 12-hour pass for one notification service, signed by the server. */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, contact: string, now = Date.now()): Promise<string> {
  const pub = fromB64u(keys.publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', d: keys.privateKey, x: toB64u(pub.slice(1, 33)), y: toB64u(pub.slice(33, 65)), ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const part = (o: unknown) => toB64u(text.encode(JSON.stringify(o)));
  const unsigned = `${part({ typ: 'JWT', alg: 'ES256' })}.${part({ aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600, sub: contact })}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, src(text.encode(unsigned))));
  return `vapid t=${unsigned}.${toB64u(sig)}, k=${keys.publicKey}`;
}

/** The message, readable by that browser only. `p256dh` and `auth` are the two keys the browser gave. */
export async function encryptFor(p256dh: string, auth: string, message: Uint8Array): Promise<Uint8Array> {
  const theirs = fromB64u(p256dh);
  const secret = fromB64u(auth);
  const theirKey = await crypto.subtle.importKey('raw', src(theirs), { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ours = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const ourPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ours.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: theirKey }, ours.privateKey, 256));
  const ikm = await hkdf(secret, shared, join(text.encode('WebPush: info\0'), theirs, ourPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, text.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, text.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', src(cek), 'AES-GCM', false, ['encrypt']);
  // One record: the message, then the "last record" mark (2).
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: src(nonce) }, aes, src(join(message, new Uint8Array([2])))));
  // Header: salt, record size (4096), length of our public key, our public key.
  return join(salt, new Uint8Array([0, 0, 16, 0, ourPublic.length]), ourPublic, sealed);
}

/** The only addresses the server posts to: the browsers' own notification services (the database checks it too). */
export const isPushService = (endpoint: string): boolean =>
  endpoint.length <= 1000 &&
  /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)\/\S+$/.test(endpoint);

export type PushResult = { result: 'sent' } | { result: 'gone' } | { result: 'failed'; error: string };

/** Sends one notification. "gone": the browser no longer accepts them (permission removed, browser erased). */
export async function sendPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: unknown,
  keys: VapidKeys,
  opts: { contact: string; ttl: number; topic?: string },
): Promise<PushResult> {
  if (!isPushService(sub.endpoint)) return { result: 'failed', error: 'refused address' };
  try {
    const body = await encryptFor(sub.p256dh, sub.auth, text.encode(JSON.stringify(payload)));
    const headers: Record<string, string> = {
      Authorization: await vapidAuthorization(sub.endpoint, keys, opts.contact),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(Math.max(0, Math.floor(opts.ttl))),
      Urgency: 'normal',
    };
    // Same topic: a newer notification replaces one that is still waiting for the device.
    if (opts.topic) headers.Topic = opts.topic;
    const res = await fetch(sub.endpoint, { method: 'POST', headers, body: src(body), redirect: 'error' });
    if (res.status >= 200 && res.status < 300) return { result: 'sent' };
    if (res.status === 404 || res.status === 410) return { result: 'gone' };
    return { result: 'failed', error: `${res.status} ${(await res.text().catch(() => '')).slice(0, 200)}`.trim() };
  } catch (e) {
    return { result: 'failed', error: String((e as Error)?.message ?? e).slice(0, 200) };
  }
}
