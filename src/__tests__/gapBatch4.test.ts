/**
 * Gap review of November 2026, batch 4 (people and rights), as the demo server follows it. The
 * same attacks are tried on the real database in supabase/tests/gap4_scenario.sql.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { CHILD_DATA_CONSENT } from '../lib/consent';
import { noticeText } from '../lib/notices';
import { preset } from '../lib/permissions';

const api = new LocalBackend();
const SESSION = 'caa.session.v1';
const META = 'caa.session.meta.v1';
const PASSWORD = 'secret123';
const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};
const signUp = async (role: 'parent' | 'pro', displayName: string, email: string) => {
  const sent = await api.signUp({ role, displayName, email, password: PASSWORD });
  await api.verifyCode({ email }, sent.demoCode!);
};
const signIn = (email: string) => api.signIn({ email, password: PASSWORD });
/** The same session, its last proof long ago. */
const stale = async () => AsyncStorage.setItem(META, JSON.stringify({ aal: 'aal1', proofAt: 0 }));
const verify = async (email: string) => {
  await signIn(email);
  await api.saveVerification({ fullName: email, country: 'France', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
  await api.submitVerification();
  await api.demoOpenBackOffice();
  await api.adminDecideVerification((await api.adminVerifications()).find((v) => v.email === email)!.userId, 'verified');
};
const idOf = async (profileId: string, name: string) => (await api.listMembers(profileId)).find((m) => m.displayName === name)!.userId;
const join = async (email: string) => {
  await signIn(email);
  const inv = (await api.myInvitations()).received.find((i) => i.status === 'pending')!;
  await api.respondInvitation(inv.id, true);
};

let adam = '';

beforeAll(async () => {
  await AsyncStorage.clear();
  await signUp('pro', 'Sarah', 'sarah@clinic.fr');
  await verify('sarah@clinic.fr');
  await signUp('pro', 'Marc', 'marc@school.lb');
  for (const [name, email] of [['Eve', 'eve@example.com'], ['Nadia', 'nadia@example.com'], ['Tina', 'tina@example.com'], ['Rita', 'rita@example.com']]) await signUp('parent', name, email);
  await signIn('eve@example.com');
  adam = (await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile(), consent: CHILD_DATA_CONSENT })).id;
  await api.invite(adam, { email: 'nadia@example.com', name: 'Nadia', role: 'family', ...preset('family') });
  const tina = await api.invite(adam, { email: 'tina@example.com', name: 'Tina', role: 'caregiver', ...preset('caregiver'), perms: { ...preset('caregiver').perms, manager: true } });
  expect(tina.perms.manager).toBe(false);
  await api.invite(adam, { email: 'sarah@clinic.fr', name: 'Sarah', role: 'therapist', ...preset('therapist') });
  await join('nadia@example.com');
  await join('tina@example.com');
  await join('sarah@clinic.fr');
});

describe('"Acts as a parent"', () => {
  it('is the owner’s switch, after a fresh proof, for a family’s account only', async () => {
    await signIn('eve@example.com');
    const nadia = await idOf(adam, 'Nadia');
    await stale();
    await expectCode(api.updateMember(adam, nadia, { perms: { ...preset('family').perms, manager: true } }), 'proof_needed');
    await signIn('eve@example.com');
    await expectCode(api.updateMember(adam, await idOf(adam, 'Sarah'), { perms: { ...preset('therapist').perms, manager: true } }), 'invalid');
    await expectCode(api.invite(adam, { role: 'parent', ...preset('parent') }), 'forbidden');
    await api.updateMember(adam, nadia, { perms: { ...preset('family').perms, manager: true } });
    expect((await api.listMembers(adam)).find((m) => m.userId === nadia)).toMatchObject({ role: 'parent', level: 3, perms: { manager: true, invite: true, viewData: true } });
  });

  it('a co-parent gives nobody the family’s place, does not change her own access, nor remove another parent', async () => {
    await signIn('eve@example.com');
    const tina = await idOf(adam, 'Tina');
    await signIn('nadia@example.com');
    const nadia = await idOf(adam, 'Nadia');
    await expectCode(api.updateMember(adam, tina, { perms: { ...preset('caregiver').perms, manager: true } }), 'forbidden');
    await expectCode(api.updateMember(adam, nadia, { role: 'family' }), 'forbidden');
    await api.updateMember(adam, tina, { perms: { ...preset('caregiver').perms, manageDevices: true } });
    await signIn('eve@example.com');
    await api.updateMember(adam, tina, { perms: { ...preset('caregiver').perms, manager: true } });
    await signIn('nadia@example.com');
    await expectCode(api.revokeMember(adam, tina), 'forbidden');
    await signIn('eve@example.com');
    await api.updateMember(adam, tina, { perms: { ...preset('caregiver').perms, manager: false, invite: true, manageDevices: true } });
    expect((await api.listMembers(adam)).find((m) => m.userId === tina)).toMatchObject({ role: 'family', perms: { manager: false, invite: false, manageDevices: false } });
    await expectCode(api.updateMember(adam, tina, { role: 'parent' }), 'invalid');
    await api.updateMember(adam, tina, { role: 'caregiver', perms: { ...preset('caregiver').perms, manageDevices: true } });
  });
});

