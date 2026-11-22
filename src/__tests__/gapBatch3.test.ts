/**
 * Gap review of November 2026, batch 3: the rules the database gained, as the demo server
 * follows them (the same attacks are tried on the real database in
 * supabase/tests/gap3_scenario.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import type { Observation } from '../backend/types';
import { createDefaultProfile } from '../data/defaults';
import { adminStrings } from '../i18n/admin';
import { productStrings } from '../i18n/product';
import { familyCodeUnset } from '../lib/caregiverCode';
import { noticeText } from '../lib/notices';
import { preset } from '../lib/permissions';
import { migrate } from '../lib/storage';
import { UsageTracker } from '../state/usageTracker';

const api = new LocalBackend();
const SESSION = 'caa.session.v1';
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
/** A tablet is linked on a device where nobody is signed in; `be` comes back to it later. */
const linkTablet = async (code: string, id: string, name: string): Promise<string> => {
  await api.signOut();
  await api.redeemPairingCode(code, { id, name, platform: 'android' });
  return (await AsyncStorage.getItem(SESSION))!;
};
const be = (session: string) => AsyncStorage.setItem(SESSION, session);
const save = async (id: string, edit: (p: ReturnType<typeof createDefaultProfile>) => void) => {
  const cur = await api.getProfile(id);
  const next = structuredClone(cur.data);
  edit(next);
  return api.saveProfile(id, next, cur.version);
};
const observation = (profileId: string, utterance: string): Omit<Observation, 'id' | 'createdBy' | 'authorName' | 'createdAt'> => ({ profileId, at: Date.now(), utterance });

let adam = '';
let tablet = '';

