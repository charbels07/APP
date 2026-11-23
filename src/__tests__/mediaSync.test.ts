/**
 * A child's photos and recordings copied through the account: which names travel, what is sent
 * and fetched, when it is tried again, what leaves the device with the child, and the demo
 * server's rules (the same as the database's: supabase/tests/media_scenario.sql).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Backend } from '../backend/Backend';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { forgetChild, forgetEverything, mediaNamesIn, remember } from '../lib/deviceData';
import { onMediaArrived } from '../lib/mediaArrivals';
import {
  afterList,
  afterRemoval,
  backoff,
  emptyBook,
  failed,
  fitSide,
  isSyncable,
  markSent,
  mediaKind,
  mimeOf,
  nextDue,
  ORPHAN_AFTER,
  planMedia,
  prune,
  readBook,
  removedNames,
} from '../lib/mediaPlan';
import { preset } from '../lib/permissions';
import type { Profile } from '../model/types';
import { MediaSync, sendFilesFor, type MediaFiles } from '../state/mediaSync';

// The device's media store, in memory (the real one is a folder on a tablet, IndexedDB in a browser).
const mockStore = new Set<string>();
jest.mock('../lib/media', () => ({
  hasMedia: async (n: string) => mockStore.has(n),
  deleteMedia: async (n: string) => void mockStore.delete(n),
  clearMedia: async () => mockStore.clear(),
  saveMediaFrom: async (_url: string, n: string) => void mockStore.add(n),
  mediaContent: async (n: string) => (mockStore.has(n) ? new Uint8Array(10) : undefined),
  mediaUri: async (n: string) => (mockStore.has(n) ? `file:///media/${n}` : undefined),
  saveMedia: async () => '1762000000999_zz99zz.jpg',
}));

const PHOTO = '1762000000001_ab12cd.jpg';
const VOICE = '1762000000002_ab12cd.t120-980.m4a';
const OTHER = '1762000000003_ab12cd.wav';

describe('names that travel', () => {
  it('accepts only the names the app gives, of pictures and sounds', () => {
    for (const ok of [PHOTO, VOICE, OTHER, '1762000000004_zz99zz.webm', '1762000000005_zz99zz.png', '1762000000006_zz99zz.webp']) expect(isSyncable(ok)).toBe(true);
    for (const bad of ['photo.jpg', '../1762000000001_ab12cd.jpg', '1762000000001_ab12cd.pdf', '1762000000001_AB12CD.jpg', `x/${PHOTO}`, `${PHOTO}.html`, '1762000000001_ab12cd.t1-2-3.m4a'])
      expect(isSyncable(bad)).toBe(false);
  });
  it('knows the kind of each file', () => {
    expect(mimeOf(PHOTO)).toBe('image/jpeg');
    expect(mimeOf(VOICE)).toBe('audio/mp4');
    expect(mimeOf(OTHER)).toBe('audio/wav');
    expect(mediaKind(VOICE)).toBe('audio');
    expect(mediaKind(PHOTO)).toBe('image');
    expect(mediaKind('x.pdf')).toBeUndefined();
  });
  it('finds them anywhere in a profile, a recording with its start and stop', () => {
    const p = { overrides: { a: { symbol: { kind: 'media', name: PHOTO } }, b: { audio: { fr: VOICE, en: VOICE } } }, boards: { x: { concept: 'a' } } };
    expect(mediaNamesIn(p)).toEqual([PHOTO, VOICE]);
  });
  it('makes a photo 1024 px on its longest side at most', () => {
    expect(fitSide(4032, 3024)).toEqual({ width: 1024, height: 768 });
    expect(fitSide(1000, 3000)).toEqual({ width: 341, height: 1024 });
    expect(fitSide(400, 400)).toEqual({ width: 400, height: 400 });
  });
});

describe('what to do', () => {
  const here = (...names: string[]) => (n: string) => names.includes(n);
  const both = { canSend: true, canRemove: true };

  it('sends what is here and not in the account, fetches what is missing here', () => {
    const plan = planMedia(markSent(emptyBook(), OTHER), [PHOTO, VOICE, OTHER], here(PHOTO, OTHER), 0, both);
    expect(plan.send).toEqual([PHOTO]);
    expect(plan.fetch).toEqual([VOICE]);
    expect([plan.waitingSend, plan.waitingFetch]).toEqual([1, 1]);
  });
  it('a use-only device sends nothing but still counts what waits', () => {
    const plan = planMedia(emptyBook(), [PHOTO], here(PHOTO), 0, { canSend: false, canRemove: false });
    expect(plan.send).toEqual([]);
    expect(plan.waitingSend).toBe(1);
  });
  it('waits longer after each failure, never more than an hour', () => {
    expect([1, 2, 3, 4].map(backoff)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoff(20)).toBe(3_600_000);
    let book = failed(emptyBook(), VOICE, 1000);
    book = failed(book, VOICE, 1000);
    expect(book.retry[VOICE]).toEqual({ n: 2, at: 61_000 });
    expect(planMedia(book, [VOICE], here(), 60_000, both).fetch).toEqual([]);
    expect(planMedia(book, [VOICE], here(), 61_000, both).fetch).toEqual([VOICE]);
    expect(nextDue(book, 1000)).toBe(61_000);
  });
  it('a file refused for good is not tried again; a full space holds sending', () => {
    const refused = { ...emptyBook(), refused: [PHOTO] };
    expect(planMedia(refused, [PHOTO], here(PHOTO), 0, both).send).toEqual([]);
    const full = { ...emptyBook(), fullUntil: 5000 };
    expect(planMedia(full, [PHOTO], here(PHOTO), 1000, both).send).toEqual([]);
    expect(planMedia(full, [PHOTO], here(PHOTO), 6000, both).send).toEqual([PHOTO]);
  });
  it('a picture replaced keeps its copy in the account; a received copy leaves this device', () => {
    const before = { overrides: { a: { symbol: { kind: 'media', name: PHOTO } }, b: { audio: { fr: VOICE } } } };
    const after = { overrides: { a: { symbol: { kind: 'media', name: '1762000000009_ab12cd.jpg' } }, b: { audio: { fr: VOICE } } } };
    expect(removedNames(before, after)).toEqual([PHOTO]);
    const book = markSent(markSent(emptyBook(), PHOTO, true), VOICE);
    const r = afterRemoval(book, [PHOTO]);
    // The account keeps it ("Undo", earlier versions): it leaves only through the sweep, 30 days later.
    expect(r.book.remove).toEqual([]);
    expect(r.eraseHere).toEqual([PHOTO]);
    expect(planMedia(r.book, [VOICE], here(VOICE), 0, both).remove).toEqual([]);
  });
  it('someone else’s change: received copies no word uses leave; a name used again keeps its copy', () => {
    const book = { ...markSent(markSent(emptyBook(), PHOTO, true), OTHER, true), remove: [VOICE] };
    const r = prune(book, [OTHER, VOICE]);
    expect(r.eraseHere).toEqual([PHOTO]);
    expect(r.book.received).toEqual([OTHER]);
    expect(r.book.remove).toEqual([]);
  });
  it('the account’s list corrects what the device believes, and old unused files are cleared by managers only', () => {
    const now = 100 * ORPHAN_AFTER;
    const book = failed(markSent(emptyBook(), PHOTO), VOICE, now);
    const files = [
      { name: VOICE, size: 10, createdAt: now - 1000 },
      { name: OTHER, size: 10, createdAt: now - ORPHAN_AFTER - 1 },
      { name: '1762000000008_ab12cd.jpg', size: 10, createdAt: now - 1000 },
    ];
    const r = afterList(book, files, [PHOTO, VOICE], now, true, []);
    // PHOTO is not there any more: it is sent again; VOICE arrived meanwhile: fetched at once.
    expect(r.book.sent.sort()).toEqual([VOICE, OTHER, '1762000000008_ab12cd.jpg'].sort());
    expect(r.book.retry[VOICE]).toBeUndefined();
    // Only the old file that no word uses (a recent one may belong to a change still on its way).
    expect(r.sweep).toEqual([OTHER]);
    expect(afterList(book, files, [PHOTO, VOICE], now, false, []).sweep).toEqual([]);
    expect(afterList(book, [{ name: OTHER, size: 1, createdAt: 0 }], [], now, true, []).sweep).toEqual([]);
    // Something the database still points to (an earlier version, "Undo", a proposal) stays…
    expect(afterList(book, files, [PHOTO, VOICE], now, true, [OTHER]).sweep).toEqual([]);
    // …and without the database's answer nothing is swept at all.
    expect(afterList(book, files, [PHOTO, VOICE], now, true, null).sweep).toEqual([]);
    expect(afterList(book, files, [PHOTO, VOICE], now, true).sweep).toEqual([]);
    // Kept 30 days at least.
    expect(ORPHAN_AFTER).toBe(30 * 24 * 60 * 60 * 1000);
  });
  it('reads back only what it expects from the device', () => {
    const b = readBook({ sent: [PHOTO, '../../x', 3], received: 'no', retry: { [VOICE]: { n: 1, at: 5 }, 'a/b': { n: 1, at: 1 } }, fullUntil: 'x' });
    expect(b.sent).toEqual([PHOTO]);
    expect(b.received).toEqual([]);
    expect(Object.keys(b.retry)).toEqual([VOICE]);
    expect(b.fullUntil).toBeUndefined();
  });
});

/** An account's storage in memory, with the failures a test asks for. */
function fakeServer() {
  const files = new Map<string, number>();
  const created = new Map<string, number>();
  let inUse: string[] | null = [];
  const calls: string[] = [];
  let fail: Record<string, string> = {};
  const api = {
    async uploadMedia(_id: string, name: string, body: ArrayBuffer | Blob) {
      calls.push(`up ${name}`);
      if (fail[name] ?? fail.up) throw new BackendError(fail[name] ?? fail.up);
      if (files.has(name)) throw new BackendError('exists');
      files.set(name, body instanceof ArrayBuffer ? body.byteLength : 0);
    },
    async mediaUrl(_id: string, name: string) {
      calls.push(`url ${name}`);
      if (fail.down) throw new BackendError(fail.down);
      if (!files.has(name)) throw new BackendError('not_found');
      return `https://storage.example/${name}?token=x`;
    },
    async listMedia() {
      calls.push('list');
      if (fail.list) throw new BackendError(fail.list);
      return [...files.keys()].map((name) => ({ name, size: files.get(name)!, createdAt: created.get(name) ?? 0 }));
    },
    async mediaInUse() {
      calls.push('inUse');
      return inUse;
    },
    async removeMedia(_id: string, names: string[]) {
      calls.push(`rm ${names.join(',')}`);
      for (const n of names) files.delete(n);
    },
  };
  return {
    api: api as unknown as Backend,
    files,
    created,
    calls,
    setFail: (f: Record<string, string>) => (fail = f),
    setInUse: (names: string[] | null) => (inUse = names),
  };
}

