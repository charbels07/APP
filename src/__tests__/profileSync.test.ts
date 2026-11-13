import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { preset } from '../lib/permissions';
import { ProfileSync, readLocal } from '../state/profileSync';

const api = new LocalBackend();
const signUp = async (email: string, role: 'parent' | 'pro') => {
  const sent = await api.signUp({ role, displayName: email, email, password: 'secret123' });
  await api.verifyCode({ email }, sent.demoCode!);
};

beforeAll(async () => {
  await AsyncStorage.clear();
});

describe('profile sync: device copy + server', () => {
  let id = '';

  it('keeps the profile on the device and sends changes to the server', async () => {
    await signUp('mum@example.com', 'parent');
    id = (await api.createProfile({ name: 'Lina', data: createDefaultProfile() })).id;
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const p = structuredClone(sync.copy.data);
    p.settings.speechRate = 0.8;
    sync.change(p);
    await sync.flush();
    expect(sync.state).toBe('saved');
    expect((await api.getProfile(id)).data.settings.speechRate).toBe(0.8);
    expect((await readLocal(id))?.dirty).toBe(false);
  });

  it('merges two people changing different things at the same time', async () => {
    const mine = await ProfileSync.open(api, id, { pushDelay: 0 });
    // Someone else saves first (on another device).
    const other = await api.getProfile(id);
    const theirs = structuredClone(other.data);
    theirs.settings.showLabels = false;
    await api.saveProfile(id, theirs, other.version);
    // Our change, made from the older version.
    let remote: unknown = null;
    mine.onRemote = (p) => (remote = p);
    const p = structuredClone(mine.copy.data);
    p.settings.quickZone = true;
    mine.change(p);
    await mine.flush();
    const now = (await api.getProfile(id)).data;
    expect(now.settings.showLabels).toBe(false); // theirs kept
    expect(now.settings.quickZone).toBe(true); // ours added
    expect(remote).not.toBeNull(); // the board was told to redraw
  });

  it('keeps their change when both changed the same thing, and says so', async () => {
    const mine = await ProfileSync.open(api, id, { pushDelay: 0 });
    const other = await api.getProfile(id);
    const theirs = structuredClone(other.data);
    theirs.settings.speechRate = 1.2;
    await api.saveProfile(id, theirs, other.version);
    let collided = 0;
    mine.onConflict = (n) => (collided = n);
    const p = structuredClone(mine.copy.data);
    p.settings.speechRate = 0.5;
    mine.change(p);
    await mine.flush();
    expect(collided).toBe(1);
    expect((await api.getProfile(id)).data.settings.speechRate).toBe(1.2);
  });

  it('a use-only tablet keeps its changes on the device', async () => {
    const { code } = await api.createPairingCode(id, 'use');
    await api.signOut();
    await api.redeemPairingCode(code, { id: 'tab-1', name: 'Tablette', platform: 'ios' });
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const p = structuredClone(sync.copy.data);
    p.lastTla = 'tla_park';
    sync.change(p);
    await sync.flush();
    expect(sync.state).toBe('local');
    expect((await readLocal(id))?.data.lastTla).toBe('tla_park');
  });

  it('a removed collaborator loses the device copy too', async () => {
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
    await api.invite(id, { email: 'ortho@example.com', role: 'therapist', ...preset('therapist') });
    await api.signOut();
    await signUp('ortho@example.com', 'pro');
    // A professional joins a team once the app's team accepted the certificate (back office).
    await api.saveVerification({ fullName: 'Ortho', country: 'Liban', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
    await api.submitVerification();
    await api.demoOpenBackOffice();
    const req = (await api.adminVerifications()).find((v) => v.email === 'ortho@example.com')!;
    await api.adminDecideVerification(req.userId, 'verified');
    await api.signIn({ email: 'ortho@example.com', password: 'secret123' });
    const [inv] = (await api.myInvitations()).received;
    await api.respondInvitation(inv.id, true);
    await ProfileSync.open(api, id);
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
    const ortho = (await api.listMembers(id)).find((m) => m.role === 'therapist')!;
    await api.revokeMember(id, ortho.userId);
    await api.signIn({ email: 'ortho@example.com', password: 'secret123' });
    await expect(ProfileSync.open(api, id)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await readLocal(id)).toBeNull();
  });
});
