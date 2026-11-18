import AsyncStorage from '@react-native-async-storage/async-storage';
import { readFileSync } from 'fs';
import { join } from 'path';
import { BackendError } from '../backend/Backend';
import { LocalBackend } from '../backend/local';
import type { FeatureDay } from '../backend/types';
import { createDefaultProfile } from '../data/defaults';
import { productStrings } from '../i18n/product';
import { applyAnswers, emptyAnswers } from '../lib/onboarding';
import {
  COUNTERS,
  FEATURES,
  PROBLEM_KINDS,
  SCREENS,
  SEEN_COUNTERS,
  SHARE_TERMS,
  SPEED_BUCKETS,
  SPEED_COUNTERS,
  SPEEDS,
  VERSION_PATTERN,
  cleanVersion,
  countFeature,
  countSeen,
  countSpeed,
  describeProblem,
  deviceForm,
  firstBoardShown,
  holdProduct,
  placeInCode,
  reportProblem,
  setProductSink,
  setScreen,
  shareChoice,
  sharesProduct,
  speedBucket,
  startupWaited,
  type Counter,
  type ProblemItem,
} from '../lib/product';
import { ProductCounter } from '../state/productCounters';
import { ADOPTION } from '../ui/data/Charts';

const read = (file: string) => readFileSync(join(__dirname, '../../supabase/migrations', file), 'utf8');
/** The latest definitions: the lists of 20261117000000_product.sql as 20261118000400_product_more.sql replaced them. */
const SQL = read('20261118000400_product_more.sql');
/** The quoted words of the SQL list that follows `marker`. */
const sqlList = (marker: string, sql = SQL): string[] => {
  const from = sql.indexOf(marker);
  if (from < 0) throw new Error(`not in the SQL: ${marker}`);
  const open = sql.indexOf('array[', from);
  return [...sql.slice(open, sql.indexOf(']', open)).matchAll(/'([A-Za-z0-9.:]+)'/g)].map((m) => m[1]);
};

const api = new LocalBackend();
const expectCode = async (p: Promise<unknown>, c: string) => {
  await expect(p).rejects.toBeInstanceOf(BackendError);
  await expect(p).rejects.toMatchObject({ code: c });
};
const signUp = async (role: 'parent' | 'pro', name: string, email: string) => {
  const sent = await api.signUp({ role, displayName: name, email, password: 'secret123' });
  await api.verifyCode({ email }, sent.demoCode!);
};
let profileId = '';
const share = async (on: boolean, terms = SHARE_TERMS) => {
  const rec = await api.getProfile(profileId);
  const data = structuredClone(rec.data);
  Object.assign(data.settings, on ? { shareStats: 'anonymous', shareTerms: terms } : { shareStats: 'none' });
  await api.saveProfile(profileId, data, rec.version);
};
const DEVICE = { platform: 'ios', form: 'tablet' as const, version: '1.4.0' };

beforeAll(async () => {
  await AsyncStorage.clear();
  await signUp('parent', 'Rita', 'rita@example.com');
  profileId = (await api.createProfile({ name: 'Adam', data: createDefaultProfile() })).id;
  await api.registerDevice(profileId, { id: 'ipad', name: 'iPad', kind: 'companion', platform: 'ios', appVersion: '1.4.0' });
});

