/** The demo server plays the bin of children's profiles and the board's copies like the database (bin_scenario.sql). */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';

const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};

describe('demo server: copies of the board and the bin', () => {
  const api = new LocalBackend();
  let id = '';

  beforeAll(async () => {
    await AsyncStorage.clear();
    const c = (await api.signUp({ role: 'parent', displayName: 'Hala', email: 'hala@example.com', password: 'secret123' })).demoCode!;
    await api.verifyCode({ email: 'hala@example.com' }, c);
    id = (await api.createProfile({ name: 'Yara', age: 7, data: createDefaultProfile() })).id;
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps a weekly copy, and one before a big change', async () => {
    let rec = await api.getProfile(id);
    rec.data.settings.lang = 'fr';
    await api.saveProfile(id, rec.data, rec.version);
    expect((await api.listSnapshots(id)).map((s) => s.reason)).toEqual(['weekly']);
    rec = await api.getProfile(id);
    const words = (await api.listSnapshots(id))[0].words;
    rec.data.boards.core.cells = rec.data.boards.core.cells.map(() => null);
    await api.saveProfile(id, rec.data, rec.version);
    const list = await api.listSnapshots(id);
    expect(list.map((s) => s.reason)).toEqual(['big_change', 'weekly']);
    expect(list[0].words).toBe(words);
  });

  it('puts a copy back; the board as it was is kept first; the caregiver code stays', async () => {
    let rec = await api.getProfile(id);
    rec.data.settings.pin = '5829';
    await api.saveProfile(id, rec.data, rec.version);
    const big = (await api.listSnapshots(id)).find((s) => s.reason === 'big_change')!;
    const v = await api.restoreSnapshot(big.id);
    rec = await api.getProfile(id);
    expect(rec.version).toBe(v);
    expect(rec.data.boards.core.cells.some(Boolean)).toBe(true);
    expect(rec.data.settings.pin).toBe('5829');
    expect((await api.listSnapshots(id))[0].reason).toBe('before_restore');
    expect((await api.listHistory(id)).some((h) => h.summary.startsWith('restore:'))).toBe(true);
  });

  it('a deleted profile goes to the bin, can be put back, and needs a fresh proof', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 60 * 60_000);
    await expectCode(api.deleteProfile(id), 'proof_needed');
    jest.restoreAllMocks();
    await api.deleteProfile(id);
    expect(await api.listProfiles()).toEqual([]);
    await expectCode(api.getProfile(id), 'forbidden');
    const [entry] = await api.listBin();
    expect(entry).toMatchObject({ id, name: 'Yara' });
    expect(entry.eraseAt - entry.deletedAt).toBe(30 * 86_400_000);
    await api.restoreProfile(id);
    expect((await api.listProfiles()).map((p) => p.name)).toEqual(['Yara']);
  });

  it('after 30 days it is erased for good', async () => {
    await api.deleteProfile(id);
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 31 * 86_400_000);
    expect(await api.listBin()).toEqual([]);
    await expectCode(api.restoreProfile(id), 'forbidden');
  });
});
