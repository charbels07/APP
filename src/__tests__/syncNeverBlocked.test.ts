/**
 * The child keeps their board (gap review of November 2026, batch 1): a save the server refuses
 * never stops a device from receiving the family's changes, and the small things a child changes
 * by simply using the board (last activity board, ticked steps, guide progress) never travel.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { travelling, withDeviceThings } from '../lib/deviceOnly';
import { preset } from '../lib/permissions';
import { badKey, ProfileSync, readLocal } from '../state/profileSync';

const api = new LocalBackend();
const SESSION = 'caa.session.v1';
const signUp = async (email: string, role: 'parent' | 'pro' = 'parent') => {
  const sent = await api.signUp({ role, displayName: email, email, password: 'secret123' });
  await api.verifyCode({ email }, sent.demoCode!);
};
/** Something done from the parent's own device, while this one stays signed in as it is. */
async function asParent<T>(fn: () => Promise<T>): Promise<T> {
  const mine = await AsyncStorage.getItem(SESSION);
  await api.signIn({ email: 'mum@example.com', password: 'secret123' });
  try {
    return await fn();
  } finally {
    if (mine) await AsyncStorage.setItem(SESSION, mine);
  }
}
const parentSaves = (id: string, edit: (p: ReturnType<typeof createDefaultProfile>) => void) =>
  asParent(async () => {
    const cur = await api.getProfile(id);
    const next = structuredClone(cur.data);
    edit(next);
    const r = await api.saveProfile(id, next, cur.version);
    expect(r.ok).toBe(true);
  });

let id = '';
beforeAll(async () => {
  await AsyncStorage.clear();
  await signUp('mum@example.com');
  const data = createDefaultProfile();
  data.guide = { seen: true };
  id = (await api.createProfile({ name: 'Lina', data })).id;
  const { code } = await api.createPairingCode(id, 'use');
  await api.signOut();
  // From here on, this device is the child's tablet: it may only use the board.
  await api.redeemPairingCode(code, { id: 'tab-1', name: 'Tablette', platform: 'ios' });
});

describe('what stays on each device', () => {
  it('is left out of what travels, and put back on what is received', () => {
    const p = createDefaultProfile();
    p.lastTla = p.tlaOrder[1];
    p.activeSchedule = p.schedules[0].id;
    p.schedules[0].steps[0].done = true;
    p.guide = { seen: true, read: ['start'], tailored: { newToAac: true } };
    const sent = travelling(p);
    expect(sent.lastTla).toBeUndefined();
    expect(sent.activeSchedule).toBeUndefined();
    expect(sent.schedules[0].steps.some((s) => s.done)).toBe(false);
    expect(sent.guide).toEqual({ tailored: { newToAac: true } });
    // The original is untouched (the board keeps showing it).
    expect(p.schedules[0].steps[0].done).toBe(true);

    const theirs = createDefaultProfile();
    theirs.settings.speechRate = 0.7;
    theirs.lastTla = theirs.tlaOrder[2];
    theirs.guide = { seen: false, read: [] };
    const got = withDeviceThings(theirs, p);
    expect(got.settings.speechRate).toBe(0.7);
    expect(got.lastTla).toBe(p.lastTla);
    expect(got.schedules[0].steps[0].done).toBe(true);
    expect(got.guide).toEqual({ seen: true, read: ['start'] });
  });

  it('a first download starts from the account: no welcome card again, the guide of a fresh set-up once', () => {
    const old = createDefaultProfile();
    delete old.guide;
    expect(withDeviceThings(old).guide?.seen).toBe(true);
    const fresh = createDefaultProfile();
    fresh.guide = { seen: false, openOnStart: true, tailored: { newToAac: false } };
    expect(withDeviceThings(fresh).guide).toEqual({ seen: false, openOnStart: true, tailored: { newToAac: false } });
  });

  it('a board or a sequence that no longer exists is not kept as "the last one"', () => {
    const mine = createDefaultProfile();
    mine.lastTla = 'tla_gone';
    mine.activeSchedule = 'sched_gone';
    const got = withDeviceThings(createDefaultProfile(), mine);
    expect(got.lastTla).toBeUndefined();
    expect(got.activeSchedule).toBe(got.schedules[0].id);
  });
});