describe('what the app may tell its team: fixed lists, shared with the database', () => {
  it('the app and the database accept exactly the same names', () => {
    expect(sqlList('create or replace function public.product_keys()')).toEqual([...COUNTERS]);
    expect(sqlList("if k is null or not (k = any (array[")).toEqual([...PROBLEM_KINDS]);
    expect(sqlList("case when it ->> 'screen' = any (array[")).toEqual(SCREENS.filter((s) => s !== 'other'));
    // The adoption, "seen" and version charts of the back office are computed for the features, in this order.
    expect(sqlList('create function public.product_features()')).toEqual([...FEATURES]);
    expect(sqlList('create function public.product_speeds()')).toEqual([...SPEEDS]);
    expect(sqlList('create function public.product_speed_buckets()')).toEqual([...SPEED_BUCKETS]);
    // The first list, replaced: it is still the beginning of today's.
    expect(sqlList('create function public.product_keys()', read('20261117000000_product.sql'))).toEqual(COUNTERS.slice(0, 30));
  });

  it('the database asks for the same agreement and keeps the same versions as the app', () => {
    expect(/create function public\.product_terms\(\)[^$]*\$\$\s*select (\d+)\s*\$\$/.exec(SQL)?.[1]).toBe(String(SHARE_TERMS));
    expect(SQL).toContain(`v ~ '${VERSION_PATTERN.source}'`);
    expect(['1.4.0', '1.0', '2026.11.18.1'].map(cleanVersion)).toEqual(['1.4.0', '1.0', '2026.11.18.1']);
    expect(['1.4.0-beta', 'Adam 1.4', '12345.1', '1.2.3.4.5', '', 42, null].map(cleanVersion)).toEqual(['', '', '', '', '', '', '']);
  });

  it('"seen" twins each feature; a waiting time is only one of five steps', () => {
    expect(SEEN_COUNTERS).toEqual(FEATURES.map((f) => `seen:${f}`));
    expect(SPEED_COUNTERS).toHaveLength(SPEEDS.length * SPEED_BUCKETS.length);
    expect([0, 499, 500, 999, 1000, 1999, 2000, 4999, 5000, 600000].map(speedBucket)).toEqual(['0.5', '0.5', '1', '1', '2', '2', '5', '5', 'more', 'more']);
  });

  it('every name has its words in the three languages', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const x = productStrings(lang);
      for (const f of FEATURES) expect([f, !!x.features[f]]).toEqual([f, true]);
      for (const k of PROBLEM_KINDS) expect([k, !!x.problemKinds[k]]).toEqual([k, true]);
      for (const s of SCREENS) expect([s, !!x.screens[s]]).toEqual([s, true]);
      for (const s of SPEEDS) expect([s, !!x.speedKinds[s]]).toEqual([s, true]);
      expect(x.groups).toHaveLength(ADOPTION.length);
      expect(x.speedSteps).toHaveLength(SPEED_BUCKETS.length);
      expect(x.seenGroups).toHaveLength(3);
    }
  });

  it('a technical problem never carries the error message, only known values and a place in the code', () => {
    const e = new TypeError('Cannot read "Adam veut de l’eau" of undefined');
    e.stack = 'TypeError: Cannot read "Adam veut de l’eau"\n    at Zt (https://famille-dupont.example/_expo/static/js/web/index-abc.js:1:482211)\n    at q (https://x/index-abc.js:1:99)';
    const p = describeProblem('crash', e, 'schedule');
    expect(p).toEqual({ kind: 'crash', name: 'TypeError', at: '1:482211', screen: 'schedule', n: 1 });
    expect(JSON.stringify(p)).not.toMatch(/Adam|eau|dupont|https/);
    // An error with a made-up name, or something that is not an error at all.
    expect(describeProblem('promise', { name: 'Adam’s error', stack: 42 }, 'board')).toEqual({ kind: 'promise', name: 'Error', at: '', screen: 'board', n: 1 });
    expect(describeProblem('mic', 'the microphone of Rita', 'editor').name).toBe('Error');
    // Safari and the tablet engine write their traces differently.
    expect(placeInCode('q@https://site.example/app.js:1:230417\nglobal code@https://site.example/app.js:1:1')).toBe('1:230417');
    expect(placeInCode('    at anonymous (address at index.android.bundle:1:91804)')).toBe('1:91804');
    expect(placeInCode('no trace here')).toBe('');
  });

  it('the agreement is the switch plus the list that was agreed to', () => {
    expect(sharesProduct({ shareStats: 'none' })).toBe(false);
    // Agreed before the counters existed: not enough.
    expect(sharesProduct({ shareStats: 'anonymous' })).toBe(false);
    expect(sharesProduct({ shareStats: 'anonymous', shareTerms: 1 })).toBe(false);
    // Agreed before "seen", the versions and the speed figures: asked again, nothing sent meanwhile.
    expect(sharesProduct({ shareStats: 'anonymous', shareTerms: 2 })).toBe(false);
    expect(SHARE_TERMS).toBe(3);
    expect(sharesProduct(shareChoice(true))).toBe(true);
    expect(shareChoice(false)).toEqual({ shareStats: 'none' });
  });

  it('the set-up offers it off; turning it on there is agreeing to today’s list', () => {
    const base = createDefaultProfile();
    const off = applyAnswers(base, { ...emptyAnswers('fr'), name: 'Adam' });
    expect(off.settings.shareStats).toBe('none');
    expect(sharesProduct(off.settings)).toBe(false);
    const on = applyAnswers(base, { ...emptyAnswers('fr'), name: 'Adam', shareStats: true });
    expect(on.settings).toMatchObject({ shareStats: 'anonymous', shareTerms: SHARE_TERMS });
  });

  it('knows a phone from a tablet from a computer, and says nothing else about the device', () => {
    expect(deviceForm('ios', 390, 844, true)).toBe('phone');
    expect(deviceForm('ios', 820, 1180, true)).toBe('tablet');
    expect(deviceForm('web', 1440, 900, false)).toBe('computer');
    expect(deviceForm('web', 820, 1180, true)).toBe('tablet');
  });

  it('the four groups of the adoption chart can be read (text inside each colour, 4.5:1)', () => {
    const lum = (hex: string) => {
      const v = hex.replace('#', '');
      const [r, g, b] = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const c of ADOPTION) {
      const [hi, lo] = [lum(c.bg), lum(c.fg)].sort((x, y) => y - x);
      expect((hi + 0.05) / (lo + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe('counting on the device, only with the family’s agreement', () => {
  let agreed = false;
  let clock = new Date(2026, 10, 15, 10, 0, 0).getTime();

  it('without the agreement nothing is counted, kept or sent', async () => {
    const c = await ProductCounter.open(api, profileId, 'ipad', DEVICE, () => agreed, () => clock);
    setProductSink(c);
    countFeature('timer');
    reportProblem('crash', new TypeError('x'));
    await c.flush();
    expect(c.local()).toEqual({ days: {}, versions: {}, pending: [], problems: [] });
    await api.demoOpenBackOffice();
    expect((await api.adminBugs()).top.some((p) => p.version === '1.4.0')).toBe(false);
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    c.close();
    setProductSink(null);
  });

  it('with it, a day is a few numbers under fixed names; a problem met three times is one line', async () => {
    await share(true);
    agreed = true;
    const c = await ProductCounter.open(api, profileId, 'ipad', DEVICE, () => agreed, () => clock);
    setProductSink(c);
    countFeature('timer');
    countFeature('timer');
    countFeature('tlaMs', 222000.4);
    countFeature('searchNone', 3);
    countFeature('timer', -5); // nonsense is ignored
    (countFeature as (k: string) => void)('theWordApple'); // a name that is not on the list is ignored
    setScreen('schedule');
    for (let i = 0; i < 3; i++) reportProblem('crash', Object.assign(new TypeError('secret words'), { stack: 'at f (app.js:1:482211)' }));
    reportProblem('mic');
    expect(c.local().days['2026-11-15']).toEqual({ timer: 2, tlaMs: 222000, searchNone: 3 });
    expect(c.local().problems).toEqual<ProblemItem[]>([
      { kind: 'crash', name: 'TypeError', at: '1:482211', screen: 'schedule', n: 3 },
      { kind: 'mic', name: 'Error', at: '', screen: 'schedule', n: 1 },
    ]);
    await c.flush();
    // Sent: the problems are gone from the device; today's count stays to be completed and sent again.
    expect(c.local().problems).toEqual([]);
    expect(c.local().pending).toEqual(['2026-11-15']);
    await api.demoOpenBackOffice();
    const bugs = await api.adminBugs();
    expect(bugs.top[0]).toMatchObject({ kind: 'mic', version: '1.4.0', platform: 'ios' });
    expect(bugs.top.find((p) => p.kind === 'crash' && p.version === '1.4.0')).toMatchObject({ name: 'TypeError', at: '1:482211', screen: 'schedule', n: 3 });
    expect(JSON.stringify(bugs)).not.toMatch(/secret|Adam|rita/i);
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    // The next day, yesterday is sent once and for all.
    clock += 24 * 3600 * 1000;
    countFeature('board');
    await c.flush();
    expect(c.local().pending).toEqual(['2026-11-16']);
    c.close();
    setProductSink(null);
  });

  it('the family stops sharing: the device forgets, and a counter opened later keeps nothing', async () => {
    const c = await ProductCounter.open(api, profileId, 'ipad', DEVICE, () => agreed, () => clock);
    expect(Object.keys(c.local().days)).toEqual(['2026-11-15', '2026-11-16']);
    await share(false);
    agreed = false;
    await c.forget();
    expect(c.local()).toEqual({ days: {}, versions: {}, pending: [], problems: [] });
    expect(await AsyncStorage.getItem(`caa.product.${profileId}`)).toBeNull();
    c.close();
    // Counters left by an older session are erased when the board opens without the agreement.
    await AsyncStorage.setItem(`caa.product.${profileId}`, JSON.stringify({ days: { '2026-11-01': { timer: 9 } }, pending: ['2026-11-01'], problems: [] }));
    const again = await ProductCounter.open(api, profileId, 'ipad', DEVICE, () => agreed, () => clock);
    expect(again.local().days).toEqual({});
    expect(await AsyncStorage.getItem(`caa.product.${profileId}`)).toBeNull();
    again.close();
  });

  it('"seen" is one yes a day; a wait is only its step; a day keeps the version it was counted with', async () => {
    await share(true);
    agreed = true;
    clock = new Date(2026, 10, 17, 9, 0, 0).getTime();
    const sent = jest.spyOn(api, 'saveFeatureDay');
    const c = await ProductCounter.open(api, profileId, 'ipad', DEVICE, () => agreed, () => clock);
    setProductSink(c);
    countSeen('timer');
    const changed = jest.spyOn(c as unknown as { changed: () => void }, 'changed');
    countSeen('timer');
    countSeen('timer');
    expect(changed).not.toHaveBeenCalled(); // already a yes today: nothing to write again
    (countSeen as (f: string) => void)('theWordApple');
    countSpeed('voice', 320);
    countSpeed('voice', 740);
    countSpeed('voice', 999);
    countSpeed('sync', 12000);
    countSpeed('start', -1);
    countSpeed('voice', NaN);
    (countSpeed as (k: string, ms: number) => void)('theWordApple', 10);
    expect(c.local().days['2026-11-17']).toEqual({ 'seen:timer': 1, 'voice:0.5': 1, 'voice:1': 2, 'sync:more': 1 });
    expect(c.local().versions).toEqual({ '2026-11-17': '1.4.0' });
    // A name that is not on the list never reaches the device's store either.
    expect(Object.keys(c.local().days['2026-11-17']).every((k) => COUNTERS.includes(k as Counter))).toBe(true);
    await c.flush();
    c.close();
    setProductSink(null);
    // The app is updated before that day was sent for good: the day keeps its own version.
    clock += 24 * 3600 * 1000;
    const after = await ProductCounter.open(api, profileId, 'ipad', { ...DEVICE, version: '1.5.0' }, () => agreed, () => clock);
    setProductSink(after);
    countSeen('board');
    sent.mockClear();
    await after.flush();
    expect(sent.mock.calls.map(([, d]) => [d.day, d.appVersion])).toEqual([
      ['2026-11-17', '1.4.0'],
      ['2026-11-18', '1.5.0'],
    ]);
    expect(sent.mock.calls[0][1].counts).toEqual({ 'seen:timer': 1, 'voice:0.5': 1, 'voice:1': 2, 'sync:more': 1 });
    sent.mockRestore();
    await share(false);
    agreed = false;
    await after.forget();
    after.close();
    setProductSink(null);
  });

  it('what is counted while a board opens waits for its counter; nothing waits when no board opens', () => {
    const got: [Counter, number][] = [];
    const sink = { count: (k: Counter, n: number) => void got.push([k, n]), problem: () => {} };
    setProductSink(null);
    countSeen('guide'); // the preview, a professional's workspace: nobody to hand it to
    holdProduct();
    countSeen('search');
    countSpeed('start', 1500);
    setProductSink(sink);
    expect(got).toEqual([
      ['seen:search', 1],
      ['start:2', 1],
    ]);
    setProductSink(null);
    holdProduct();
    countSeen('timer');
    setProductSink(null); // the board closed before its counter was ready: dropped
    setProductSink(sink);
    expect(got).toHaveLength(2);
    setProductSink(null);
  });

  it('the opening time is counted once, and only when no screen waited for a person first', () => {
    jest.isolateModules(() => {
      const p = require('../lib/product') as typeof import('../lib/product');
      const got: string[] = [];
      p.setProductSink({ count: (k) => void got.push(k), problem: () => {} });
      p.firstBoardShown();
      p.firstBoardShown();
      expect(got).toHaveLength(1);
      expect(got[0]).toMatch(/^start:(0\.5|1|2|5|more)$/);
      p.setProductSink(null);
    });
    jest.isolateModules(() => {
      const p = require('../lib/product') as typeof import('../lib/product');
      const got: string[] = [];
      p.setProductSink({ count: (k) => void got.push(k), problem: () => {} });
      p.startupWaited(); // the sign-in screen came first
      p.firstBoardShown();
      expect(got).toEqual([]);
      p.setProductSink(null);
    });
    // This file's own copy: the guards are exported for the board.
    expect(typeof firstBoardShown).toBe('function');
    expect(typeof startupWaited).toBe('function');
  });

  it('counting and reporting never break the app, even with nobody listening', () => {
    setProductSink(null);
    expect(() => countFeature('print')).not.toThrow();
    expect(() => reportProblem('print', new Error('x'))).not.toThrow();
    setProductSink({
      count: () => {
        throw new Error('disk full');
      },
      problem: () => {
        throw new Error('disk full');
      },
    });
    expect(() => countFeature('print')).not.toThrow();
    expect(() => reportProblem('print')).not.toThrow();
    setProductSink(null);
  });
});

describe('demo server: the same rules as the database', () => {
  const day = { day: '2026-11-15', deviceId: 'ipad', counts: { timer: 2 }, platform: 'ios', form: 'tablet' as const, appVersion: '1.4.0' };

  it('counters and problems are refused without the agreement, and from a professional', async () => {
    await api.signIn({ email: 'rita@example.com', password: 'secret123' });
    await expectCode(api.saveFeatureDay(profileId, day), 'forbidden');
    await expectCode(api.reportProblems(profileId, [{ kind: 'crash', name: 'Error', at: '', screen: 'board', n: 1, platform: 'ios', form: 'tablet', version: '1.4.0' }]), 'forbidden');
    await share(true, 1);
    await expectCode(api.saveFeatureDay(profileId, day), 'forbidden'); // agreed to the first list only
    await share(true, 2);
    await expectCode(api.saveFeatureDay(profileId, day), 'forbidden'); // agreed before "seen", versions and speed
    await expectCode(api.reportProblems(profileId, [{ kind: 'crash', name: 'Error', at: '', screen: 'board', n: 1, platform: 'ios', form: 'tablet', version: '1.4.0' }]), 'forbidden');
    await share(true);
    await api.saveFeatureDay(profileId, day);
    // "Seen" is a yes for the day, a version is digits and dots only (same rules as the database).
    await api.saveFeatureDay(profileId, {
      ...day,
      day: '2026-11-14',
      counts: { 'seen:timer': 5, 'voice:1': 2.5, timer: 1, theWordApple: 3 } as FeatureDay['counts'],
      appVersion: '1.4.0 for Adam',
    });
    const kept = await (api as unknown as { tx: <T>(f: (db: { featureDays?: { data: FeatureDay }[] }) => T) => Promise<T> }).tx(
      (db) => db.featureDays?.find((f) => f.data.day === '2026-11-14')?.data,
    );
    expect(kept).toMatchObject({ counts: { 'seen:timer': 1, 'voice:1': 2, timer: 1 }, appVersion: '' });
    expect(Object.keys(kept!.counts)).toHaveLength(3);
    // A stranger, then a professional of the child's team.
    await api.signOut();
    await signUp('parent', 'Mallory', 'mallory@example.com');
    await expectCode(api.saveFeatureDay(profileId, day), 'forbidden');
    await expectCode(api.adminProduct(), 'forbidden');
    await expectCode(api.adminBugs(), 'forbidden');
    await expectCode(api.adminRoadmap(), 'forbidden');
    await expectCode(api.adminRoadmapSave({ title: { fr: 'x', en: '', ar: '' }, status: 'open' }), 'forbidden');
  });

  it('an agreement cannot be slipped into a new profile without the choice to share', async () => {
    const data = createDefaultProfile();
    Object.assign(data.settings, { shareStats: 'none', shareTerms: SHARE_TERMS });
    const rec = await api.createProfile({ name: 'M', data });
    expect((await api.getProfile(rec.id)).data.settings.shareTerms).toBeUndefined();
  });

  it('ideas: one vote per account, counted apart for families and professionals; only the team adds or hides one', async () => {
    const ideas = await api.roadmapList();
    expect(ideas.length).toBeGreaterThan(2);
    const first = ideas[0];
    await api.roadmapVote(first.id, true);
    await api.roadmapVote(first.id, true);
    expect((await api.roadmapList())[0]).toMatchObject({ votes: first.votes + 1, mine: true });
    await api.roadmapVote(first.id, false);
    expect((await api.roadmapList())[0]).toMatchObject({ votes: first.votes, mine: false });
    await api.roadmapVote(first.id, true);
    await api.demoOpenBackOffice();
    const before = (await api.adminRoadmap()).find((i) => i.id === first.id)!;
    expect(before.votes).toBe(first.votes + 1);
    expect(before.parents + before.pros).toBe(before.votes);
    await api.adminRoadmapSave({ title: { fr: 'Mode sombre', en: 'Dark mode', ar: 'الوضع الداكن' }, status: 'open' });
    await api.adminRoadmapSave({ id: first.id, title: first.title, status: 'hidden' });
    await expectCode(api.adminRoadmapSave({ title: { fr: ' ', en: '', ar: '' }, status: 'open' }), 'incomplete');
    expect((await api.adminLog())[0]).toMatchObject({ action: 'roadmap' });
    await api.signIn({ email: 'mallory@example.com', password: 'secret123' });
    const list = await api.roadmapList();
    expect(list.some((i) => i.id === first.id)).toBe(false);
    expect(list.some((i) => i.title.en === 'Dark mode')).toBe(true);
    await expectCode(api.roadmapVote(first.id, true), 'not_found');
  });

  it('the back office pages answer with example figures in the demonstration, and say so', async () => {
    await api.demoOpenBackOffice();
    const p = await api.adminProduct();
    expect(p.example).toBe(true);
    expect(p.features!.map((f) => f.key)).toEqual([...FEATURES]);
    for (const f of p.features!) if ('regular' in f) expect(f.regular + f.occasional + f.abandoned + f.never).toBe(p.children);
    // Seen and used, by version, speed: the same shapes as the database's, and the same rule
    // (a group of 1 to 4 children is never a number).
    const small = (n: number) => n > 0 && n < 5;
    expect(p.seen!.map((f) => f.key)).toEqual([...FEATURES]);
    for (const f of p.seen!) {
      if ('seenOnly' in f) expect(f.used + f.seenOnly + f.unseen).toBe(p.children30);
      if ('seen' in f) expect(f.seen + f.unseen).toBe(p.children30);
      for (const n of Object.values(f).filter((v): v is number => typeof v === 'number')) expect(small(n)).toBe(false);
    }
    expect(p.byVersion!.map((v) => v.version)).toEqual(['1.2.0', '1.1.0', 'other']);
    for (const v of p.byVersion!) {
      expect(v.features.map((f) => f.key)).toEqual([...FEATURES]);
      for (const f of v.features) if ('used' in f) expect([small(f.used), small(v.children - f.used)]).toEqual([false, false]);
    }
    expect(p.speed!.map((s) => s.key)).toEqual([...SPEEDS]);
    for (const s of p.speed!) expect(Object.keys(s.buckets).sort()).toEqual([...SPEED_BUCKETS].sort());
    const b = await api.adminBugs();
    expect(b.example).toBe(true);
    expect(b.daily).toHaveLength(30);
    expect(Object.values(b.kinds).reduce((x, y) => x + y, 0)).toBe(b.total);
  });
});
