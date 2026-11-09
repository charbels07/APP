/**
 * @jest-environment node
 *
 * Live test of the real server: plays the collaboration story against the Supabase project
 * named in `.env`, through the same code the app uses (src/backend/supabase.ts).
 * Run with `npm run test:live`. Not part of `npm test` (it needs the internet and creates
 * short-lived test accounts, deleted at the end).
 *
 * Needs, in Supabase → Authentication: "Confirm email" turned off while it runs (test addresses
 * cannot receive codes) and "Allow anonymous sign-ins" on (tablets).
 */
import fs from 'node:fs';
import path from 'node:path';
import { BackendError } from '../../backend/Backend';
import { SupabaseBackend } from '../../backend/supabase';
import { createDefaultProfile } from '../../data/defaults';
import { preset } from '../../lib/permissions';
import { diffProfiles } from '../../lib/profileDiff';

function readEnv(): Record<string, string> {
  const file = path.join(__dirname, '../../../.env');
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2]]),
  );
}

const env = readEnv();
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const run = Date.now().toString(36);
const domain = process.env.LIVE_EMAIL_DOMAIN ?? 'example.com';
const mail = (who: string) => `caa-test-${who}-${run}@${domain}`;
// Inside tests the app's own fetch is a stand-in: use a real one (through this computer's proxy, if any).
/* eslint-disable @typescript-eslint/no-require-imports */
const nodeFetch = require('node-fetch') as (u: string, o?: object) => Promise<Response>;
const { HttpsProxyAgent } = require('https-proxy-agent') as { HttpsProxyAgent: new (u: string) => object };
/* eslint-enable @typescript-eslint/no-require-imports */
const proxy = process.env.HTTPS_PROXY ?? process.env.https_proxy;
const agent = proxy ? new HttpsProxyAgent(proxy) : undefined;
const realFetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  nodeFetch(String(input instanceof Request ? input.url : input), { ...init, agent })) as typeof fetch;
const person = (who: string) => new SupabaseBackend(URL!, KEY!, { storageKey: `live-${who}-${run}`, fetch: realFetch });

const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};

/** Reads the project's sign-in settings first, so no email is ever sent to a test address. */
let settings: Promise<{ mailer_autoconfirm?: boolean; external?: { anonymous_users?: boolean } }> | undefined;
const projectSettings = () =>
  (settings ??= realFetch(`${URL}/auth/v1/settings`, { headers: { apikey: KEY! } }).then((r) => r.json()));

async function signUp(api: SupabaseBackend, who: string, role: 'parent' | 'pro', name: string) {
  if (!(await projectSettings()).mailer_autoconfirm) {
    throw new Error('"Confirm email" is on: turn it off for this test (Authentication → Sign In / Providers → Email), then back on.');
  }
  const sent = await api.signUp({ role, displayName: name, email: mail(who), password: `Test-${run}-pw` });
  if (!sent.signedIn) {
    throw new Error('Supabase asked for an email code: turn off "Confirm email" (Authentication → Sign In / Providers → Email) for this test.');
  }
}

const d = URL && KEY ? describe : describe.skip;

