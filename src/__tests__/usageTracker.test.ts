import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalBackend } from '../backend/local';
import { createDefaultProfile } from '../data/defaults';
import type { Settings } from '../model/types';
import { UsageTracker } from '../state/usageTracker';

const api = new LocalBackend();
let profileId = '';
let level: Settings['dataCollection'] = 'off';
let clock = new Date(2026, 10, 11, 9, 0, 0).getTime();
const now = () => clock;
const at = (h: number, m: number, s = 0) => (clock = new Date(2026, 10, 11, h, m, s).getTime());

async function setConsent(l: Settings['dataCollection']) {
  level = l;
  const rec = await api.getProfile(profileId);
  const data = structuredClone(rec.data);
  data.settings.dataCollection = l;
  await api.saveProfile(profileId, data, rec.version);
}

beforeAll(async () => {
  await AsyncStorage.clear();
  const sent = await api.signUp({ role: 'parent', displayName: 'Rita', email: 'rita@example.com', password: 'secret123' });
  await api.verifyCode({ email: 'rita@example.com' }, sent.demoCode!);
  profileId = (await api.createProfile({ name: 'Adam', data: createDefaultProfile() })).id;
});

describe('communication data, with the family consent', () => {
  it('records nothing while collection is off, and the server refuses data', async () => {
    const t = await UsageTracker.open(api, profileId, 'ipad', 'ios', () => level, now);
    t.record({ type: 'select', concept: 'want', mode: 'core' });
    await t.flush();
    expect(t.localDays()).toEqual([]);
    await expect(api.saveUsageDay(profileId, { day: '2026-11-11' } as never)).rejects.toMatchObject({ code: 'forbidden' });
    t.close();
  });

  it('counts sessions, active time, places, hours and sentences; keeps words at "vocabulary"', async () => {
    await setConsent('vocabulary');
    const t = await UsageTracker.open(api, profileId, 'ipad', 'ios', () => level, now);
    at(9, 0, 0);
    t.record({ type: 'page', page: 'core' });
    at(9, 0, 10);
    t.record({ type: 'select', concept: 'i', mode: 'core' });
    at(9, 0, 20);
    t.record({ type: 'select', concept: 'want', mode: 'core' });
    at(9, 0, 30);
    t.record({ type: 'select', concept: 'pizza', mode: 'folder' });
    at(9, 0, 35);
    t.record({ type: 'speak', tokens: [{ c: 'i' }, { c: 'want' }, { c: 'pizza' }] });
    // 10 minutes later: a new session
    at(9, 10, 35);
    t.record({ type: 'select', concept: 'want', mode: 'tla' });
    await t.flush();
    const [day] = await api.listUsage(profileId, '2026-11-01');
    expect(day.sessions).toHaveLength(2);
    expect(day.sessions[0].activeMs).toBe(35000);
    expect(day.selections).toBe(4);
    expect(day.utterances).toBe(1);
    expect(day.modes).toMatchObject({ core: 2, folder: 1, tla: 1 });
    expect(day.hours[9]).toBe(4);
    expect(day.concepts).toEqual({ i: 1, want: 2, pizza: 1 });
    expect(day.stats).toMatchObject({ distinctConcepts: 3, len3plus: 1, tokens: 3 });
    expect(day.samples).toBeUndefined(); // sentences only at "language"
    expect(day.pages.core.opens).toBe(1);
    t.close();
  });

  it('keeps sentences only at "language", and drops words if consent goes back to "usage"', async () => {
    await setConsent('language');
    const t = await UsageTracker.open(api, profileId, 'ipad', 'ios', () => level, now);
    at(10, 0, 0);
    t.record({ type: 'speak', tokens: [{ c: 'help_me' }] });
    await t.flush();
    expect((await api.listUsage(profileId, '2026-11-01'))[0].samples).toHaveLength(1);
    await setConsent('usage');
    at(10, 1, 0);
    t.record({ type: 'select', concept: 'no', mode: 'quick' });
    await t.flush();
    const [day] = await api.listUsage(profileId, '2026-11-01');
    expect(day.concepts).toBeUndefined();
    expect(day.samples).toBeUndefined();
    expect(day.level).toBe('usage');
    t.close();
  });
});