/** A second device: its own store. */
function deviceStore(): MediaFiles & { names: Set<string> } {
  const names = new Set<string>();
  return {
    names,
    has: async (n) => names.has(n),
    body: async (n) => (names.has(n) ? { body: new ArrayBuffer(100), type: mimeOf(n)! } : undefined),
    fetch: async (_u, n) => void names.add(n),
    erase: async (n) => void names.delete(n),
  };
}

const withPhoto = (name: string, audio?: string): Profile => {
  const p = createDefaultProfile();
  p.overrides.manger = { symbol: { kind: 'media', name }, ...(audio ? { audio: { fr: audio } } : {}) };
  return p;
};

describe('copying in the background', () => {
  const opened: MediaSync[] = [];
  const open = async (...args: Parameters<typeof MediaSync.open>) => {
    const m = await MediaSync.open(...args);
    opened.push(m);
    return m;
  };
  beforeEach(async () => {
    await AsyncStorage.clear();
    remember('child');
  });
  afterEach(() => {
    for (const m of opened.splice(0)) m.close();
  });

  it('a photo made on the parent’s phone reaches the child’s tablet', async () => {
    const server = fakeServer();
    const phone = deviceStore();
    phone.names.add(PHOTO);
    phone.names.add(VOICE);
    const a = await open(server.api, 'child', { files: phone, canRemove: () => true, delay: 10_000 });
    a.see(withPhoto(PHOTO, VOICE));
    await a.run();
    expect([...server.files.keys()].sort()).toEqual([PHOTO, VOICE].sort());
    expect(a.status()).toMatchObject({ total: 2, waiting: 0, receiving: 0 });

    const tablet = deviceStore();
    const arrived: string[] = [];
    const off = onMediaArrived((n) => arrived.push(n));
    const b = await open(server.api, 'child2', { files: tablet, delay: 10_000 });
    remember('child2');
    b.see(withPhoto(PHOTO, VOICE));
    await b.run();
    off();
    expect([...tablet.names].sort()).toEqual([PHOTO, VOICE].sort());
    expect(arrived.sort()).toEqual([PHOTO, VOICE].sort());
    expect(b.state.received.sort()).toEqual([PHOTO, VOICE].sort());
    // Received copies are never sent back.
    expect(server.calls.filter((c) => c.startsWith('up')).length).toBe(2);
    a.close();
    b.close();
  });

  it('offline: nothing is lost, it goes when the internet is back', async () => {
    const server = fakeServer();
    const phone = deviceStore();
    phone.names.add(PHOTO);
    const m = await open(server.api, 'child', { files: phone, delay: 10_000 });
    m.see(withPhoto(PHOTO));
    server.setFail({ list: 'offline' });
    await m.run();
    expect(m.status()).toMatchObject({ total: 1, waiting: 1, receiving: 0 });
    server.setFail({ up: 'offline' });
    await m.run();
    expect(server.files.size).toBe(0);
    expect(m.status().waiting).toBe(1);
    server.setFail({});
    await m.run();
    expect(server.files.has(PHOTO)).toBe(true);
    expect(m.status().waiting).toBe(0);
    m.close();
  });

  it('a use-only tablet keeps its own files; a file too big is not tried again', async () => {
    const server = fakeServer();
    const tablet = deviceStore();
    tablet.names.add(PHOTO);
    tablet.names.add(VOICE);
    const m = await open(server.api, 'child', { files: tablet, delay: 10_000 });
    m.see(withPhoto(PHOTO, VOICE));
    server.setFail({ [PHOTO]: 'too_large', [VOICE]: 'forbidden' });
    await m.run();
    expect(m.status()).toMatchObject({ waiting: 1, refused: 1, localOnly: true });
    server.setFail({});
    await m.run();
    // No more tries during this run of the app: the account said no to this device.
    expect(server.calls.filter((c) => c.startsWith('up')).length).toBe(2);
    m.close();
  });

  it('a file not in the account yet is fetched later, after a wait', async () => {
    const server = fakeServer();
    const tablet = deviceStore();
    let now = 1_000_000;
    const m = await open(server.api, 'child', { files: tablet, now: () => now, delay: 10_000 });
    m.see(withPhoto(PHOTO));
    await m.run();
    expect(m.status().receiving).toBe(1);
    expect(m.state.retry[PHOTO].n).toBe(1);
    server.files.set(PHOTO, 10);
    await m.run(); // too soon: not asked again
    expect(server.calls.filter((c) => c === `url ${PHOTO}`).length).toBe(1);
    now += backoff(1);
    await m.run();
    expect(tablet.names.has(PHOTO)).toBe(true);
    expect(m.status().receiving).toBe(0);
    m.close();
  });

  it('a replaced photo stays in the account 30 days, and while the database still points to it; managers only', async () => {
    const server = fakeServer();
    const phone = deviceStore();
    phone.names.add(PHOTO);
    const NEW = '1762000000009_ab12cd.jpg';
    let manager = true;
    let now = 1_000_000_000_000;
    const m = await open(server.api, 'child', { files: phone, canRemove: () => manager, delay: 10_000, now: () => now });
    const before = withPhoto(PHOTO);
    m.see(before);
    await m.run();
    server.created.set(PHOTO, now);
    phone.names.add(NEW);
    const after = withPhoto(NEW);
    m.changed(before, after);
    await m.run();
    // Replaced: both copies stay ("Undo", earlier versions).
    expect([...server.files.keys()].sort()).toEqual([NEW, PHOTO].sort());
    server.created.set(NEW, now);
    // 31 days later, the earlier version of the board still uses it: it stays.
    now += 31 * 24 * 60 * 60 * 1000;
    server.setInUse([PHOTO]);
    m.see(after);
    await m.run();
    expect(server.files.has(PHOTO)).toBe(true);
    // Nothing points to it any more: the next look removes it.
    server.setInUse([]);
    now += 13 * 60 * 60 * 1000;
    m.see(after);
    await m.run();
    expect([...server.files.keys()]).toEqual([NEW]);
    // A database not updated yet (no answer): nothing is removed; nor by someone who is not a manager.
    const OLD = '1762000000011_ab12cd.jpg';
    server.files.set(OLD, 10);
    server.created.set(OLD, 1);
    server.setInUse(null);
    now += 13 * 60 * 60 * 1000;
    m.see(after);
    await m.run();
    expect(server.files.has(OLD)).toBe(true);
    manager = false;
    server.setInUse([]);
    now += 13 * 60 * 60 * 1000;
    m.see(after);
    await m.run();
    expect(server.files.has(OLD)).toBe(true);
    m.close();
  });

  it('a professional’s draft only sends: the family’s files are not copied onto her device', async () => {
    const server = fakeServer();
    server.files.set(OTHER, 10);
    const hers = deviceStore();
    hers.names.add(PHOTO);
    const m = await open(server.api, 'child', { files: hers, fetch: false, canRemove: () => false, delay: 10_000 });
    const p = withPhoto(PHOTO);
    p.overrides.boire = { symbol: { kind: 'media', name: OTHER } };
    m.see(p);
    await m.run();
    expect(server.files.has(PHOTO)).toBe(true);
    expect(hers.names.has(OTHER)).toBe(false);
    m.close();
  });

  it('a material a professional proposes sends its own photo and recording to the child’s space, nothing else (gap review)', async () => {
    const server = fakeServer();
    server.files.set(OTHER, 10);
    const hers = deviceStore();
    hers.names.add(PHOTO);
    hers.names.add(VOICE);
    const p = withPhoto(PHOTO, VOICE);
    p.overrides.boire = { symbol: { kind: 'media', name: OTHER } };
    await sendFilesFor(server.api, 'child', p, hers);
    expect(server.files.has(PHOTO)).toBe(true);
    expect(server.files.has(VOICE)).toBe(true);
    // Send only: the family's files are not fetched onto her device, nothing is removed from the account.
    expect(hers.names.has(OTHER)).toBe(false);
    expect(server.calls.some((c) => c.startsWith('rm '))).toBe(false);
    // Refused (she may not send) or offline: never in the way of the proposal.
    const refused = fakeServer();
    refused.setFail({ up: 'forbidden' });
    await expect(sendFilesFor(refused.api, 'child', p, hers)).resolves.toBeUndefined();
  });

  it('what the device knows is kept with the child’s copy and leaves with it, with the received files', async () => {
    const server = fakeServer();
    server.files.set(PHOTO, 10);
    mockStore.clear();
    // The default store of this device (src/lib/media), here in memory.
    const m = await open(server.api, 'gone', { delay: 10_000 });
    remember('gone');
    m.see(withPhoto(PHOTO));
    await m.run();
    m.close();
    expect(mockStore.has(PHOTO)).toBe(true);
    expect(JSON.parse((await AsyncStorage.getItem('caa.media.gone'))!).received).toEqual([PHOTO]);
    mockStore.add(OTHER); // made on this device
    await forgetChild('gone');
    expect(mockStore.has(PHOTO)).toBe(false);
    expect(mockStore.has(OTHER)).toBe(true);
    expect(await AsyncStorage.getItem('caa.media.gone')).toBeNull();
  });

  it('signing out: received copies leave; the ones made here stay unless the person asks', async () => {
    mockStore.clear();
    mockStore.add(PHOTO);
    mockStore.add(OTHER);
    await AsyncStorage.multiSet([
      ['caa.child.a', '{"dirty":false}'],
      ['caa.media.a', JSON.stringify({ received: [PHOTO], sent: [PHOTO, OTHER] })],
      ['caa.child.b', '{"dirty":true}'],
      ['caa.media.b', JSON.stringify({ received: [VOICE] })],
    ]);
    mockStore.add(VOICE);
    await forgetEverything({ keepUnsent: true });
    // b has changes never sent: its copy waits for the account, with its files.
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['caa.child.b', 'caa.media.b']);
    expect([...mockStore].sort()).toEqual([VOICE, OTHER].sort());
    await forgetEverything({ media: true });
    expect(mockStore.size).toBe(0);
  });
});

