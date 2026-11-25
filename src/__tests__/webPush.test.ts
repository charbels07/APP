/**
 * The notifications' cryptography (supabase/functions/_shared/webPush.ts), checked against Node's
 * own, separate implementation: what the server encrypts, a browser's keys open; what the server
 * signs, its public key verifies.
 */
import fs from 'fs';
import path from 'path';
import { createDecipheriv, createECDH, createPublicKey, hkdfSync, verify, webcrypto } from 'node:crypto';
import { encryptFor, fromB64u, isPushService, makeVapidKeys, sendPush, toB64u, vapidAuthorization } from '../../supabase/functions/_shared/webPush';

beforeAll(() => {
  if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
});

/** A browser: its pair of keys and its secret, as `pushManager.subscribe` hands them out. */
function browser() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = webcrypto.getRandomValues(new Uint8Array(16));
  return { ecdh, auth, p256dh: toB64u(new Uint8Array(ecdh.getPublicKey())), authKey: toB64u(auth) };
}

/** What the browser does when a notification arrives (RFC 8291). */
function open(b: ReturnType<typeof browser>, body: Uint8Array): string {
  const salt = body.slice(0, 16);
  const idLen = body[20];
  const serverPublic = body.slice(21, 21 + idLen);
  const sealed = body.slice(21 + idLen);
  const shared = b.ecdh.computeSecret(serverPublic);
  const info = Buffer.concat([Buffer.from('WebPush: info\0'), b.ecdh.getPublicKey(), serverPublic]);
  const ikm = Buffer.from(hkdfSync('sha256', shared, b.auth, info, 32));
  const cek = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = createDecipheriv('aes-128-gcm', cek, nonce);
  d.setAuthTag(sealed.slice(sealed.length - 16));
  const plain = Buffer.concat([d.update(sealed.slice(0, sealed.length - 16)), d.final()]);
  expect(plain[plain.length - 1]).toBe(2);
  return plain.subarray(0, plain.length - 1).toString('utf8');
}

test('a notification is readable by the browser it was written for, and by nobody else', async () => {
  const b = browser();
  const message = JSON.stringify({ title: 'Daleth AAC', body: 'لم يُفتح اللوح اليوم بعد.' });
  const body = await encryptFor(b.p256dh, b.authKey, new TextEncoder().encode(message));
  expect([...body.slice(16, 21)]).toEqual([0, 0, 16, 0, 65]);
  expect(open(b, body)).toBe(message);
  expect(Buffer.from(body).includes(Buffer.from('Daleth AAC'))).toBe(false);
  expect(() => open(browser(), body)).toThrow();
});

test('the server signs its notifications with the key the browsers were given', async () => {
  const keys = await makeVapidKeys();
  expect(keys.publicKey).toMatch(/^[A-Za-z0-9_-]{87}$/);
  expect(keys.privateKey).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', keys, 'mailto:team@example.com', 1_800_000_000_000);
  const m = /^vapid t=([\w-]+)\.([\w-]+)\.([\w-]+), k=([\w-]+)$/.exec(header)!;
  expect(m[4]).toBe(keys.publicKey);
  expect(JSON.parse(Buffer.from(m[2], 'base64url').toString())).toEqual({ aud: 'https://fcm.googleapis.com', exp: 1_800_000_000 + 12 * 3600, sub: 'mailto:team@example.com' });
  const pub = fromB64u(keys.publicKey);
  const key = createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: toB64u(pub.slice(1, 33)), y: toB64u(pub.slice(33)) }, format: 'jwk' });
  expect(verify('sha256', Buffer.from(`${m[1]}.${m[2]}`), { key, dsaEncoding: 'ieee-p1363' }, Buffer.from(m[3], 'base64url'))).toBe(true);
});

test('the server only posts to the browsers’ notification services', async () => {
  expect(isPushService('https://fcm.googleapis.com/fcm/send/abc')).toBe(true);
  expect(isPushService('https://updates.push.services.mozilla.com/wpush/v2/abc')).toBe(true);
  expect(isPushService('https://web.push.apple.com/abc')).toBe(true);
  expect(isPushService('https://wns2-par02p.notify.windows.com/w/?token=abc')).toBe(true);
  for (const bad of ['http://fcm.googleapis.com/a', 'https://fcm.googleapis.com.evil.example/a', 'https://evil.example/fcm.googleapis.com/', 'https://127.0.0.1/a', 'https://abcdefgh.supabase.co/rest/v1/profiles']) {
    expect(isPushService(bad)).toBe(false);
  }
  const b = browser();
  const keys = await makeVapidKeys();
  const calls: { url: string; init: RequestInit }[] = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response('', { status: url.endsWith('gone') ? 410 : url.endsWith('down') ? 500 : 201 });
  }) as typeof fetch;
  try {
    const opts = { contact: 'mailto:team@example.com', ttl: 3600, topic: 'reminder' };
    const sub = { p256dh: b.p256dh, auth: b.authKey };
    expect(await sendPush({ ...sub, endpoint: 'https://evil.example/a' }, {}, keys, opts)).toEqual({ result: 'failed', error: 'refused address' });
    expect(calls).toHaveLength(0);
    expect(await sendPush({ ...sub, endpoint: 'https://fcm.googleapis.com/fcm/send/ok' }, { title: 'x' }, keys, opts)).toEqual({ result: 'sent' });
    expect(await sendPush({ ...sub, endpoint: 'https://fcm.googleapis.com/fcm/send/gone' }, {}, keys, opts)).toEqual({ result: 'gone' });
    expect((await sendPush({ ...sub, endpoint: 'https://fcm.googleapis.com/fcm/send/down' }, {}, keys, opts)).result).toBe('failed');
    const headers = calls[0].init.headers as Record<string, string>;
    expect(headers['Content-Encoding']).toBe('aes128gcm');
    expect(headers.TTL).toBe('3600');
    expect(open(b, calls[0].init.body as Uint8Array)).toBe('{"title":"x"}');
  } finally {
    globalThis.fetch = realFetch;
  }
});

test('the function to deploy carries the same code (one file to paste)', () => {
  const dir = path.join(__dirname, '../../supabase/functions');
  const shared = fs.readFileSync(path.join(dir, '_shared/webPush.ts'), 'utf8');
  const fn = fs.readFileSync(path.join(dir, 'caa-push/index.ts'), 'utf8');
  const tested = shared.slice(shared.indexOf('const text = new TextEncoder();')).replace(/^export /gm, '').trim();
  const pasted = fn.slice(fn.indexOf('// <webPush>') + '// <webPush>'.length, fn.indexOf('// </webPush>')).trim();
  expect(pasted).toBe(tested);
  // Supabase's editor only runs index.ts: no other file of the project may be needed.
  expect(fn).not.toMatch(/from '\.\.?\//);
});
