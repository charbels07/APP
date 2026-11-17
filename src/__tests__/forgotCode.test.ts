/**
 * "Forgot the code?" on the caregiver keypad: who is offered a way around the code, the account's
 * password as one proof (the e-mailed code is tested in localBackend.test.ts), and the database
 * rule that the new family code is saved only from the family.
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
  it('the family: its password, or a code sent to the account’s own e-mail or phone', () => {
    expect(forgotCodeWays({ account: acc({}), manager: true, ownCode: false })).toEqual({ contact: { email: 'rita@example.com' }, to: 'rita@example.com', password: true });
    // Google / Apple accounts have no password in the app: only the e-mailed code.
    expect(forgotCodeWays({ account: acc({ provider: 'google' }), manager: true, ownCode: false })?.password).toBe(false);
    expect(forgotCodeWays({ account: acc({ provider: 'phone', email: undefined, phone: '+96170123456' }), manager: true, ownCode: false })).toEqual({
      contact: { phone: '+96170123456' },
      to: '+96170123456',
      password: true,
    });
  });

  it('a professional only for her own code, never the family’s', () => {
    const pro = acc({ role: 'pro', email: 'sarah@clinic.fr' });
    expect(forgotCodeWays({ account: pro, manager: false, ownCode: true })?.to).toBe('sarah@clinic.fr');
    expect(forgotCodeWays({ account: pro, manager: false, ownCode: false })).toBeNull();
  });

  it('never a linked tablet, someone who may not change the family’s code, or nobody signed in', () => {
    expect(forgotCodeWays({ account: acc({ provider: 'device', email: undefined }), manager: true, ownCode: false })).toBeNull();
    // An editor of the team (not managing the profile): the database refuses the code from them.
    expect(forgotCodeWays({ account: acc({}), manager: false, ownCode: false })).toBeNull();
    expect(forgotCodeWays({ account: null, manager: true, ownCode: false })).toBeNull();
    // Nowhere to send a code.
    expect(forgotCodeWays({ account: acc({ provider: 'apple', email: undefined }), manager: true, ownCode: false })).toBeNull();
  });
});

describe('demo server: the account’s password, and the new code saved', () => {
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

  it('checks the signed-in account’s password without changing anything', async () => {
    await expectCode(api.checkPassword('wrong-one'), 'wrong_credentials');
    await expect(api.checkPassword('secret123')).resolves.toBeUndefined();
    expect((await api.currentAccount())!.email).toBe('rita@example.com');
    await api.signOut();
    await expect(api.signIn({ email: 'rita@example.com', password: 'secret123' })).resolves.toMatchObject({ email: 'rita@example.com' });
  });

  it('the family then saves its new code; an editor of the team cannot', async () => {
    const cur = await api.getProfile(adam);
    expect((await api.saveProfile(adam, { ...cur.data, settings: { ...cur.data.settings, pin: '5829' } }, cur.version)).ok).toBe(true);
    // A grandparent allowed to edit the board directly, but not managing the profile.
    await api.invite(adam, { email: 'nadia@example.com', role: 'family', level: 3, perms: preset('family').perms });
    await api.signOut();
    const sent = await api.signUp({ role: 'parent', displayName: 'Nadia', email: 'nadia@example.com', password: 'grandma12' });
    await api.verifyCode({ email: 'nadia@example.com' }, sent.demoCode!);
    await api.respondInvitation((await api.myInvitations()).received[0].id, true);
    const now = await api.getProfile(adam);
    await expectCode(api.saveProfile(adam, { ...now.data, settings: { ...now.data.settings, pin: '7391' } }, now.version), 'consent_protected');
    expect((await api.getProfile(adam)).data.settings.pin).toBe('5829');
  });

  it('a Google account has no password to check', async () => {
    await api.signInWithProvider('google', 'parent');
    await expectCode(api.checkPassword('anything1'), 'wrong_credentials');
  });

  it('a tablet linked with a code has no password: refused', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const { code } = await api.createPairingCode(adam, 'full');
    await api.signOut();
    await api.redeemPairingCode(code, { id: 'tab-1', name: 'Tablette', platform: 'ios' });
    await expectCode(api.checkPassword('secret123'), 'forbidden');
    await api.signOut();
    await expectCode(api.checkPassword('secret123'), 'not_signed_in');
  });
});

describe('words of "Forgot the code?"', () => {
  it('the guide names the button as written, and the code is changed in the group shown on screen', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const t = strings(lang);
      const caregiver = GUIDE.find((c) => c.id === 'caregiver')!.steps[lang].join(' ');
      expect(caregiver).toContain(t.pinForgot);
      expect(caregiver).toContain(t.gCodeData);
      expect(t.pinWhy.join(' ')).toContain(t.gCodeData);
      expect(t.pinWhyPro.join(' ')).toContain(t.gCodeData);
      expect(t.pinForgotIntroPw).toContain('{to}');
    }
  });
});
