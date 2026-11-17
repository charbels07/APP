/**
 * @jest-environment node
 *
 * "Forgot the code?" against the real server: the proof goes to the signed-in account's own
 * address (never one typed on the screen), the e-mail is a sign-in code for an existing account
 * (no account is ever created), and a linked tablet is refused before anything is sent.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseBackend } from '../backend/supabase';

const URL_ = 'https://example.supabase.co';
const STORAGE = 'test-forgot-code';
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function server(user: Record<string, unknown>) {
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  const session = () => ({
    access_token: 'access',
    refresh_token: 'refresh',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user,
  });
  const fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname + url.search;
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    calls.push({ path, body });
    if (url.pathname === '/auth/v1/user') return json(user);
    if (url.pathname === '/rest/v1/accounts') return json({ id: user.id, role: 'parent', display_name: 'Rita', prefs: {} });
    if (url.pathname === '/auth/v1/otp') return json({});
    if (url.pathname === '/auth/v1/verify') return body.token === '123456' ? json(session()) : json({ code: 403, error_code: 'otp_expired', msg: 'Token has expired or is invalid' }, 403);
    if (url.pathname === '/auth/v1/token')
      return body.password === 'secret123' ? json(session()) : json({ error: 'invalid_grant', error_description: 'Invalid login credentials', code: 400, msg: 'Invalid login credentials' }, 400);
    return json({});
  }) as typeof globalThis.fetch;
  return { api: new SupabaseBackend(URL_, 'public-key', { storageKey: STORAGE, fetch }), calls, session };
}

const signedIn = async (user: Record<string, unknown>) => {
  const s = server(user);
  await AsyncStorage.setItem(STORAGE, JSON.stringify(s.session()));
  return s;
};

const rita = { id: 'u-rita', aud: 'authenticated', role: 'authenticated', email: 'rita@example.com', email_confirmed_at: '2026-11-01T00:00:00Z', app_metadata: { provider: 'email' }, user_metadata: {}, created_at: '2026-11-01T00:00:00Z', is_anonymous: false };

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('real server: showing the account is yours again', () => {
  it('sends a sign-in code to the account’s own e-mail, without creating any account', async () => {
    const { api, calls } = await signedIn(rita);
    expect(await api.sendIdentityCode()).toEqual({ sentTo: 'rita@example.com' });
    const otp = calls.find((c) => c.path.startsWith('/auth/v1/otp'))!;
    expect(otp.body).toMatchObject({ email: 'rita@example.com', create_user: false });
  });

  it('checks the code as an e-mail sign-in code of that same address', async () => {
    const { api, calls } = await signedIn(rita);
    await expect(api.confirmIdentity({ code: '000000' })).rejects.toMatchObject({ code: 'code_expired' });
    await expect(api.confirmIdentity({ code: ' 123456 ' })).resolves.toBeUndefined();
    const verify = calls.filter((c) => c.path.startsWith('/auth/v1/verify')).pop()!;
    expect(verify.body).toMatchObject({ email: 'rita@example.com', token: '123456', type: 'email' });
  });

  it('checks the password of that same account', async () => {
    const { api, calls } = await signedIn(rita);
    await expect(api.confirmIdentity({ password: 'nope' })).rejects.toMatchObject({ code: 'wrong_credentials' });
    await expect(api.confirmIdentity({ password: 'secret123' })).resolves.toBeUndefined();
    const token = calls.filter((c) => c.path.startsWith('/auth/v1/token')).pop()!;
    expect(token.path).toContain('grant_type=password');
    expect(token.body).toMatchObject({ email: 'rita@example.com', password: 'secret123' });
  });

  it('an account with a phone only gets a text message', async () => {
    const { api, calls } = await signedIn({ ...rita, email: '', phone: '96170123456', phone_confirmed_at: '2026-11-01T00:00:00Z', app_metadata: { provider: 'phone' } });
    expect(await api.sendIdentityCode()).toEqual({ sentTo: '96170123456' });
    expect(calls.find((c) => c.path.startsWith('/auth/v1/otp'))!.body).toMatchObject({ phone: '96170123456', create_user: false });
  });

  it('a tablet linked with a code is refused before anything is sent', async () => {
    const { api, calls } = await signedIn({ ...rita, email: undefined, email_confirmed_at: undefined, is_anonymous: true, app_metadata: { provider: 'anonymous' } });
    await expect(api.sendIdentityCode()).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.confirmIdentity({ password: 'secret123' })).rejects.toMatchObject({ code: 'forbidden' });
    expect(calls.some((c) => /\/auth\/v1\/(otp|verify|token)/.test(c.path))).toBe(false);
  });
});
