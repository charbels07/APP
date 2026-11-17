import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
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

  it('while nothing changed, looking for news only reads the version, not the whole profile', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const full = jest.spyOn(api, 'getProfile');
    const version = jest.spyOn(api, 'profileVersion');
    try {
      let remote = 0;
      sync.onRemote = () => remote++;
      await sync.pull();
      await sync.pull();
      expect(version).toHaveBeenCalledTimes(2);
      expect(full).not.toHaveBeenCalled();
      expect(remote).toBe(0);
      expect(sync.lastSyncedAt).toBeDefined();

      // Someone else saves: the next look downloads the profile once, then quiet again.
      const other = await api.getProfile(id);
      const theirs = structuredClone(other.data);
      theirs.settings.speechRate = 0.9;
      await api.saveProfile(id, theirs, other.version);
      full.mockClear();
      await sync.pull();
      expect(full).toHaveBeenCalledTimes(1);
      expect(remote).toBe(1);
      expect(sync.copy.version).toBe(other.version + 1);
      expect(sync.copy.data.settings.speechRate).toBe(0.9);
      expect((await readLocal(id))?.version).toBe(other.version + 1);
      await sync.pull();
      expect(full).toHaveBeenCalledTimes(1);
    } finally {
      full.mockRestore();
      version.mockRestore();
    }
  });

  it('looking for news: unsent changes are sent first, and no connection only shows "offline"', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 60000 });
    const version = jest.spyOn(api, 'profileVersion');
    try {
      const p = structuredClone(sync.copy.data);
      p.settings.speechRate = 1.1;
      sync.change(p);
      await sync.pull();
      expect(version).not.toHaveBeenCalled();
      expect(sync.copy.dirty).toBe(false);
      expect((await api.getProfile(id)).data.settings.speechRate).toBe(1.1);

      const full = jest.spyOn(api, 'getProfile');
      version.mockRejectedValueOnce(new BackendError('offline'));
      await sync.pull();
      expect(sync.state).toBe('offline');
      expect(full).not.toHaveBeenCalled();
      full.mockRestore();
      await sync.pull();
      expect(sync.state).toBe('saved');
    } finally {
      version.mockRestore();
    }
  });

  it('a change made while the newer profile downloads is merged, not lost', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const other = await api.getProfile(id);
    const theirs = structuredClone(other.data);
    theirs.settings.showLabels = true;
    await api.saveProfile(id, theirs, other.version);
    const real = api.getProfile.bind(api);
    const full = jest.spyOn(api, 'getProfile').mockImplementationOnce(async (pid) => {
      const r = await real(pid);
      // The child touches the board in the meantime.
      const p = structuredClone(sync.copy.data);
      p.settings.speechRate = 0.7;
      sync.change(p);
      return r;
    });
    try {
      await sync.pull();
      expect(sync.copy.data.settings.speechRate).toBe(0.7);
      await sync.flush();
      const now = (await api.getProfile(id)).data.settings;
      expect(now.showLabels).toBe(true);
      expect(now.speechRate).toBe(0.7);
    } finally {
      full.mockRestore();
    }
  });

  it('the version alone follows the same reading rule as the profile', async () => {
    expect(await api.profileVersion(id)).toBe((await api.getProfile(id)).version);
    await api.signOut();
    await signUp('stranger@example.com', 'parent');
    await expect(api.profileVersion(id)).rejects.toMatchObject({ code: 'forbidden' });
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
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
