/**
 * "Keep me logged in": ticked, the session is written on the device; not ticked, it only lives
 * for the visit (never written on the device), wherever it was before.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { keepSignedIn, resetKeepSignedInForTests, sessionStore, setKeepSignedIn } from '../lib/keepSignedIn';
import { markVisit, sameVisit, visitStore } from '../lib/visit';

beforeEach(async () => {
  await AsyncStorage.clear();
  visitStore.remove('token');
  resetKeepSignedInForTests();
});

describe('keep me logged in', () => {
  it('is yes until someone unticks it, and the choice is remembered on the device', async () => {
    expect(await keepSignedIn()).toBe(true);
    await setKeepSignedIn(false);
    expect(await keepSignedIn()).toBe(false);
    resetKeepSignedInForTests(); // the app is opened again
    expect(await keepSignedIn()).toBe(false);
    await setKeepSignedIn(true);
    resetKeepSignedInForTests();
    expect(await keepSignedIn()).toBe(true);
  });

  it('ticked: the session is written on the device', async () => {
    await sessionStore.setItem('token', 'abc');
    expect(await AsyncStorage.getItem('token')).toBe('abc');
    expect(visitStore.get('token')).toBeNull();
    expect(await sessionStore.getItem('token')).toBe('abc');
  });

  it('not ticked: the session stays in the visit and nothing is left on the device', async () => {
    await sessionStore.setItem('token', 'old'); // signed in earlier with the box ticked
    await setKeepSignedIn(false);
    await sessionStore.setItem('token', 'new'); // signs in again, or the session is renewed
    expect(await AsyncStorage.getItem('token')).toBeNull();
    expect(visitStore.get('token')).toBe('new');
    expect(await sessionStore.getItem('token')).toBe('new');
    // the visit ends (tab or app closed): its store is emptied, so nobody is signed in
    visitStore.remove('token');
    expect(await sessionStore.getItem('token')).toBeNull();
  });

  it('signing out removes the session from both places', async () => {
    await sessionStore.setItem('token', 'abc');
    await setKeepSignedIn(false);
    await sessionStore.setItem('token', 'abc');
    await sessionStore.removeItem('token');
    expect(await sessionStore.getItem('token')).toBeNull();
  });

  it('a visit is marked once someone is recognised', () => {
    markVisit();
    expect(sameVisit()).toBe(true);
  });
});

describe('the real server\'s client writes through that store', () => {
  // Starting a "Continue with Google" stores a one-time secret for the way back: no network needed,
  // and it shows where the client writes.
  const client = () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
    return createClient('https://example.supabase.co', 'public-key', {
      auth: { storage: sessionStore, storageKey: 'sb-test', flowType: 'pkce', persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    });
  };
  const verifier = 'sb-test-code-verifier';
  afterEach(() => visitStore.remove(verifier));

  it('ticked: on the device', async () => {
    const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
    expect(error).toBeNull();
    expect(await AsyncStorage.getItem(verifier)).toBeTruthy();
    expect(visitStore.get(verifier)).toBeNull();
  });

  it('not ticked: in the visit only', async () => {
    await setKeepSignedIn(false);
    const { error } = await client().auth.signInWithOAuth({ provider: 'google', options: { skipBrowserRedirect: true } });
    expect(error).toBeNull();
    expect(visitStore.get(verifier)).toBeTruthy();
    expect(await AsyncStorage.getItem(verifier)).toBeNull();
    expect(await client().auth.getSession()).toMatchObject({ data: { session: null }, error: null });
  });
});