describe('a use-only tablet', () => {
  it('opening an activity board, ticking a step, closing the welcome card: nothing is sent, nothing is refused', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const save = jest.spyOn(api, 'saveProfile');
    try {
      const p = structuredClone(sync.copy.data);
      p.lastTla = p.tlaOrder[1];
      p.schedules[0].steps[0].done = true;
      p.activeSchedule = p.schedules[1]?.id ?? p.schedules[0].id;
      p.guide = { ...p.guide, seen: true, read: ['start'] };
      sync.change(p);
      await sync.flush();
      expect(save).not.toHaveBeenCalled();
      expect(sync.copy.dirty).toBe(false);
      expect(sync.copy.localOnly).toBeFalsy();
      expect(sync.state).toBe('saved');
      // Kept on the device all the same.
      const kept = (await readLocal(id))!.data;
      expect(kept.lastTla).toBe(p.lastTla);
      expect(kept.schedules[0].steps[0].done).toBe(true);
    } finally {
      save.mockRestore();
    }
  });

  it('keeps receiving the family\'s changes, and keeps its own small things', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const lastTla = sync.copy.data.lastTla;
    expect(lastTla).toBeDefined();
    await parentSaves(id, (p) => {
      p.settings.speechRate = 0.85;
      p.lastTla = p.tlaOrder[2];
    });
    let remote = 0;
    sync.onRemote = () => remote++;
    await sync.pull();
    expect(remote).toBe(1);
    expect(sync.copy.data.settings.speechRate).toBe(0.85);
    expect(sync.copy.data.lastTla).toBe(lastTla);
    expect(sync.copy.data.schedules[0].steps[0].done).toBe(true);
  });

  it('a change the server refuses stays here, and the family\'s changes still arrive', async () => {
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    const p = structuredClone(sync.copy.data);
    p.settings.showLabels = !p.settings.showLabels;
    sync.change(p);
    await sync.flush();
    expect(sync.state).toBe('local');
    expect(sync.copy.localOnly).toBe(true);

    await parentSaves(id, (x) => void (x.settings.speechRate = 1.15));
    await sync.pull();
    expect(sync.copy.data.settings.speechRate).toBe(1.15); // theirs arrived
    expect(sync.copy.data.settings.showLabels).toBe(p.settings.showLabels); // ours kept on top
    expect(sync.state).toBe('local');

    // And again at the next opening, with the copy as it was written on the device.
    await parentSaves(id, (x) => void (x.settings.speechRate = 0.95));
    const again = await ProfileSync.open(api, id, { pushDelay: 0 });
    expect(again.copy.data.settings.speechRate).toBe(0.95);
    expect(again.copy.data.settings.showLabels).toBe(p.settings.showLabels);
    expect(again.state).toBe('local');
  });

  it('a copy that an older version left "to send, refused" for a last activity board is unlocked', async () => {
    const raw = JSON.parse((await AsyncStorage.getItem(`caa.child.${id}`))!);
    const server = await api.getProfile(id);
    // As the older version wrote it: the server's board plus a last activity board, waiting for ever.
    raw.data = { ...structuredClone(server.data), lastTla: server.data.tlaOrder[1] };
    raw.base = structuredClone(server.data);
    raw.version = server.version;
    raw.dirty = true;
    raw.localOnly = true;
    await AsyncStorage.setItem(`caa.child.${id}`, JSON.stringify(raw));
    await parentSaves(id, (x) => void (x.settings.speechRate = 1.3));
    const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
    expect(sync.copy.dirty).toBe(false);
    expect(sync.copy.localOnly).toBeFalsy();
    expect(sync.copy.data.settings.speechRate).toBe(1.3);
    expect(sync.copy.data.lastTla).toBe(server.data.tlaOrder[1]);
    expect(sync.state).toBe('saved');
  });

  it('says "the board was opened today" even with changes that cannot be sent', async () => {
    const seen = jest.spyOn(api, 'boardSeen');
    try {
      const sync = await ProfileSync.open(api, id, { pushDelay: 0 });
      const p = structuredClone(sync.copy.data);
      p.settings.quickZone = !p.settings.quickZone;
      sync.change(p);
      await sync.flush();
      expect(sync.copy.localOnly).toBe(true);
      await sync.pull();
      expect(seen).toHaveBeenCalled();
    } finally {
      seen.mockRestore();
    }
  });
});

