/**
 * Gap review of November 2026, batch 5 (files and merging): what a device keeps and erases, the
 * reset, a full device, and the demo server's rules for a professional's pictures.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import { forgetOthers } from '../lib/deviceData';
import { deviceFull, storageFailed, storageWritten, written } from '../lib/deviceFull';
import { addLater, dueLater, eraseLater, KEEP_MEDIA, LATER_KEY, readLater, sweepLater } from '../lib/mediaKeep';
import { resetKeeping } from '../lib/resetBoard';
import { UsageTracker } from '../state/usageTracker';

const erased: string[] = [];
jest.mock('../lib/media', () => ({ deleteMedia: async (n: string) => void erased.push(n), clearMedia: async () => {} }));

const PHOTO = '1762000000001_aa11aa.jpg';
const VOICE = '1762000000002_aa11aa.t120-980.m4a';
const DAY = 24 * 60 * 60 * 1000;

describe('a photo or a recording no board uses stays 30 days', () => {
  it('waits 30 days, and is never erased while a board kept here uses it', () => {
    const list = addLater({}, [PHOTO, VOICE, '../etc/passwd'], 0);
    expect(Object.keys(list).sort()).toEqual([PHOTO, VOICE].sort());
    expect(dueLater(list, KEEP_MEDIA - 1, new Set()).erase).toEqual([]);
    const r = dueLater(list, KEEP_MEDIA, new Set([VOICE]));
    expect(r.erase).toEqual([PHOTO]);
    // Still used (an undo): it stays on the list, erased once nothing uses it.
    expect(r.list).toEqual({ [VOICE]: KEEP_MEDIA });
    expect(dueLater(r.list, KEEP_MEDIA, new Set()).erase).toEqual([VOICE]);
    expect(readLater('{"x":1,"' + PHOTO + '":"no"}')).toEqual({});
  });

  it('on the device: a brother’s board made from this one keeps the files it shares', async () => {
    await AsyncStorage.clear();
    erased.length = 0;
    await eraseLater([PHOTO, VOICE], 0);
    await AsyncStorage.setItem('caa.child.brother', JSON.stringify({ data: { overrides: { a: { audio: { fr: VOICE } } } } }));
    expect(await sweepLater(10 * DAY)).toEqual([]);
    expect(await sweepLater(31 * DAY)).toEqual([PHOTO]);
    expect(erased).toEqual([PHOTO]);
    expect(Object.keys(JSON.parse((await AsyncStorage.getItem(LATER_KEY))!))).toEqual([VOICE]);
  });
});

describe('copies of children the account can no longer open', () => {
  it('leave the device after the list of children is read, except one with changes not sent', async () => {
    await AsyncStorage.clear();
    await AsyncStorage.multiSet([
      ['caa.child.mine', '{"dirty":false}'],
      ['caa.child.removed', '{"dirty":false}'],
      ['caa.usage.removed', '{}'],
      ['caa.child.unsent', '{"dirty":true}'],
      ['caa.child.mine.bad', 'x'],
    ]);
    expect(await forgetOthers(['mine'])).toEqual(['removed']);
    // A file received for a child that leaves, still used by a board kept here, stays.
    erased.length = 0;
    await AsyncStorage.multiSet([
      ['caa.child.sister', JSON.stringify({ dirty: false, data: { overrides: { a: { symbol: { kind: 'media', name: PHOTO } } } } })],
      ['caa.media.gone2', JSON.stringify({ received: [PHOTO, VOICE] })],
      ['caa.child.gone2', '{"dirty":false}'],
    ]);
    await forgetOthers(['mine', 'sister']);
    expect(erased).toEqual([VOICE]);
    await AsyncStorage.multiRemove(['caa.child.sister']);
    expect([...(await AsyncStorage.getAllKeys())].sort()).toEqual(['caa.child.mine', 'caa.child.mine.bad', 'caa.child.unsent']);
  });
});

describe('Reset', () => {
  it('the starting board again, with the code, the follow-up, the sharing and the languages kept', () => {
    const p = createDefaultProfile();
    p.settings.pin = '4826';
    p.settings.dataCollection = 'usage';
    p.settings.shareStats = 'anonymous';
    p.settings.shareTerms = 3;
    p.settings.lang = 'ar';
    p.settings.langs = ['ar', 'fr'];
    p.settings.speechRate = 0.5;
    p.customConcepts.c_x = { id: 'c_x', cls: 'noun', labels: { fr: 'x', en: 'x', ar: 'x' }, emoji: '⭐', custom: true };
    const r = resetKeeping(p);
    expect(r.settings).toMatchObject({ pin: '4826', dataCollection: 'usage', shareStats: 'anonymous', shareTerms: 3, lang: 'ar', langs: ['ar', 'fr'] });
    expect(r.settings.speechRate).toBe(createDefaultProfile().settings.speechRate);
    expect(r.customConcepts.c_x).toBeUndefined();
    expect(r.boards.core.cells).toEqual(createDefaultProfile().boards.core.cells);
  });
});

describe('a device that is full', () => {
  it('is said until a write of the same kind works again', async () => {
    expect(deviceFull()).toBe(false);
    storageFailed('board');
    storageFailed('media');
    storageWritten('board');
    expect(deviceFull()).toBe(true);
    expect(await written('media', async () => {})).toBe(true);
    expect(deviceFull()).toBe(false);
    expect(await written('usage', async () => Promise.reject(new Error('QuotaExceededError')))).toBe(false);
    expect(deviceFull()).toBe(true);
    storageWritten('usage');
  });

  it('the follow-up kept on the device lets the days already sent go first', async () => {
    await AsyncStorage.clear();
    const api = new LocalBackend();
    const sent = await api.signUp({ role: 'parent', displayName: 'Rita', email: 'rita.full@example.com', password: 'secret123' });
    await api.verifyCode({ email: 'rita.full@example.com' }, sent.demoCode!);
    const data = createDefaultProfile();
    data.settings.dataCollection = 'usage';
    const id = (await api.createProfile({ name: 'Adam', data })).id;
    await api.registerDevice(id, { id: 'ipad', name: 'iPad', kind: 'companion', platform: 'ios' });
    let clock = new Date(2026, 10, 10, 9).getTime();
    const t = await UsageTracker.open(api, id, 'ipad', 'ios', () => 'usage', () => clock);
    t.record({ type: 'select', concept: 'want', mode: 'core' });
    await t.flush();
    clock = new Date(2026, 10, 11, 9).getTime();
    t.record({ type: 'select', concept: 'more', mode: 'core' });
    // (yesterday is sent once more, now that it is over)
    await t.flush();
    t.record({ type: 'select', concept: 'more', mode: 'core' });
    // The next write fails once (a full device): yesterday's day, already sent, leaves this device.
    const set = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('full'));
    await t.flush();
    set.mockRestore();
    expect(t.localDays().map((d) => d.day)).toEqual(['2026-11-11']);
    expect((await api.listUsage(id, '2026-11-01')).map((d) => d.day).sort()).toEqual(['2026-11-10', '2026-11-11']);
    t.close();
  });
});

describe('demo server: a professional’s pictures, files kept while something points to them', () => {
  const api = new LocalBackend();
  let child = '';
  const buf = (n: number) => new ArrayBuffer(n);

  it('a checked therapist who may propose sends; one who may only use the board does not', async () => {
    await AsyncStorage.clear();
    const s = await api.signUp({ role: 'parent', displayName: 'Eve', email: 'eve.b5@example.com', password: 'secret123' });
    await api.verifyCode({ email: 'eve.b5@example.com' }, s.demoCode!);
    child = (await api.createProfile({ name: 'Adam', data: createDefaultProfile() })).id;
    const inv = await api.invite(child, { email: 'sarah.b5@clinic.fr', role: 'therapist', level: 2, perms: { createMaterials: true, proposeVocabulary: true, changeAccess: false, invite: false, manageDevices: false, manager: false, viewData: false } });
    await api.signOut();
    const p = await api.signUp({ role: 'pro', displayName: 'Sarah', email: 'sarah.b5@clinic.fr', password: 'secret123' });
    await api.verifyCode({ email: 'sarah.b5@clinic.fr' }, p.demoCode!);
    await api.saveVerification({ fullName: 'Sarah K', country: 'France', profession: 'slp', documents: [{ name: 'd.pdf', kind: 'diploma', uploadedAt: 1, ref: 'x' }] });
    await api.submitVerification();
    await api.demoOpenBackOffice();
    await api.adminDecideVerification((await api.adminVerifications()).find((v) => v.email === 'sarah.b5@clinic.fr')!.userId, 'verified');
    await api.signOut();
    await api.signIn({ email: 'sarah.b5@clinic.fr', password: 'secret123' });
    const got = (await api.myInvitations()).received.find((i) => i.id === inv.id)!;
    await api.respondInvitation(got.id, true);
    await api.uploadMedia(child, PHOTO, buf(100), 'image/jpeg');
    expect((await api.listMedia(child)).map((f) => f.name)).toEqual([PHOTO]);
    // She may not remove; nor may anyone remove a file sent today, or one a proposal waiting uses.
    await api.removeMedia(child, [PHOTO]);
    expect((await api.listMedia(child)).length).toBe(1);
  });
});