beforeAll(async () => {
  await AsyncStorage.clear();
  await signUp('pro', 'Sarah K.', 'sarah@clinic.fr');
  await api.saveVerification({ fullName: 'Sarah Khoury', country: 'France', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
  await api.submitVerification();
  await api.demoOpenBackOffice();
  const req = (await api.adminVerifications()).find((v) => v.email === 'sarah@clinic.fr')!;
  await api.adminDecideVerification(req.userId, 'verified');
  await signUp('parent', 'Eve', 'eve@example.com');
  await signUp('parent', 'Nadia', 'nadia@example.com');
  // Tina is a teacher: since batch 4, a professional account accepted by the app's team.
  await signUp('pro', 'Tina', 'tina@example.com');
  await api.saveVerification({ fullName: 'Tina T', country: 'Lebanon', profession: 'teacher', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
  await api.submitVerification();
  await api.demoOpenBackOffice();
  await api.adminDecideVerification((await api.adminVerifications()).find((v) => v.email === 'tina@example.com')!.userId, 'verified');
  await signUp('parent', '', 'nameless@example.com');
  await signIn('sarah@clinic.fr');
  adam = (await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() })).id;
});

describe('while a professional owns the profile', () => {
  it('a tablet she links cannot turn recording or sharing on, and nothing is stored', async () => {
    const { code } = await api.createPairingCode(adam, 'full');
    tablet = await linkTablet(code, 'tab1', 'Tablette');
    await expectCode(save(adam, (p) => void (p.settings.dataCollection = 'language')), 'consent_protected');
    await expectCode(save(adam, (p) => void (p.settings.shareStats = 'anonymous')), 'consent_protected');
    await expectCode(api.saveUsageDay(adam, { day: '2026-11-22', deviceId: 'tab1' } as never), 'forbidden');
    // The board itself is the tablet's to change.
    expect((await save(adam, (p) => void (p.settings.speechRate = 0.8))).ok).toBe(true);
  });
});

describe('the parents take the profile over', () => {
  it('they start with a team they know, and are told who is on it', async () => {
    await signIn('sarah@clinic.fr');
    const helper = await api.invite(adam, { name: 'Nadia', role: 'family', level: 3, perms: { ...preset('parent').perms, viewData: true } });
    await signIn('nadia@example.com');
    await api.acceptInvitationCode(helper.code);
    await signIn('sarah@clinic.fr');
    const waiting = await api.invite(adam, { email: 'tina@example.com', role: 'family', ...preset('family') });
    const use = await api.createPairingCode(adam, 'use');
    const forParents = await api.invite(adam, { role: 'parent', ...preset('parent') });
    await signIn('eve@example.com');
    await api.acceptInvitationCode(forParents.code);

    const team = await api.listMembers(adam);
    expect(team.filter((m) => m.status === 'active').map((m) => [m.displayName, m.role])).toEqual([
      ['Nadia', 'family'],
      ['Sarah K.', 'therapist'],
    ]);
    expect(team.every((m) => !m.perms.manager && !m.perms.invite && !m.perms.changeAccess && !m.perms.manageDevices && !m.perms.viewData)).toBe(true);
    expect(team.find((m) => m.role === 'device')?.status).toBe('revoked');
    expect((await api.profileInvitations(adam)).filter((i) => i.status === 'pending')).toEqual([]);
    const told = (await api.listNotices()).map((n) => noticeText(n.text, 'en'));
    expect(told).toContain('You are now the parent in charge of Adam’s profile. On the team: Nadia, Sarah K.. You decide their rights in Settings → Team.');

    // What was left behind opens nothing.
    await signIn('tina@example.com');
    await expectCode(api.acceptInvitationCode(waiting.code), 'code_invalid');
    await api.signOut();
    await expectCode(api.redeemPairingCode(use.code, { id: 'tab9', name: 'Autre', platform: 'ios' }), 'code_invalid');
    await be(tablet);
    await expectCode(api.getProfile(adam), 'forbidden');
  });
});

describe('the family’s caregiver code', () => {
  it('is received by the family and its tablets, not by a professional', async () => {
    await signIn('eve@example.com');
    expect((await save(adam, (p) => void (p.settings.pin = '4821'))).ok).toBe(true);
    await api.invite(adam, { email: 'tina@example.com', role: 'teacher', ...preset('teacher'), level: 3 });
    await signIn('nadia@example.com');
    expect((await api.getProfile(adam)).data.settings.pin).toBe('4821');
    await signIn('tina@example.com');
    await api.respondInvitation((await api.myInvitations()).received.find((i) => i.status === 'pending')!.id, true);
    expect((await api.getProfile(adam)).data.settings.pin).toBeUndefined();
    await signIn('sarah@clinic.fr');
    const hers = await api.getProfile(adam);
    expect(hers.data.settings.pin).toBeUndefined();
    // The app copes with a board that arrives without a code: none is "chosen", her own is asked.
    expect(familyCodeUnset(migrate(hers.data).settings.pin)).toBe(true);
  });

  it('a code sent by a professional changes nothing; her changes to the board are kept', async () => {
    expect((await save(adam, (p) => void ((p.settings.pin = '0000'), (p.settings.speechRate = 0.7)))).ok).toBe(true);
    const late = await api.saveProfile(adam, createDefaultProfile(), 1);
    expect(late.ok === false && late.conflict.data.settings.pin).toBeUndefined();
    await signIn('eve@example.com');
    const now = (await api.getProfile(adam)).data.settings;
    expect([now.pin, now.speechRate]).toEqual(['4821', 0.7]);
  });
});

describe('someone removed from the team', () => {
  it('does not come back with an invitation that was waiting, nor with one they wrote', async () => {
    await api.updateMember(adam, (await api.listMembers(adam)).find((m) => m.displayName === 'Nadia')!.userId, { perms: { ...preset('family').perms, invite: true } });
    const again = await api.invite(adam, { email: 'nadia@example.com', role: 'family', ...preset('family') });
    await signIn('nadia@example.com');
    const friend = await api.invite(adam, { name: 'A friend', role: 'other', ...preset('other') });
    const self = await api.invite(adam, { email: 'nadia@example.com', role: 'other', ...preset('other') });
    await expectCode(api.respondInvitation(self.id, true), 'forbidden');
    await expectCode(api.invite(adam, { role: 'parent', ...preset('parent') }), 'forbidden');
    await expectCode(api.invite(adam, { role: 'device', ...preset('device') }), 'invalid');
    await signIn('eve@example.com');
    await api.revokeMember(adam, (await api.listMembers(adam)).find((m) => m.displayName === 'Nadia')!.userId);
    expect((await api.profileInvitations(adam)).filter((i) => i.status === 'pending')).toEqual([]);
    await signIn('nadia@example.com');
    await expectCode(api.respondInvitation(again.id, true), 'not_found');
    await expectCode(api.getProfile(adam), 'forbidden');
    await signIn('nameless@example.com');
    await expectCode(api.acceptInvitationCode(friend.code), 'code_invalid');
  });

  it('an access with an end date is not made longer by an invitation that was already waiting', async () => {
    await signIn('eve@example.com');
    const tina = (await api.listMembers(adam)).find((m) => m.displayName === 'Tina')!.userId;
    await api.invite(adam, { email: 'tina@example.com', role: 'teacher', ...preset('teacher') });
    const until = Date.now() + 7 * 86_400_000;
    await api.updateMember(adam, tina, { expiresAt: until });
    await signIn('tina@example.com');
    await api.respondInvitation((await api.myInvitations()).received.find((i) => i.status === 'pending')!.id, true);
    await signIn('eve@example.com');
    expect((await api.listMembers(adam)).find((m) => m.userId === tina)?.expiresAt).toBe(until);
  });

  it('a person with no name is shown as "—", never by their address', async () => {
    const code = await api.connectionCode(adam);
    await signIn('nameless@example.com');
    await expectCode(api.requestConnection(code, { role: 'parent', ...preset('family') }), 'invalid');
    const req = await api.requestConnection(code, { role: 'caregiver', ...preset('caregiver') });
    expect(req.fromName).toBe('—');
    await signIn('eve@example.com');
    await api.approveRequest(req.id, preset('caregiver'));
    expect(JSON.stringify(await api.listNotices())).not.toContain('nameless@');
    expect((await api.listMembers(adam)).map((m) => m.displayName)).toContain('—');
  });
});

describe('a tablet linked with full access', () => {
  it('does what its screens show: the board, the devices, "use only" codes; nothing about the team or the follow-up', async () => {
    await signIn('eve@example.com');
    const others = await api.listMembers(adam);
    await api.registerDevice(adam, { id: 'evephone', name: 'iPhone', kind: 'companion', platform: 'ios' });
    await save(adam, (p) => void (p.settings.dataCollection = 'usage'));
    await api.saveUsageDay(adam, { day: '2026-11-22', deviceId: 'evephone', level: 'usage', selections: 3 } as never);
    const { code } = await api.createPairingCode(adam, 'full');
    tablet = await linkTablet(code, 'tab2', 'Tablette salon');

    expect((await save(adam, (p) => void (p.settings.speechRate = 0.9))).ok).toBe(true);
    expect((await api.createPairingCode(adam, 'use')).code).toHaveLength(8);
    await expect(api.createPairingCode(adam, 'full')).rejects.toBeInstanceOf(BackendError);
    const someone = others.find((m) => m.displayName === 'Tina')!.userId;
    await expectCode(api.revokeMember(adam, someone), 'forbidden');
    await expectCode(api.updateMember(adam, someone, { level: 3 }), 'forbidden');
    await expectCode(api.connectionCode(adam), 'forbidden');
    await expectCode(api.invite(adam, { role: 'family', ...preset('family') }), 'forbidden');
    await expectCode(api.deleteUsage(adam), 'forbidden');
    await expectCode(api.listUsage(adam, '2026-01-01'), 'forbidden');
    await expectCode(api.listObservations(adam), 'forbidden');
    await expectCode(save(adam, (p) => void (p.settings.dataCollection = 'off')), 'consent_protected');
    await expectCode(api.revokeDevice(adam, 'evephone'), 'forbidden');
    expect((await api.listMembers(adam)).filter((m) => m.role !== 'device').every((m) => m.email === undefined)).toBe(true);

    // It keeps the name it was given when it was linked.
    const again = await api.registerDevice(adam, { id: 'tab2', name: 'Android', kind: 'companion', platform: 'android', appVersion: '1.4.0' });
    expect([again.name, again.kind, again.appVersion]).toEqual(['Tablette salon', 'primary', '1.4.0']);

    await signIn('eve@example.com');
    expect(await api.listUsage(adam, '2026-01-01')).toHaveLength(1);
  });
});

describe('follow-up', () => {
  it('a day is saved by the device it belongs to', async () => {
    await signIn('tina@example.com');
    await api.registerDevice(adam, { id: 'tinaphone', name: 'iPhone', kind: 'companion', platform: 'ios' });
    await expectCode(api.saveUsageDay(adam, { day: '2026-11-22', deviceId: 'evephone', level: 'usage', selections: 0 } as never), 'forbidden');
    await expectCode(api.listUsage(adam, '2026-01-01'), 'forbidden');
  });

  it('an observation is changed or deleted by who wrote it, or by the family', async () => {
    await signIn('eve@example.com');
    const tina = (await api.listMembers(adam)).find((m) => m.displayName === 'Tina')!.userId;
    await api.updateMember(adam, tina, { perms: { ...preset('teacher').perms, viewData: true } });
    const mums = await api.saveObservation(observation(adam, 'veux gâteau'));
    await signIn('tina@example.com');
    const hers = await api.saveObservation(observation(adam, 'encore'));
    await expectCode(api.saveObservation({ ...observation(adam, 'changed'), id: mums.id }), 'forbidden');
    await expectCode(api.deleteObservation(mums.id), 'forbidden');
    expect((await api.saveObservation({ ...observation(adam, 'encore !'), id: hers.id })).utterance).toBe('encore !');
    // Her own file holds what she wrote while she may read the follow-up; not once removed.
    await api.checkPassword(PASSWORD);
    expect(((await api.exportMyData()) as { observations: Observation[] }).observations.map((o) => o.utterance)).toEqual(['encore !']);
    await signIn('eve@example.com');
    await api.revokeMember(adam, tina);
    await signIn('tina@example.com');
    expect(((await api.exportMyData()) as { observations: Observation[] }).observations).toEqual([]);
    await signIn('eve@example.com');
    await api.deleteObservation(hers.id);
    expect((await api.listObservations(adam)).map((o) => o.utterance)).toEqual(['veux gâteau']);
  });

  it('a day the server will never take leaves the list; the days after it are sent', async () => {
    const clock = new Date(2026, 10, 22, 9, 0, 0).getTime();
    const t = await UsageTracker.open(api, adam, 'evephone', 'ios', () => 'usage', () => clock);
    t.record({ type: 'select', concept: 'want', mode: 'core' });
    const real = api.saveUsageDay.bind(api);
    const sent: string[] = [];
    const spy = jest.spyOn(api, 'saveUsageDay').mockImplementation(async (id, d) => {
      sent.push(d.day);
      if (d.day < '2026-11-01') throw new BackendError('invalid');
      return real(id, d);
    });
    try {
      // A day kept on the device longer than the server accepts (it refuses days older than 60).
      const store = (t as unknown as { store: { days: Record<string, unknown>; pending: string[] } }).store;
      store.days['2026-08-01'] = { ...(store.days['2026-11-22'] as object), day: '2026-08-01' };
      store.pending.unshift('2026-08-01');
      await t.flush();
      expect(sent).toEqual(['2026-08-01', '2026-11-22']);
      expect(store.pending).not.toContain('2026-08-01');
      sent.length = 0;
      await t.flush();
      expect(sent).toEqual(['2026-11-22']);
    } finally {
      spy.mockRestore();
      t.close();
    }
  });
});

describe('a professional’s own file', () => {
  it('holds the profiles she created without a code, and none once her acceptance is withdrawn', async () => {
    await signIn('sarah@clinic.fr');
    const lina = await api.createProfile({ name: 'Lina', data: createDefaultProfile() });
    await api.checkPassword(PASSWORD);
    const file = (await api.exportMyData()) as { children: { id: string; data: { settings: { pin?: string } } }[] };
    expect(file.children.map((c) => c.id)).toEqual([lina.id]);
    expect(file.children[0].data.settings.pin).toBeUndefined();
    await api.demoSetVerificationStatus!('rejected', 'x');
    expect(((await api.exportMyData()) as { children: unknown[] }).children).toEqual([]);
    await api.demoSetVerificationStatus!('verified');
  });
});

describe('figures the back office does not show as a number', () => {
  it('a group of 1 to 4 families is written "fewer than 5", in the three languages', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const a = adminStrings(lang);
      const x = productStrings(lang);
      for (const text of [a.notEnough(null, 5), x.notEnough(null, 5), x.agreed(null), x.decideNote(null), x.sharingLine(null, null, 12), a.teamLines(2, 3, a.fewer)]) {
        expect(text).not.toMatch(/null|undefined/);
      }
      expect(a.notEnough(null, 5)).not.toBe(a.notEnough(0, 5));
      expect(x.sharingLine(null, null, 12)).toContain('12');
      expect(a.fewer).toMatch(/5/);
    }
  });
});
