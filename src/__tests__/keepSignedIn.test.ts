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