d('real server (Supabase): a family, a therapist, a teacher, a stranger and a tablet', () => {
  jest.setTimeout(30000);
  const rita = person('rita');
  const sarah = person('sarah');
  const marc = person('marc');
  const eve = person('eve');
  const tablet = person('tablet');
  const everyone = [rita, sarah, marc, eve, tablet];
  let profileId = '';

  afterAll(async () => {
    // Test accounts delete themselves (and everything they own).
    for (const api of everyone) {
      if (await api.currentAccount().catch(() => null)) await api.deleteAccount().catch(() => {});
    }
  });

  it('a parent signs up and creates the child profile', async () => {
    await signUp(rita, 'rita', 'parent', 'Rita');
    expect(await rita.currentAccount()).toMatchObject({ role: 'parent', displayName: 'Rita', email: mail('rita') });
    const rec = await rita.createProfile({ name: 'Adam', age: 6, data: createDefaultProfile() });
    profileId = rec.id;
    expect(rec.version).toBe(1);
    expect((await rita.listProfiles()).map((p) => [p.name, p.access])).toEqual([['Adam', 'owner']]);
  });

  it('a stranger sees nothing', async () => {
    await signUp(eve, 'eve', 'parent', 'Eve');
    expect(await eve.listProfiles()).toEqual([]);
    await expect(eve.getProfile(profileId)).rejects.toBeInstanceOf(BackendError);
    expect(await eve.myAccess(profileId)).toBeNull();
  });

  it('the parent invites a therapist who signs up afterwards and accepts', async () => {
    const inv = await rita.invite(profileId, { email: mail('sarah'), name: 'Sarah', role: 'therapist', ...preset('therapist') });
    expect(inv).toMatchObject({ status: 'pending', role: 'therapist', level: 2 });
    await signUp(sarah, 'sarah', 'pro', 'Sarah K.');
    expect((await sarah.currentAccount())?.role).toBe('pro');
    const { received } = await sarah.myInvitations();
    expect(received.map((i) => i.childName)).toEqual(['Adam']);
    expect((await sarah.listNotices()).some((n) => n.kind === 'invitation')).toBe(true);
    expect(await sarah.myAccess(profileId)).toBeNull();
    await sarah.respondInvitation(received[0].id, true);
    expect(await sarah.myAccess(profileId)).toMatchObject({ owner: false, role: 'therapist', level: 2 });
  });

  it('a level-2 therapist cannot save directly, only propose; the parent approves', async () => {
    const rec = await sarah.getProfile(profileId);
    const draft = structuredClone(rec.data);
    draft.boards.food.cells[0] = { concept: 'pizza' };
    await expectCode(sarah.saveProfile(profileId, draft, rec.version), 'forbidden');
    const prop = await sarah.createProposal(profileId, { title: 'Ajouter pizza', ops: diffProfiles(rec.data, draft), baseVersion: rec.version });
    expect(prop).toMatchObject({ status: 'pending' });

    expect((await rita.listNotices()).some((n) => n.kind === 'proposal')).toBe(true);
    const [p] = await rita.listProposals({ profileId });
    expect(p.ops.length).toBeGreaterThan(0);
    const base = await rita.getProfile(profileId);
    const next = structuredClone(base.data);
    next.boards.food.cells[0] = { concept: 'pizza' };
    expect(await rita.saveProfile(profileId, next, base.version)).toEqual({ ok: true, version: base.version + 1 });
    await rita.setProposalStatus(p.id, 'approved');
    const stale = await rita.saveProfile(profileId, base.data, base.version);
    expect(stale.ok).toBe(false);
    expect((await sarah.listNotices()).some((n) => n.kind === 'decision')).toBe(true);
  });

  it('level 3 edits directly but never moves core vocabulary', async () => {
    const m = (await rita.listMembers(profileId)).find((x) => x.role === 'therapist')!;
    await rita.updateMember(profileId, m.userId, { level: 3 });
    const rec = await sarah.getProfile(profileId);
    const moved = structuredClone(rec.data);
    [moved.boards.core.cells[0], moved.boards.core.cells[1]] = [moved.boards.core.cells[1], moved.boards.core.cells[0]];
    await expectCode(sarah.saveProfile(profileId, moved, rec.version), 'core_protected');
  });

  it('a teacher asks with the family code, is approved, then revoked', async () => {
    const familyCode = await rita.connectionCode(profileId);
    await signUp(marc, 'marc', 'pro', 'Marc');
    await expectCode(marc.requestConnection('WRONGCODE', { role: 'teacher', ...preset('teacher') }), 'code_invalid');
    const req = await marc.requestConnection(familyCode.toLowerCase(), { role: 'teacher', ...preset('teacher'), message: 'CE1' });
    expect(await marc.myAccess(profileId)).toBeNull();
    await rita.approveRequest(req.id, { level: 2, perms: preset('teacher').perms });
    expect(await marc.myAccess(profileId)).toMatchObject({ role: 'teacher', level: 2 });
    await rita.revokeMember(profileId, (await marc.currentAccount())!.id);
    expect(await marc.myAccess(profileId)).toBeNull();
  });

  it('a tablet joins with a pairing code, cannot start anything of its own, and can be revoked', async () => {
    if (!(await projectSettings()).external?.anonymous_users) {
      throw new Error('Turn on "Allow anonymous sign-ins" (Authentication → Sign In / Providers): tablets need it.');
    }
    const { code } = await rita.createPairingCode(profileId, 'use');
    const joined = await tablet.redeemPairingCode(code, { id: `dev-${run}`, name: 'Tablette école', platform: 'ios' });
    expect(joined).toBe(profileId);
    expect(await tablet.myAccess(profileId)).toMatchObject({ role: 'device', level: 1 });
    await expectCode(tablet.createProfile({ name: 'X', data: createDefaultProfile() }), 'forbidden');
    await rita.revokeDevice(profileId, `dev-${run}`);
    expect((await rita.listDevices(profileId)).find((x) => x.id === `dev-${run}`)).toMatchObject({ revoked: true });
    expect(await tablet.myAccess(profileId)).toBeNull();
  });

  it('a professional submits a verification, then it is locked', async () => {
    await expectCode(sarah.submitVerification(), 'incomplete');
    await sarah.saveVerification({
      fullName: 'Sarah Khoury',
      country: 'France',
      profession: 'slp',
      documents: [{ name: 'diplome.pdf', kind: 'diploma', uploadedAt: Date.now(), ref: 'test' }],
    });
    expect((await sarah.submitVerification()).status).toBe('pending');
    await expectCode(sarah.saveVerification({ fullName: 'X', country: 'France', profession: 'slp', documents: [] }), 'verification_locked');
  });

  it('deleting the parent account removes the child profile for everyone', async () => {
    await rita.deleteAccount();
    expect(await sarah.listProfiles()).toEqual([]);
  });
});
