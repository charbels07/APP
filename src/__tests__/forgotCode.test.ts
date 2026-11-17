/**
 * "Forgot the code?" on the caregiver keypad: only the family is offered a way around the code,
 * after showing again that the signed-in account is theirs. The new code is then saved like any
 * change of the profile, which the server accepts only from the family.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import type { Account } from '../backend/types';
import { DEFAULT_PREFS } from '../backend/types';
import { createDefaultProfile } from '../data/defaults';
import { GUIDE } from '../data/guide';
import { strings } from '../i18n/ui';
import { forgotCodeWays } from '../lib/forgotCode';
import { preset } from '../lib/permissions';

const acc = (patch: Partial<Account>): Account => ({
  id: 'u1',
  role: 'parent',
  displayName: 'Rita',
  provider: 'email',
  email: 'rita@example.com',
  verified: true,
  createdAt: 0,
  prefs: { ...DEFAULT_PREFS },
  ...patch,
});

describe('who is offered "Forgot the code?"', () => {
  it('the family: password, or a code sent to the account’s own e-mail or phone', () => {
    expect(forgotCodeWays({ account: acc({}), manager: true, ownCode: false })).toEqual({ password: true, code: 'email', account: 'rita@example.com' });
    // Google / Apple accounts have no password in the app: only the code by e-mail.
    expect(forgotCodeWays({ account: acc({ provider: 'google' }), manager: true, ownCode: false })).toEqual({ password: false, code: 'email', account: 'rita@example.com' });
    expect(forgotCodeWays({ account: acc({ provider: 'phone', email: undefined, phone: '+96170123456' }), manager: true, ownCode: false })).toEqual({
      password: true,
      code: 'phone',
      account: '+96170123456',
    });
  });

  it('never a linked tablet, a professional, someone who may not change the code, or the preview', () => {
    expect(forgotCodeWays({ account: acc({ provider: 'device', email: undefined }), manager: true, ownCode: false })).toBeNull();
    expect(forgotCodeWays({ account: acc({ role: 'pro' }), manager: true, ownCode: false })).toBeNull();
    // A professional's board asks her own code: the family's is not hers to change.
    expect(forgotCodeWays({ account: acc({}), manager: true, ownCode: true })).toBeNull();
    // An editor of the team (not managing the profile): the database refuses the code from them.
    expect(forgotCodeWays({ account: acc({}), manager: false, ownCode: false })).toBeNull();
    expect(forgotCodeWays({ account: null, manager: false, ownCode: false })).toBeNull();
    // No password and nowhere to send a code.
    expect(forgotCodeWays({ account: acc({ provider: 'apple', email: undefined }), manager: true, ownCode: false })).toBeNull();
  });
});

describe('demo server: showing the account is yours again', () => {
  const api = new LocalBackend();
  const expectCode = async (p: Promise<unknown>, c: string) => {
    await expect(p).rejects.toBeInstanceOf(BackendError);
    await expect(p).rejects.toMatchObject({ code: c });
  };
  let adam = '';

  beforeAll(async () => {
    await AsyncStorage.clear();
    const sent = await api.signUp({ role: 'parent', displayName: 'Rita', email: 'rita@example.com', password: 'secret123' });
    await api.verifyCode({ email: 'rita@example.com' }, sent.demoCode!);
    adam = (await api.createProfile({ name: 'Adam', data: createDefaultProfile() })).id;
  });

  it('with the account’s password', async () => {
    await expectCode(api.confirmIdentity({ password: 'wrong-one' }), 'wrong_credentials');
    await expect(api.confirmIdentity({ password: 'secret123' })).resolves.toBeUndefined();
    expect((await api.currentAccount())!.email).toBe('rita@example.com');
  });

  it('with a code sent to the account’s own address, used once', async () => {
    const sent = await api.sendIdentityCode();
    expect(sent.sentTo).toBe('rita@example.com');
    await expectCode(api.confirmIdentity({ code: '000000' === sent.demoCode ? '111111' : '000000' }), 'code_invalid');
    await expect(api.confirmIdentity({ code: sent.demoCode! })).resolves.toBeUndefined();
    await expectCode(api.confirmIdentity({ code: sent.demoCode! }), 'code_expired');
  });

  it('the family then saves its new code; an editor of the team cannot', async () => {
    const cur = await api.getProfile(adam);
    const saved = await api.saveProfile(adam, { ...cur.data, settings: { ...cur.data.settings, pin: '5829' } }, cur.version);
    expect(saved.ok).toBe(true);
    // A grandparent allowed to edit the board directly, but not managing the profile.
    await api.invite(adam, { email: 'nadia@example.com', role: 'family', level: 3, perms: preset('family').perms });
    await api.signOut();
    const sent = await api.signUp({ role: 'parent', displayName: 'Nadia', email: 'nadia@example.com', password: 'grandma12' });
    await api.verifyCode({ email: 'nadia@example.com' }, sent.demoCode!);
    const inv = (await api.myInvitations()).received[0];
    await api.respondInvitation(inv.id, true);
    const now = await api.getProfile(adam);
    await expectCode(api.saveProfile(adam, { ...now.data, settings: { ...now.data.settings, pin: '7391' } }, now.version), 'consent_protected');
    expect((await api.getProfile(adam)).data.settings.pin).toBe('5829');
  });

  it('a tablet linked with a code has no account of its own to show: refused', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const { code } = await api.createPairingCode(adam, 'full');
    await api.signOut();
    await api.redeemPairingCode(code, { id: 'tab-1', name: 'Tablette', platform: 'ios' });
    await expectCode(api.sendIdentityCode(), 'forbidden');
    await expectCode(api.confirmIdentity({ password: 'secret123' }), 'forbidden');
  });

  it('nobody signed in: nothing to confirm', async () => {
    await api.signOut();
    await expectCode(api.sendIdentityCode(), 'not_signed_in');
    await expectCode(api.confirmIdentity({ password: 'secret123' }), 'not_signed_in');
  });
});

describe('words of "Forgot the code?"', () => {
  it('exist in the three languages and the guide names the button as it is written', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const t = strings(lang);
      const caregiver = GUIDE.find((c) => c.id === 'caregiver')!.steps[lang].join(' ');
      expect(caregiver).toContain(t.pinForgot);
      // The code is changed in the group shown on screen.
      expect(caregiver).toContain(t.gCodeData);
      expect(t.pinWhy.join(' ')).toContain(t.gCodeData);
    }
    expect(strings('en').pinForgot).toBe('Forgot the code?');
  });
});