describe('any other refused save', () => {
  let child = '';
  beforeAll(async () => {
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
    child = (await api.createProfile({ name: 'Sami', data: createDefaultProfile() })).id;
  });

  for (const code of ['too_large', 'invalid', 'something_new']) {
    it(`${code}: never left on "saving", the changes wait here and others' changes arrive`, async () => {
      const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
      const save = jest.spyOn(api, 'saveProfile').mockRejectedValue(new BackendError(code));
      try {
        const p = structuredClone(sync.copy.data);
        p.settings.speechRate = 0.5 + Math.random() / 10;
        sync.change(p);
        await sync.flush();
        expect(sync.state).toBe('refused');
        expect(sync.copy.dirty).toBe(true);
        // Someone else's change (saved straight on the server).
        save.mockRestore();
        const cur = await api.getProfile(child);
        const theirs = structuredClone(cur.data);
        theirs.settings.quickZone = !theirs.settings.quickZone;
        await api.saveProfile(child, theirs, cur.version);
        // The look takes theirs, and what was refused is tried once more on top of it.
        await sync.pull();
        expect(sync.copy.data.settings.quickZone).toBe(theirs.settings.quickZone);
        expect(sync.state).toBe('saved');
        expect((await api.getProfile(child)).data.settings.speechRate).toBe(p.settings.speechRate);
      } finally {
        save.mockRestore();
      }
    });
  }

  it('a refused save is tried again when the board opens, and the board opens whatever the answer', async () => {
    const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
    const save = jest.spyOn(api, 'saveProfile').mockRejectedValue(new BackendError('too_large'));
    try {
      const p = structuredClone(sync.copy.data);
      p.settings.speechRate = 0.77;
      sync.change(p);
      await sync.flush();
      const again = await ProfileSync.open(api, child, { pushDelay: 0 });
      expect(again.state).toBe('refused');
      expect(again.copy.data.settings.speechRate).toBe(0.77);
      save.mockRestore();
      const third = await ProfileSync.open(api, child, { pushDelay: 0 });
      expect(third.state).toBe('saved');
      expect((await api.getProfile(child)).data.settings.speechRate).toBe(0.77);
    } finally {
      save.mockRestore();
    }
  });

  it('a refused save is also tried again after half an hour while the board stays open', async () => {
    const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
    const save = jest.spyOn(api, 'saveProfile').mockRejectedValueOnce(new BackendError('forbidden'));
    const now = jest.spyOn(Date, 'now');
    try {
      const p = structuredClone(sync.copy.data);
      p.settings.speechRate = 0.61;
      sync.change(p);
      await sync.flush();
      expect(sync.state).toBe('local');
      // A look soon after: nothing is sent again.
      await sync.pull();
      expect(save).toHaveBeenCalledTimes(1);
      expect(sync.state).toBe('local');
      // Half an hour later the refusal has passed (rights given, session renewed).
      const later = Date.now() + 31 * 60 * 1000;
      now.mockImplementation(() => later);
      await sync.pull();
      expect(save).toHaveBeenCalledTimes(2);
      expect(sync.state).toBe('saved');
    } finally {
      now.mockRestore();
      save.mockRestore();
    }
  });

  it('a step an older version left ticked on the server does not make our change of that sequence collide', async () => {
    const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
    // Saved straight on the server, as an older version of the app did: a ticked step, and another change.
    const cur = await api.getProfile(child);
    const theirs = structuredClone(cur.data);
    theirs.schedules[0].steps[0].done = true;
    theirs.settings.modelPace = 1.3;
    await api.saveProfile(child, theirs, cur.version);
    let collided = 0;
    sync.onConflict = (n) => (collided += n);
    const p = structuredClone(sync.copy.data);
    p.schedules[0].title = 'Matin';
    sync.change(p);
    await sync.flush();
    expect(collided).toBe(0);
    const now = (await api.getProfile(child)).data;
    expect(now.schedules[0].title).toBe('Matin');
    expect(now.settings.modelPace).toBe(1.3);
  });

  it('"too many requests" waits like a lost connection and goes at the next look', async () => {
    const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
    const save = jest.spyOn(api, 'saveProfile').mockRejectedValueOnce(new BackendError('too_many'));
    try {
      const p = structuredClone(sync.copy.data);
      p.settings.speechRate = 0.66;
      sync.change(p);
      await sync.flush();
      expect(sync.state).toBe('offline');
      await sync.pull();
      expect(sync.state).toBe('saved');
    } finally {
      save.mockRestore();
    }
  });

  it('the family\'s own choices changed by someone who may not: put back, the rest is saved', async () => {
    // A therapist with direct editing (level 3), not a manager.
    await api.invite(child, { email: 'ortho@example.com', role: 'therapist', ...preset('therapist'), level: 3 });
    await api.signOut();
    await signUp('ortho@example.com', 'pro');
    await api.saveVerification({ fullName: 'Ortho', country: 'Liban', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
    await api.submitVerification();
    await api.demoOpenBackOffice();
    const req = (await api.adminVerifications()).find((v) => v.email === 'ortho@example.com')!;
    await api.adminDecideVerification(req.userId, 'verified');
    await api.signIn({ email: 'ortho@example.com', password: 'secret123' });
    const [inv] = (await api.myInvitations()).received;
    await api.respondInvitation(inv.id, true);

    const sync = await ProfileSync.open(api, child, { pushDelay: 0 });
    let redrawn = 0;
    sync.onRemote = () => redrawn++;
    const p = structuredClone(sync.copy.data);
    const before = { pin: p.settings.pin, dataCollection: p.settings.dataCollection };
    p.settings.pin = '8642';
    p.settings.dataCollection = 'language';
    p.settings.modelPace = 1.7;
    sync.change(p);
    await sync.flush();
    expect(sync.state).toBe('saved');
    expect(sync.copy.data.settings.pin).toBe(before.pin);
    expect(sync.copy.data.settings.dataCollection).toBe(before.dataCollection);
    expect(redrawn).toBeGreaterThan(0);
    const server = (await api.getProfile(child)).data.settings;
    // (the family's code is not sent to a professional: what she reads has none)
    expect(server.pin).toBeUndefined();
    expect(server.dataCollection).toBe(before.dataCollection);
    expect(server.modelPace).toBe(1.7);
  });
});

describe('opening a board', () => {
  let child = '';
  beforeAll(async () => {
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
    child = (await api.createProfile({ name: 'Nour', data: createDefaultProfile() })).id;
    await ProfileSync.open(api, child);
  });

  it('with a copy on the device, does not wait for a server that is slow', async () => {
    const real = api.getProfile.bind(api);
    let answer: () => void = () => {};
    const slow = jest.spyOn(api, 'getProfile').mockImplementationOnce(async (pid) => {
      await new Promise<void>((r) => (answer = r));
      return real(pid);
    });
    try {
      const sync = await ProfileSync.open(api, child, { wait: 20 });
      expect(sync.copy.name).toBe('Nour');
      expect(sync.state).toBe('offline');
      answer();
      await new Promise((r) => setTimeout(r, 30));
      expect(sync.state).toBe('saved');
    } finally {
      slow.mockRestore();
    }
  });

  it('access removed, learnt after the board opened: the board is told and the clean copy goes', async () => {
    let answer: () => void = () => {};
    const slow = jest.spyOn(api, 'getProfile').mockImplementationOnce(async () => {
      await new Promise<void>((r) => (answer = r));
      throw new BackendError('forbidden');
    });
    // The removal is certain: the account's children no longer hold this one.
    const list = jest.spyOn(api, 'listProfiles').mockResolvedValueOnce([]);
    try {
      const sync = await ProfileSync.open(api, child, { wait: 20 });
      let told: unknown = null;
      sync.onGone = (e) => (told = e);
      answer();
      await new Promise((r) => setTimeout(r, 30));
      expect(told).toMatchObject({ code: 'forbidden' });
      expect(sync.gone).toMatchObject({ code: 'forbidden' });
      expect(await readLocal(child)).toBeNull();
    } finally {
      slow.mockRestore();
      list.mockRestore();
    }
    await ProfileSync.open(api, child);
  });

  it('"forbidden" while the account still has the child (a session not renewed, a code not typed): the copy stays the board', async () => {
    const clean = jest.spyOn(api, 'getProfile').mockRejectedValueOnce(new BackendError('forbidden'));
    try {
      const sync = await ProfileSync.open(api, child);
      expect(sync.state).toBe('offline');
      expect(sync.copy.name).toBe('Nour');
      expect(await readLocal(child)).not.toBeNull();
    } finally {
      clean.mockRestore();
    }
  });

  it('"forbidden" does not erase a copy holding changes that were never sent', async () => {
    const sync = await ProfileSync.open(api, child, { pushDelay: 60000 });
    const p = structuredClone(sync.copy.data);
    p.settings.speechRate = 0.71;
    sync.change(p);
    await sync.writeNow();
    const gone = jest.spyOn(api, 'getProfile').mockRejectedValueOnce(new BackendError('forbidden'));
    try {
      await ProfileSync.open(api, child, { pushDelay: 60000 });
      const kept = await readLocal(child);
      expect(kept?.dirty).toBe(true);
      expect(kept?.data.settings.speechRate).toBe(0.71);
    } finally {
      gone.mockRestore();
    }
    // The board is back (out of the bin, the code typed…): the waiting change is sent.
    const back = await ProfileSync.open(api, child, { pushDelay: 0 });
    expect(back.state).toBe('saved');
    expect((await api.getProfile(child)).data.settings.speechRate).toBe(0.71);
  });

  it('a board in the family\'s bin keeps its unsent changes; a certain removal erases them', async () => {
    const other = (await api.createProfile({ name: 'Rami', data: createDefaultProfile() })).id;
    const sync = await ProfileSync.open(api, other, { pushDelay: 60000 });
    const p = structuredClone(sync.copy.data);
    p.settings.speechRate = 0.72;
    sync.change(p);
    await sync.writeNow();
    await api.deleteProfile(other);
    await ProfileSync.open(api, other, { pushDelay: 60000 });
    expect((await readLocal(other))?.dirty).toBe(true);
    // Someone else's account on this device (it never had access): the copy goes, sent or not.
    await api.signOut();
    await signUp('stranger@example.com');
    await expect(ProfileSync.open(api, other)).rejects.toMatchObject({ code: 'forbidden' });
    expect(await readLocal(other)).toBeNull();
    await api.signIn({ email: 'mum@example.com', password: 'secret123' });
  });

  it('a server error with a copy on the device: the board opens from the copy', async () => {
    const down = jest.spyOn(api, 'getProfile').mockRejectedValueOnce(new BackendError('offline'));
    try {
      const sync = await ProfileSync.open(api, child);
      expect(sync.state).toBe('offline');
      expect(sync.copy.name).toBe('Nour');
    } finally {
      down.mockRestore();
    }
  });

  it('a copy that cannot be read is put aside, not written over', async () => {
    await AsyncStorage.setItem(`caa.child.${child}`, '{"data": 5, "version"');
    const sync = await ProfileSync.open(api, child);
    expect(sync.copy.data.boards.core).toBeDefined();
    expect(await AsyncStorage.getItem(badKey(child))).toBe('{"data": 5, "version"');
  });
});