describe('"Manage devices"', () => {
  it('sees the devices, removes the child’s tablets, makes "use only" codes; never a full-access code or a parent’s phone', async () => {
    await signIn('eve@example.com');
    await api.registerDevice(adam, { id: 'evephone', name: 'iPhone', kind: 'companion', platform: 'ios' });
    const { code } = await api.createPairingCode(adam, 'use');
    await api.signOut();
    await api.redeemPairingCode(code, { id: 'tab1', name: 'Tablette', platform: 'android' });
    await signIn('tina@example.com');
    expect((await api.listDevices(adam)).map((d) => d.id).sort()).toEqual(['evephone', 'tab1']);
    expect((await api.createPairingCode(adam, 'use')).code).toHaveLength(8);
    await expectCode(api.createPairingCode(adam, 'full'), 'forbidden');
    await expectCode(api.revokeDevice(adam, 'evephone'), 'forbidden');
    await api.revokeDevice(adam, 'tab1');
    await signIn('sarah@clinic.fr');
    expect(await api.listDevices(adam)).toEqual([]);
  });
});

describe('therapists and teachers are verified professional accounts', () => {
  it('a family’s account is refused as a teacher; a professional not yet accepted waits', async () => {
    await signIn('eve@example.com');
    await expectCode(api.invite(adam, { email: 'rita@example.com', role: 'teacher', ...preset('teacher') }), 'pro_account_needed');
    const byCode = await api.invite(adam, { name: 'Teacher', role: 'teacher', ...preset('teacher') });
    const code = await api.connectionCode(adam);
    await signIn('rita@example.com');
    await expectCode(api.acceptInvitationCode(byCode.code), 'pro_account_needed');
    await expectCode(api.requestConnection(code, { role: 'therapist', ...preset('therapist') }), 'pro_account_needed');
    await signIn('marc@school.lb');
    await expectCode(api.acceptInvitationCode(byCode.code), 'pro_not_verified');
  });

  it('given another role by the family, someone waiting opens the board again; the board and the family are untouched', async () => {
    await signIn('eve@example.com');
    await api.invite(adam, { email: 'rita@example.com', name: 'Rita', role: 'family', ...preset('family') });
    await join('rita@example.com');
    // (as someone who joined as a teacher with a family's account before this rule)
    const raw = JSON.parse((await AsyncStorage.getItem('caa.server.v1'))!);
    raw.members.find((m: { displayName: string; profileId: string }) => m.displayName === 'Rita' && m.profileId === adam).role = 'teacher';
    await AsyncStorage.setItem('caa.server.v1', JSON.stringify(raw));
    await expectCode(api.getProfile(adam), 'forbidden');
    await signIn('eve@example.com');
    const rita = (await api.listMembers(adam)).find((m) => m.displayName === 'Rita')!;
    expect(rita.waiting).toBe(true);
    expect((await api.getProfile(adam)).data.boards.core).toBeTruthy();
    await api.updateMember(adam, rita.userId, { role: 'caregiver' });
    await signIn('rita@example.com');
    expect((await api.getProfile(adam)).id).toBe(adam);
  });
});

describe('a child’s name and age', () => {
  it('the owner changes them; a member does not', async () => {
    await signIn('eve@example.com');
    const waiting = await api.invite(adam, { email: 'someone@example.com', role: 'family', ...preset('family') });
    await api.updateChild(adam, { name: '  Adam   Junior ', age: 7 });
    expect((await api.listProfiles()).find((p) => p.id === adam)).toMatchObject({ name: 'Adam Junior', age: 7 });
    expect((await api.profileInvitations(adam)).find((i) => i.id === waiting.id)?.childName).toBe('Adam Junior');
    await expectCode(api.updateChild(adam, { name: '  ' }), 'invalid');
    await expectCode(api.updateChild(adam, { name: 'Adam', age: 99 }), 'invalid');
    await signIn('tina@example.com');
    await expectCode(api.updateChild(adam, { name: 'Bob' }), 'forbidden');
  });
});

