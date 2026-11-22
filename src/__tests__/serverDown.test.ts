/**
 * A server that cannot answer is "no internet", never "signed out": signing out erases the
 * child's copy from the device (src/state/Session.tsx), so only a clear "this session does not
 * exist" may lead there.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { keepSessionFetch, SupabaseBackend } from '../backend/supabase';
import { sessionStore } from '../lib/keepSignedIn';

const URL_ = 'https://abcdefgh.supabase.co';
const session = {
  access_token: 'header.eyJzdWIiOiJ1MSIsImV4cCI6NDEwMjQ0NDgwMH0.sig',
  refresh_token: 'r',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'u1', aud: 'authenticated', role: 'authenticated', email: 'p@x.fr', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const backendAnswering = (status: number) =>
  new SupabaseBackend(URL_, 'public-key', {
    storageKey: `sb-test-${status}`,
    fetch: (async () => new Response(JSON.stringify({ message: 'x', code: status }), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch,
  });

beforeEach(async () => {
  await AsyncStorage.clear();
});
afterEach(() => {
  jest.useRealTimers();
});

/**
 * The libraries try again by themselves for a while (some 25 s for a session renewal): the test
 * does not wait for real, it moves the clock until the call has answered.
 */
async function answered<T>(call: () => Promise<T>): Promise<{ value?: T; error?: unknown }> {
  jest.useFakeTimers();
  let out: { value?: T; error?: unknown } | null = null;
  call().then(
    (value) => (out = { value }),
    (error) => (out = { error }),
  );
  for (let i = 0; i < 200 && !out; i++) await jest.advanceTimersByTimeAsync(1000);
  jest.useRealTimers();
  if (!out) throw new Error('no answer');
  return out;
}

describe('the server cannot answer', () => {
  for (const status of [500, 502, 503, 429]) {
    it(`${status}: the app is "offline", the session and the board stay`, async () => {
      await sessionStore.setItem(`sb-test-${status}`, JSON.stringify(session));
      await expect(backendAnswering(status).currentAccount()).rejects.toMatchObject({ code: 'offline' });
    });
  }

  // Only a clear "this session / this account is no more" signs out (and erases the children's copies).
  const answering = (key: string, status: number, body: string, type = 'application/json') =>
    new SupabaseBackend(URL_, 'public-key', {
      storageKey: key,
      fetch: (async () => new Response(body, { status, headers: { 'Content-Type': type } })) as typeof fetch,
    });

  for (const code of ['session_not_found', 'user_not_found']) {
    it(`403 ${code}: signed out`, async () => {
      await sessionStore.setItem(`sb-gone-${code}`, JSON.stringify(session));
      expect(await answering(`sb-gone-${code}`, 403, JSON.stringify({ code: 403, error_code: code, msg: 'does not exist' })).currentAccount()).toBeNull();
    });
  }

  it('a refusal that says nothing about the session (401 with no reason, 400, a filter\'s page): "offline", nothing erased', async () => {
    const cases: [number, string, string][] = [
      [401, JSON.stringify({ message: 'x', code: 401 }), 'application/json'],
      [400, JSON.stringify({ code: 400, error_code: 'validation_failed', msg: 'bad request' }), 'application/json'],
      [403, '<html><body>Access denied by the network</body></html>', 'text/html'],
    ];
    for (const [status, body, type] of cases) {
      const key = `sb-unclear-${status}`;
      await sessionStore.setItem(key, JSON.stringify(session));
      await expect(answering(key, status, body, type).currentAccount()).rejects.toMatchObject({ code: 'offline' });
      expect(await sessionStore.getItem(key)).not.toBeNull();
    }
  });

  it('Safari\'s "Load failed" is no internet', async () => {
    await sessionStore.setItem('sb-safari', JSON.stringify(session));
    const b = new SupabaseBackend(URL_, 'public-key', {
      storageKey: 'sb-safari',
      fetch: (async () => {
        throw new TypeError('Load failed');
      }) as typeof fetch,
    });
    expect((await answered(() => b.currentAccount())).error).toMatchObject({ code: 'offline' });
    expect((await answered(() => b.profileVersion('p1'))).error).toMatchObject({ code: 'offline' });
  });

  for (const status of [500, 503, 429, 408]) {
    it(`${status} on a database request is "offline", whatever the page says`, async () => {
      await sessionStore.setItem(`sb-db-${status}`, JSON.stringify(session));
      const b = answering(`sb-db-${status}`, status, '<html>Service is not available: too many requests</html>', 'text/html');
      expect((await answered(() => b.profileVersion('p1'))).error).toMatchObject({ code: 'offline' });
    });
  }
});

describe('renewing an expired session', () => {
  const expired = { ...session, expires_at: Math.floor(Date.now() / 1000) - 60 };
  const refreshAnswering = (key: string, status: number, body: string, type = 'application/json') =>
    new SupabaseBackend(URL_, 'public-key', {
      storageKey: key,
      fetch: (async () => new Response(body, { status, headers: { 'Content-Type': type } })) as typeof fetch,
    });

  it('"too many requests", an unknown refusal or a filter\'s page: the session stays on the device', async () => {
    const cases: [number, string, string][] = [
      [429, JSON.stringify({ code: 429, error_code: 'over_request_rate_limit', msg: 'rate limit' }), 'application/json'],
      [400, JSON.stringify({ code: 400, msg: 'bad request' }), 'application/json'],
      [403, '<html>blocked</html>', 'text/html'],
      [500, 'oops', 'text/plain'],
    ];
    for (const [status, body, type] of cases) {
      const key = `sb-renew-${status}`;
      await sessionStore.setItem(key, JSON.stringify(expired));
      const b = refreshAnswering(key, status, body, type);
      expect((await answered(() => b.currentAccount())).error).toMatchObject({ code: 'offline' });
      expect(JSON.parse((await sessionStore.getItem(key)) ?? 'null')?.refresh_token).toBe('r');
    }
  });

  it('"this session is over" (the refresh token is unknown): signed out', async () => {
    await sessionStore.setItem('sb-renew-over', JSON.stringify(expired));
    const b = refreshAnswering('sb-renew-over', 400, JSON.stringify({ code: 400, error_code: 'refresh_token_not_found', msg: 'Invalid Refresh Token: Refresh Token Not Found' }));
    expect(await b.currentAccount()).toBeNull();
  });
});

describe('keepSessionFetch', () => {
  const through = async (url: string, res: Response) => (await keepSessionFetch((async () => res) as typeof fetch)(url)).status;
  const renew = `${URL_}/auth/v1/token?grant_type=refresh_token`;
  it('only touches refusals of a session renewal', async () => {
    expect(await through(`${URL_}/auth/v1/token?grant_type=password`, new Response('{}', { status: 429 }))).toBe(429);
    expect(await through(`${URL_}/rest/v1/profiles`, new Response('x', { status: 403 }))).toBe(403);
    expect(await through(renew, new Response('{}', { status: 200 }))).toBe(200);
    expect(await through(renew, new Response('<html>', { status: 403 }))).toBe(503);
    expect(await through(renew, new Response('{}', { status: 429 }))).toBe(503);
    expect(await through(renew, new Response(JSON.stringify({ error_code: 'session_not_found' }), { status: 400 }))).toBe(400);
    expect(await through(renew, new Response(JSON.stringify({ error_code: 'refresh_token_already_used' }), { status: 400 }))).toBe(400);
  });
});
