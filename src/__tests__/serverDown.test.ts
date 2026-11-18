/**
 * A server that cannot answer is "no internet", never "signed out": signing out erases the
 * child's copy from the device (src/state/Session.tsx), so only a clear "this session does not
 * exist" may lead there.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseBackend } from '../backend/supabase';
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

describe('the server cannot answer', () => {
  for (const status of [500, 502, 503, 429]) {
    it(`${status}: the app is "offline", the session and the board stay`, async () => {
      await sessionStore.setItem(`sb-test-${status}`, JSON.stringify(session));
      await expect(backendAnswering(status).currentAccount()).rejects.toMatchObject({ code: 'offline' });
    });
  }

  it('401 (the session no longer exists): signed out', async () => {
    await sessionStore.setItem('sb-test-401', JSON.stringify(session));
    expect(await backendAnswering(401).currentAccount()).toBeNull();
  });
});
