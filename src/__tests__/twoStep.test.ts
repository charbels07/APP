/**
 * Two-step sign-in, the fresh proof before what cannot be undone, and what team members read about
 * each other: the demo server plays the same rules as the database
 * (supabase/migrations/20261118000000_security_2.sql, supabase/tests/security_2_scenario.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { svgOfDataUrl } from '../backend/supabase';
import { createDefaultProfile } from '../data/defaults';
import { proofWays } from '../lib/forgotCode';
import { preset } from '../lib/permissions';
import { base32Decode, base32Encode, totp, totpMatches } from '../lib/totp';

const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};

describe('authenticator codes (RFC 6238 test values)', () => {
  // The RFC's key is the text "12345678901234567890"; authenticator apps get it in base32.
  const secret = base32Encode(new TextEncoder().encode('12345678901234567890'));
  it('writes and reads the key as authenticator apps do', () => {
    expect(secret).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
    expect(new TextDecoder().decode(base32Decode('gezd gnbv gy3t qojq gezd gnbv gy3t qojq'))).toBe('12345678901234567890');
  });
  it('gives the RFC codes (their last 6 digits)', () => {
    expect(totp(secret, 59_000)).toBe('287082');
    expect(totp(secret, 1_111_111_109_000)).toBe('081804');
    expect(totp(secret, 1_234_567_890_000)).toBe('005924');
    expect(totp(secret, 2_000_000_000_000)).toBe('279037');
  });
  it('accepts the code of 30 seconds before or after, not older ones', () => {
    const now = 1_234_567_890_000;
    expect(totpMatches(secret, totp(secret, now - 30_000), now)).toBe(true);
    expect(totpMatches(secret, ` ${totp(secret, now + 30_000).replace(/(\d{3})/, '$1 ')}`, now)).toBe(true);
    expect(totpMatches(secret, totp(secret, now - 90_000), now)).toBe(false);
    expect(totpMatches(secret, '12345', now)).toBe(false);
  });
});

describe('the QR code given by the real server', () => {
  it('is read from its "data:" address', () => {
    expect(svgOfDataUrl('data:image/svg+xml;utf-8,<svg width="1"></svg>')).toBe('<svg width="1"></svg>');
    expect(svgOfDataUrl(`data:image/svg+xml;base64,${Buffer.from('<svg/>').toString('base64')}`)).toBe('<svg/>');
    expect(svgOfDataUrl('data:image/svg+xml;utf-8,%3Csvg%2F%3E')).toBe('<svg/>');
    expect(svgOfDataUrl('<svg/>')).toBe('<svg/>');
    expect(svgOfDataUrl('https://example.com/qr.png')).toBeUndefined();
    expect(svgOfDataUrl(undefined)).toBeUndefined();
  });
});

describe('demo server: two-step sign-in', () => {
  const api = new LocalBackend();
  let profileId = '';
  let secret = '';

  beforeAll(async () => {
    await AsyncStorage.clear();
    const c = (await api.signUp({ role: 'parent', displayName: 'Rita', email: 'rita@example.com', password: 'secret123' })).demoCode!;
    await api.verifyCode({ email: 'rita@example.com' }, c);
    profileId = (await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() })).id;
  });

  it('is off at first; turning it on needs the first code of the app', async () => {
    expect(await api.security()).toEqual({ team: false, twoStep: false, level: 'aal1' });
    const setup = await api.twoStepStart();
    secret = setup.secret;
    expect(setup.uri).toContain(`secret=${secret}`);
    await expectCode(api.twoStepConfirm(setup.factorId, '000000'), 'code_invalid');
    expect((await api.security()).twoStep).toBe(false);
    await api.twoStepConfirm(setup.factorId, totp(secret));
    expect(await api.security()).toMatchObject({ twoStep: true, level: 'aal2' });
  });

  it('next sign-in: nothing about the children before the code', async () => {
    await api.signOut();
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    expect(await api.security()).toMatchObject({ twoStep: true, level: 'aal1' });
    await expectCode(api.listProfiles(), 'two_step_needed');
    await expectCode(api.getProfile(profileId), 'two_step_needed');
    await expectCode(api.twoStepCode('000000'), 'code_invalid');
    await api.twoStepCode(totp(secret));
    expect((await api.listProfiles()).map((p) => p.name)).toEqual(['Adam']);
  });

  it('turning it off asks a current code', async () => {
    await expectCode(api.twoStepOff('000000'), 'code_invalid');
    await api.twoStepOff(totp(secret));
    expect((await api.security()).twoStep).toBe(false);
  });
});

describe('demo server: a fresh proof before what cannot be undone', () => {
  const api = new LocalBackend();
  let profileId = '';
  const later = (min: number) => jest.spyOn(Date, 'now').mockReturnValue(Date.now() + min * 60_000);

  beforeAll(async () => {
    await AsyncStorage.clear();
    const c = (await api.signUp({ role: 'parent', displayName: 'Nadia', email: 'nadia@example.com', password: 'secret123' })).demoCode!;
    await api.verifyCode({ email: 'nadia@example.com' }, c);
    profileId = (await api.createProfile({ name: 'Lina', age: 5, data: createDefaultProfile() })).id;
  });
  afterEach(() => jest.restoreAllMocks());

  it('just signed in: a full-access code is given', async () => {
    expect((await api.createPairingCode(profileId, 'full')).code).toHaveLength(8);
  });

  it('an hour later: a use-only code still is, not a full-access one, nor the account deleted', async () => {
    later(60);
    expect((await api.createPairingCode(profileId, 'use')).code).toHaveLength(8);
    await expectCode(api.createPairingCode(profileId, 'full'), 'proof_needed');
    await expectCode(api.deleteAccount(), 'proof_needed');
  });

  it('the password typed again is a fresh proof (and so is an e-mailed code)', async () => {
    const spy = later(60);
    await expectCode(api.checkPassword('wrong-one'), 'wrong_credentials');
    await api.checkPassword('secret123');
    expect((await api.createPairingCode(profileId, 'full')).code).toHaveLength(8);
    spy.mockReturnValue(Date.now() + 120 * 60_000);
    await expectCode(api.createPairingCode(profileId, 'full'), 'proof_needed');
    const sent = await api.requestPasswordReset({ email: 'nadia@example.com' });
    await api.checkResetCode({ email: 'nadia@example.com' }, sent.demoCode!);
    expect((await api.createPairingCode(profileId, 'full')).code).toHaveLength(8);
  });

  it('who may prove: an account with an address; never a linked tablet', () => {
    expect(proofWays({ id: 'u', role: 'parent', displayName: 'N', email: 'n@x.fr', provider: 'email', verified: true, createdAt: 0, prefs: {} as never })).toMatchObject({ password: true, to: 'n@x.fr' });
    expect(proofWays({ id: 'u', role: 'parent', displayName: 'N', email: 'n@x.fr', provider: 'google', verified: true, createdAt: 0, prefs: {} as never })).toMatchObject({ password: false });
    expect(proofWays({ id: 't', role: 'parent', displayName: 'Tablet', provider: 'device', verified: true, createdAt: 0, prefs: {} as never })).toBeNull();
  });
});

describe('demo server: what team members read about each other', () => {
  const api = new LocalBackend();

  it('a member sees only their own address; the family sees everyone\'s', async () => {
    await AsyncStorage.clear();
    const c = (await api.signUp({ role: 'parent', displayName: 'Maya', email: 'maya@example.com', password: 'secret123' })).demoCode!;
    await api.verifyCode({ email: 'maya@example.com' }, c);
    const profileId = (await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() })).id;
    const inv = await api.invite(profileId, { email: 'sami@example.com', name: 'Sami', role: 'family', ...preset('family') });
    const inv2 = await api.invite(profileId, { email: 'lea@example.com', name: 'Léa', role: 'caregiver', ...preset('caregiver') });
    for (const [who, i] of [['sami', inv], ['lea', inv2]] as const) {
      await api.signOut();
      const k = (await api.signUp({ role: 'parent', displayName: who, email: `${who}@example.com`, password: 'secret123' })).demoCode!;
      await api.verifyCode({ email: `${who}@example.com` }, k);
      await api.acceptInvitationCode(i.code);
    }
    const seen = await api.listMembers(profileId);
    expect(seen).toHaveLength(2);
    expect(seen.map((m) => m.email).filter(Boolean)).toEqual(['lea@example.com']);
    await api.signOut();
    await api.signIn({ email: 'maya@example.com', password: 'secret123' });
    expect((await api.listMembers(profileId)).map((m) => m.email).sort()).toEqual(['lea@example.com', 'sami@example.com']);
  });
});