describe('leaving a team; asking again after a refusal', () => {
  it('a professional asks again a week after a refusal, never with the family’s rights', async () => {
    await signIn('eve@example.com');
    await api.revokeMember(adam, await idOf(adam, 'Sarah'));
    const code = await api.connectionCode(adam);
    await signIn('sarah@clinic.fr');
    const req = await api.requestConnection(code, { role: 'therapist', ...preset('therapist'), message: 'Bonjour' });
    await signIn('eve@example.com');
    await api.respondInvitation(req.id, false);
    await signIn('sarah@clinic.fr');
    await expectCode(api.askAgain(req.id), 'ask_later');
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 8 * 86_400_000);
    try {
      const again = await api.askAgain(req.id);
      expect(again).toMatchObject({ status: 'pending', message: 'Bonjour', perms: { manager: false } });
    } finally {
      jest.restoreAllMocks();
    }
  });

  it('a member leaves; the owner and a tablet do not "leave"', async () => {
    await signIn('tina@example.com');
    await api.leaveTeam(adam);
    await expectCode(api.getProfile(adam), 'forbidden');
    await expectCode(api.leaveTeam(adam), 'not_found');
    await signIn('eve@example.com');
    await expectCode(api.leaveTeam(adam), 'forbidden');
    const told = (await api.listNotices()).find((n) => n.text.includes('a quitté'));
    expect(told && noticeText(told.text, 'en')).toBe('Tina left Adam Junior’s team.');
  });
});

describe('handing the child to the other parent', () => {
  it('the other parent accepts with their consent; the team, the code and the choices stay', async () => {
    await signIn('eve@example.com');
    const nadia = await idOf(adam, 'Nadia');
    const pin = (await api.getProfile(adam)).data.settings.pin;
    await stale();
    await expectCode(api.offerProfile(adam, nadia), 'proof_needed');
    await signIn('eve@example.com');
    await expectCode(api.offerProfile(adam, await idOf(adam, 'Rita')), 'invalid');
    const offer = await api.offerProfile(adam, nadia);
    expect((await api.ownedProfiles())[0]).toMatchObject({ name: 'Adam Junior', offeredTo: nadia, parents: [{ userId: nadia, name: 'Nadia' }] });
    await signIn('nadia@example.com');
    await expectCode(api.respondInvitation(offer.id, true), 'consent_needed');
    await api.giveConsent(CHILD_DATA_CONSENT);
    await api.respondInvitation(offer.id, true);
    expect((await api.listProfiles()).find((p) => p.id === adam)?.access).toBe('owner');
    const team = await api.listMembers(adam);
    expect(team.find((m) => m.displayName === 'Eve')).toMatchObject({ role: 'parent', perms: { manager: true } });
    expect(team.some((m) => m.displayName === 'Rita' && m.status === 'active')).toBe(true);
    expect((await api.getProfile(adam)).data.settings.pin).toBe(pin);
    await signIn('eve@example.com');
    await expectCode(api.offerProfile(adam, nadia), 'forbidden');
  });
});

describe('deleting one’s account', () => {
  it('names the children first; the team is told', async () => {
    await signIn('nadia@example.com');
    const owned = await api.ownedProfiles();
    expect(owned.map((p) => [p.name, p.people.includes('Eve')])).toEqual([['Adam Junior', true]]);
    await expectCode(api.deleteAccount(), 'profiles_left');
    await api.deleteAccount(owned.map((p) => p.id));
    await signIn('eve@example.com');
    expect(await api.listProfiles()).toEqual([]);
    const told = (await api.listNotices()).find((n) => n.text.includes('effacé'));
    expect(told && noticeText(told.text, 'en')).toBe('Adam Junior’s profile was erased: Nadia deleted their account.');
  });
});

describe('changing the password with two-step sign-in on', () => {
  it('the authenticator code proves it, and the session keeps its second step', async () => {
    await signIn('eve@example.com');
    const setup = await api.twoStepStart();
    await api.twoStepConfirm(setup.factorId, (await api.demoTwoStepCode())!);
    await api.changePassword((await api.demoTwoStepCode())!, 'newpassword1', 'twoStep');
    expect((await api.security()).level).toBe('aal2');
    await api.signOut();
    await expect(api.signIn({ email: 'eve@example.com', password: 'newpassword1' })).resolves.toMatchObject({ email: 'eve@example.com' });
    expect(await AsyncStorage.getItem(SESSION)).toBeTruthy();
  });
});