describe('demo server: the same rules as the database', () => {
  const api = new LocalBackend();
  let child = '';
  const signUp = async (email: string) => {
    const sent = await api.signUp({ role: 'parent', displayName: email, email, password: 'secret123' });
    await api.verifyCode({ email }, sent.demoCode!);
  };
  const buf = (n: number) => new ArrayBuffer(n);

  it('the family sends; too big, wrong kind and strange names are refused', async () => {
    await AsyncStorage.clear();
    await signUp('mum.media@example.com');
    child = (await api.createProfile({ name: 'Lina', data: createDefaultProfile() })).id;
    await api.uploadMedia(child, PHOTO, buf(1000), 'image/jpeg');
    await expect(api.uploadMedia(child, PHOTO, buf(1000), 'image/jpeg')).rejects.toMatchObject({ code: 'exists' });
    await expect(api.uploadMedia(child, OTHER, buf(4 * 1024 * 1024), 'audio/wav')).rejects.toMatchObject({ code: 'too_large' });
    await expect(api.uploadMedia(child, VOICE, buf(1000), 'image/jpeg')).rejects.toMatchObject({ code: 'media_type' });
    await expect(api.uploadMedia(child, '../secret.jpg', buf(10), 'image/jpeg')).rejects.toMatchObject({ code: 'invalid' });
    expect((await api.listMedia(child)).map((f) => f.name)).toEqual([PHOTO]);
  });

  it('a use-only tablet reads the list but cannot send or remove', async () => {
    const { code } = await api.createPairingCode(child, 'use');
    await api.signOut();
    await api.redeemPairingCode(code, { id: 'tab-1', name: 'École', platform: 'ios' });
    expect((await api.myAccess(child))?.perms).toEqual(preset('device').perms);
    expect((await api.listMedia(child)).length).toBe(1);
    await expect(api.uploadMedia(child, OTHER, buf(10), 'audio/wav')).rejects.toMatchObject({ code: 'forbidden' });
    await api.removeMedia(child, [PHOTO]);
    expect((await api.listMedia(child)).length).toBe(1);
  });

  it('a stranger gets nothing; the family removes', async () => {
    await api.signOut();
    await signUp('stranger.media@example.com');
    await expect(api.listMedia(child)).rejects.toMatchObject({ code: 'forbidden' });
    await expect(api.uploadMedia(child, OTHER, buf(10), 'audio/wav')).rejects.toMatchObject({ code: 'forbidden' });
    await api.signOut();
    await api.signIn({ email: 'mum.media@example.com', password: 'secret123' });
    // Sent today: never removed (a change may be on its way from another device).
    await api.removeMedia(child, [PHOTO]);
    expect((await api.listMedia(child)).length).toBe(1);
    const later = Date.now() + 31 * 24 * 60 * 60 * 1000;
    const clock = jest.spyOn(Date, 'now').mockReturnValue(later);
    try {
      expect(await api.mediaInUse(child)).toEqual([]);
      await api.removeMedia(child, [PHOTO]);
      expect(await api.listMedia(child)).toEqual([]);
    } finally {
      clock.mockRestore();
    }
  });
});
