import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { diffProfiles } from '../lib/profileDiff';
import { preset } from '../lib/permissions';

const api = new LocalBackend();
const code = async (p: Promise<{ demoCode?: string }>) => (await p).demoCode!;
const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};

const DOCS = [
  { name: 'diplome.pdf', kind: 'diploma' as const, uploadedAt: 1, ref: 'x' },
  { name: 'passeport.jpg', kind: 'id' as const, uploadedAt: 1, ref: 'y' },
];
/** The signed-in professional sends a certificate; the app's team accepts it in the back office. */
const getAccepted = async (email: string, password: string, fullName: string) => {
  await api.saveVerification({ fullName, country: 'Liban', profession: 'teacher', documents: DOCS });
  await api.submitVerification();
  await api.demoOpenBackOffice();
  const req = (await api.adminVerifications()).find((v) => v.email === email)!;
  await api.adminDecideVerification(req.userId, 'verified');
  await api.signIn({ email, password });
};

beforeAll(async () => {
  await AsyncStorage.clear();
});

describe('demo server: a parent and a therapist working together', () => {
  let profileId = '';

  it('parent signs up with a verification code and creates the child profile', async () => {
    const c = await code(api.signUp({ role: 'parent', displayName: 'Rita', email: 'Rita@Example.com', password: 'secret123' }));
    await expectCode(api.verifyCode({ email: 'rita@example.com' }, '000000'), 'code_invalid');
    const acc = await api.verifyCode({ email: 'rita@example.com' }, c);
    expect(acc).toMatchObject({ role: 'parent', verified: true, email: 'rita@example.com' });
    const rec = await api.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() });
    profileId = rec.id;
    expect((await api.listProfiles()).map((p) => [p.name, p.access])).toEqual([['Adam', 'owner']]);
  });

  it('invites a therapist who has no account yet; she joins once the back office accepted her certificate', async () => {
    const inv = await api.invite(profileId, { email: 'sarah@clinic.fr', name: 'Sarah', role: 'therapist', ...preset('therapist') });
    expect(inv).toMatchObject({ status: 'pending', role: 'therapist', level: 2 });
    await api.signOut();
    const c = await code(api.signUp({ role: 'pro', displayName: 'Sarah K.', email: 'sarah@clinic.fr', password: 'therapy123' }));
    await api.verifyCode({ email: 'sarah@clinic.fr' }, c);
    const { received } = await api.myInvitations();
    expect(received.map((i) => i.childName)).toEqual(['Adam']);
    expect((await api.listNotices())[0].kind).toBe('invitation');
    // Not before the app's team accepted her certificate.
    await expectCode(api.respondInvitation(received[0].id, true), 'pro_not_verified');
    await expectCode(api.submitVerification(), 'incomplete');
    await api.saveVerification({ fullName: 'Sarah Khoury', country: 'France', profession: 'slp', documents: DOCS });
    expect((await api.submitVerification()).status).toBe('pending');
    await expectCode(api.saveVerification({ fullName: 'X', country: 'France', profession: 'slp', documents: [] }), 'verification_locked');
    // The back office is closed to everybody but the app's team.
    expect(await api.isAdmin()).toBe(false);
    await expectCode(api.adminVerifications(), 'forbidden');
    await expectCode(api.adminDecideVerification('anyone', 'verified'), 'forbidden');

    await api.demoOpenBackOffice();
    expect(await api.isAdmin()).toBe(true);
    const list = await api.adminVerifications();
    expect(list[0].status).toBe('pending'); // the requests waiting come first
    const req = list.find((v) => v.email === 'sarah@clinic.fr')!;
    expect(req).toMatchObject({ status: 'pending', fullName: 'Sarah Khoury', children: 0 });
    await expectCode(api.adminDecideVerification(req.userId, 'more_info'), 'note_required');
    await api.adminDecideVerification(req.userId, 'verified');
    const after = (await api.adminVerifications()).find((v) => v.userId === req.userId)!;
    expect(after.status).toBe('verified');
    expect(after.documents.map((d) => d.kind)).toEqual(['diploma']); // the identity document is forgotten once decided
    expect((await api.adminLog())[0]).toMatchObject({ action: 'verified', targetName: 'Sarah Khoury' });

    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    expect((await api.listNotices())[0]).toMatchObject({ kind: 'verification' });
    await api.respondInvitation(received[0].id, true);
    expect(await api.myAccess(profileId)).toMatchObject({ owner: false, role: 'therapist', level: 2 });
  });

  it('a level-2 therapist cannot save directly, only propose', async () => {
    const rec = await api.getProfile(profileId);
    const draft = JSON.parse(JSON.stringify(rec.data));
    draft.boards.food.cells[0] = { concept: 'pizza' };
    await expectCode(api.saveProfile(profileId, draft, rec.version), 'forbidden');
    const prop = await api.createProposal(profileId, { title: 'Ajouter pizza', ops: diffProfiles(rec.data, draft), baseVersion: rec.version });
    expect(prop).toMatchObject({ status: 'pending', authorRole: 'therapist' });
  });

  it('the parent is notified, approves, and the therapist hears back', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const notices = await api.listNotices();
    expect(notices.some((n) => n.kind === 'proposal' && n.text.includes('Ajouter pizza'))).toBe(true);
    const [prop] = await api.listProposals({ profileId });
    const rec = await api.getProfile(profileId);
    const next = JSON.parse(JSON.stringify(rec.data));
    next.boards.food.cells[0] = { concept: 'pizza' };
    expect(await api.saveProfile(profileId, next, rec.version)).toEqual({ ok: true, version: rec.version + 1 });
    await api.setProposalStatus(prop.id, 'approved');
    // a second save from an outdated copy is a conflict, not an overwrite
    const stale = await api.saveProfile(profileId, rec.data, rec.version);
    expect(stale.ok).toBe(false);
    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    expect((await api.listNotices())[0]).toMatchObject({ kind: 'decision' });
  });

  it('level 3 edits directly but never moves core vocabulary', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const [m] = await api.listMembers(profileId);
    await api.updateMember(profileId, m.userId, { level: 3 });
    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    const rec = await api.getProfile(profileId);
    const moved = JSON.parse(JSON.stringify(rec.data));
    [moved.boards.core.cells[0], moved.boards.core.cells[1]] = [moved.boards.core.cells[1], moved.boards.core.cells[0]];
    await expectCode(api.saveProfile(profileId, moved, rec.version), 'core_protected');
  });

  it('a teacher asks to connect with the family code; the parent approves with chosen rights', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const familyCode = await api.connectionCode(profileId);
    await api.signOut();
    await api.verifyCode({ email: 'marc@school.lb' }, await code(api.signUp({ role: 'pro', displayName: 'Marc', email: 'marc@school.lb', password: 'teacher12' })));
    await expectCode(api.requestConnection('WRONGCODE', { role: 'teacher', ...preset('teacher') }), 'code_invalid');
    await expectCode(api.requestConnection(familyCode, { role: 'teacher', ...preset('teacher') }), 'pro_not_verified');
    await getAccepted('marc@school.lb', 'teacher12', 'Marc T.');
    const req = await api.requestConnection(familyCode.toLowerCase(), { role: 'teacher', ...preset('teacher'), message: 'Classe de CE1' });
    expect((await api.myInvitations()).sent.map((i) => i.status)).toEqual(['pending']);
    expect(await api.myAccess(profileId)).toBeNull(); // nothing before approval
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    await api.approveRequest(req.id, { level: 2, perms: { ...preset('teacher').perms, createMaterials: true } });
    await api.signIn({ email: 'marc@school.lb', password: 'teacher12' });
    expect(await api.myAccess(profileId)).toMatchObject({ role: 'teacher', level: 2 });
  });

  it('revoking a collaborator removes access at once', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const marc = (await api.listMembers(profileId)).find((m) => m.role === 'teacher')!;
    await api.revokeMember(profileId, marc.userId);
    await api.signIn({ email: 'marc@school.lb', password: 'teacher12' });
    expect(await api.myAccess(profileId)).toBeNull();
    await expectCode(api.getProfile(profileId), 'forbidden');
  });

  it('pairs a new tablet with a 6-digit code, and can revoke it', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    const { code: pair } = await api.createPairingCode(profileId, 'use');
    await api.signOut();
    expect(await api.redeemPairingCode(pair, { id: 'dev-school', name: 'Tablette école', platform: 'ios' })).toBe(profileId);
    expect(await api.myAccess(profileId)).toMatchObject({ role: 'device', level: 1 });
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    await api.revokeDevice(profileId, 'dev-school');
    expect((await api.listDevices(profileId))[0]).toMatchObject({ revoked: true });
  });

  it('the back office withdraws an acceptance (access suspended, not erased) and gives it back', async () => {
    await api.demoOpenBackOffice();
    const sarah = (await api.adminVerifications()).find((v) => v.email === 'sarah@clinic.fr')!;
    expect(sarah.children).toBe(1);
    await api.adminDecideVerification(sarah.userId, 'rejected', 'Licence expirée');
    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    expect(await api.myAccess(profileId)).toBeNull();
    expect(await api.getVerification()).toMatchObject({ status: 'rejected', note: 'Licence expirée' });
    await api.demoOpenBackOffice();
    await api.adminDecideVerification(sarah.userId, 'verified');
    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    expect(await api.myAccess(profileId)).toMatchObject({ role: 'therapist', level: 3 });
  });

  it('the back office looks at a certificate, and every look is written down', async () => {
    await api.demoOpenBackOffice();
    const maya = (await api.adminVerifications()).find((v) => v.fullName === 'Maya Haddad')!; // an invented example
    expect(await api.adminDocumentUrl(maya.userId, maya.documents[0].ref)).toMatch(/^data:image\/svg/);
    await expectCode(api.adminDocumentUrl(maya.userId, 'someone-else/file.pdf'), 'not_found');
    expect((await api.adminLog())[0]).toMatchObject({ action: 'open_document', targetName: 'Maya Haddad' });
  });

  it('anyone writes to the team; only the back office reads the messages and the figures', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    await api.sendFeedback({ kind: 'idea', text: 'Plus de pictogrammes de sport', platform: 'ios', appVersion: '1.0.0' });
    await expectCode(api.adminFeedback(), 'forbidden');
    await expectCode(api.adminOverview(), 'forbidden');
    await expectCode(api.adminLog(), 'forbidden');
    await api.demoOpenBackOffice();
    const mine = (await api.adminFeedback()).find((f) => f.text.includes('sport'))!;
    expect(mine).toMatchObject({ status: 'new', fromName: 'Rita', kind: 'idea' });
    await api.adminSetFeedback(mine.id, 'done');
    expect((await api.adminFeedback()).find((f) => f.id === mine.id)?.status).toBe('done');
    const o = await api.adminOverview();
    expect(o.example).toBe(true); // the demo server has no real users: example figures, flagged as such
    expect(o.accounts.weeks).toHaveLength(12);
    expect(o.usage.hours).toHaveLength(24);
  });

  it('password reset never reveals whether an account exists, and deleting an account cleans up', async () => {
    expect((await api.requestPasswordReset({ email: 'nobody@nowhere.com' })).demoCode).toMatch(/^\d{6}$/);
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    await api.deleteAccount();
    await api.signIn({ email: 'sarah@clinic.fr', password: 'therapy123' });
    expect(await api.listProfiles()).toEqual([]);
  });
});
