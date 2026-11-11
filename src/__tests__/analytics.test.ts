import type { Observation, UsageDay, UtteranceSample } from '../backend/types';
import { createDefaultProfile } from '../data/defaults';
import {
  classifyUtterance,
  daysOf,
  functionsSummary,
  languageSummary,
  lastDays,
  relationsOf,
  timeOfDay,
  toCsv,
  topInFolder,
  usageSummary,
  vocabularySummary,
} from '../lib/analytics';
import { emptyDay } from '../state/usageTracker';

const profile = createDefaultProfile();
profile.customConcepts.c_rex = { id: 'c_rex', cls: 'noun', labels: { fr: 'Rex', en: 'Rex', ar: 'ريكس' }, emoji: '🐶', custom: true };
const T = (day: string, h: number, m = 0) => {
  const [y, mo, d] = day.split('-').map(Number);
  return new Date(y, mo - 1, d, h, m).getTime();
};
const s = (...ids: string[]): UtteranceSample['tokens'] => ids.map((c) => (c.startsWith('"') ? { text: c.slice(1, -1) } : { c }));

function day(d: string, fill: Partial<UsageDay>, device = 'ipad'): UsageDay {
  return { ...emptyDay(d, device, 'ios · iPad', 'language'), ...fill };
}

const days: UsageDay[] = [
  // Before the period: 'want' already known.
  day('2026-10-20', { selections: 1, sessions: [{ start: T('2026-10-20', 9), end: T('2026-10-20', 9, 5), activeMs: 60000, selections: 1, utterances: 0 }], concepts: { want: 1 } }),
  day('2026-11-09', {
    selections: 6,
    utterances: 2,
    sessions: [
      { start: T('2026-11-09', 8), end: T('2026-11-09', 8, 10), activeMs: 4 * 60000, selections: 4, utterances: 1 },
      { start: T('2026-11-09', 19), end: T('2026-11-09', 19, 20), activeMs: 6 * 60000, selections: 2, utterances: 1 },
    ],
    hours: Array.from({ length: 24 }, (_, h) => (h === 8 ? 4 : h === 19 ? 2 : 0)),
    pages: { core: { opens: 2, ms: 120000 }, tla_meal: { opens: 1, ms: 300000 }, food: { opens: 3, ms: 60000 } },
    modes: { core: 3, folder: 2, tla: 1, quick: 0, schedule: 0, keyboard: 0 },
    stats: { distinctConcepts: 4, len1: 1, len2: 0, len3plus: 1, tokens: 4 },
    concepts: { want: 2, apple: 2, i: 1, c_rex: 1 },
    searches: 1,
    searched: { apple: 1 },
    tlaCreated: 1,
    samples: [
      { t: T('2026-11-09', 8, 2), tokens: s('i', 'want', 'apple') },
      { t: T('2026-11-09', 19, 5), tokens: s('no') },
    ],
  }),
  day(
    '2026-11-11',
    {
      selections: 3,
      utterances: 1,
      sessions: [{ start: T('2026-11-11', 12), end: T('2026-11-11', 12, 30), activeMs: 10 * 60000, selections: 3, utterances: 1 }],
      hours: Array.from({ length: 24 }, (_, h) => (h === 12 ? 3 : 0)),
      offlineMs: 5 * 60000,
      errors: 1,
      stats: { distinctConcepts: 3, len1: 0, len2: 1, len3plus: 0, tokens: 2 },
      concepts: { want: 1, apple: 1, help_me: 1 },
      samples: [{ t: T('2026-11-11', 12, 3), tokens: s('help_me', '"Rex"') }],
    },
    'phone',
  ),
];
const period = { from: '2026-11-05', to: '2026-11-11' };

describe('suivi: domain 1, general use', () => {
  const u = usageSummary(days, profile, period);

  it('counts days, sessions, active time and selections of the period only', () => {
    expect(u.periodDays).toBe(7);
    expect(u.daysUsed).toBe(2);
    expect(u.sessions).toBe(3);
    expect(u.sessionsPerDay).toBe(1.5);
    expect(u.sessionsPerWeek).toBe(3);
    expect(u.avgSessionMinutes).toBe(20);
    expect(u.activeMinutes).toBe(20);
    expect(u.selections).toBe(9);
    expect(u.utterances).toBe(3);
  });

  it('splits the day into moments and lists pages, activity boards, devices and breaks', () => {
    expect(u.timeOfDay).toEqual({ morning: 4, midday: 3, afternoon: 0, evening: 2, night: 0 });
    expect(u.pages[0]).toMatchObject({ page: 'food', kind: 'folder', opens: 3 });
    expect(u.pages.find((p) => p.page === 'tla_meal')).toMatchObject({ kind: 'tla', minutes: 5 });
    expect(u.tla).toEqual({ opens: 1, minutes: 5, created: 1 });
    expect(u.devices.map((d) => d.deviceId)).toEqual(['ipad', 'phone']);
    expect(u.inactivity).toEqual({ daysWithout: 1, longestBreakDays: 1, avgPauseMinutes: 650 });
    expect(u.offlineMinutes).toBe(5);
    expect(u.errors).toBe(1);
    expect(u.perDay).toHaveLength(7);
    expect(u.perDay[4]).toMatchObject({ day: '2026-11-09', selections: 6, activeMinutes: 10 });
  });

  it('knows its periods and moments', () => {
    expect(lastDays(7, new Date(2026, 10, 11))).toEqual({ from: '2026-11-05', to: '2026-11-11' });
    expect(daysOf({ from: '2026-10-30', to: '2026-11-02' })).toEqual(['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02']);
    expect([7, 12, 15, 20, 23, 3].map(timeOfDay)).toEqual(['morning', 'midday', 'afternoon', 'evening', 'night', 'night']);
  });
});

describe('suivi: domain 2, vocabulary', () => {
  const v = vocabularySummary(days, profile, period);

  it('counts each word, the different words, new and reused ones', () => {
    expect(v.available).toBe(true);
    expect(v.top[0]).toEqual({ concept: 'apple', count: 3 });
    expect(v.distinct).toBe(5);
    expect(v.hasBaseline).toBe(true);
    expect(v.newWords.map((w) => w.concept).sort()).toEqual(['apple', 'c_rex', 'help_me', 'i']);
    expect(v.reused).toEqual([
      { concept: 'apple', days: 2 },
      { concept: 'want', days: 2 },
    ]);
  });

  it('splits core and specific words, classes, personal words and searches', () => {
    expect(v.core).toBe(5); // want ×3, i, help_me (fixed block of activity boards)
    expect(v.specific).toBe(4);
    expect(v.byClass).toMatchObject({ verb: 3, noun: 4, pronoun: 1, social: 1 });
    expect(v.personal).toEqual([{ concept: 'c_rex', count: 1 }]);
    expect(v.searched).toEqual([{ concept: 'apple', count: 1 }]);
  });

  it('without the vocabulary consent, only the number of different words is known', () => {
    const plain = days.map(({ concepts: _c, searched: _s, samples: _x, ...d }) => d as UsageDay);
    const p = vocabularySummary(plain, profile, period);
    expect(p.available).toBe(false);
    expect(p.top).toEqual([]);
    expect(p.distinct).toBe(4);
  });

  it('finds the most chosen words of a folder', () => {
    expect(topInFolder(days, ['apple', 'banana', 'c_rex'])).toEqual(['apple', 'c_rex']);
  });
});

describe('suivi: domain 3, language', () => {
  const l = languageSummary(days, profile, period);

  it('measures lengths, mean length and combinations', () => {
    expect(l.samples).toBe(3);
    expect(l.utterances).toBe(3);
    expect([l.len1, l.len2, l.len3plus]).toEqual([1, 1, 1]);
    expect(l.mlu).toBe(2);
    expect(l.longest).toBe(3);
    expect(l.combinations).toBe(2);
  });

  it('finds relations, structures and features with examples', () => {
    expect(l.relations.agentAction).toBe(1);
    expect(l.relations.actionObject).toBe(1);
    expect(l.relations.negation).toBe(1);
    expect(l.structures.pronounVerb).toBe(1);
    expect(l.structures.pronounVerbNoun).toBe(1);
    expect(l.features.pronoun.words).toEqual([{ concept: 'i', count: 1 }]);
    expect(l.features.negation.count).toBe(1);
    expect(l.features.verb.examples[0].tokens).toEqual(s('i', 'want', 'apple'));
  });

  it('recognises the classic two-word relations', () => {
    expect(relationsOf(profile, s('mom', 'bag'))).toContain('possession');
    expect(relationsOf(profile, s('go', 'park'))).toContain('location');
    expect(relationsOf(profile, s('big', 'ball'))).toContain('attribute');
    expect(relationsOf(profile, s('more', 'juice'))).toContain('recurrence');
  });
});

describe('suivi: domain 4, communicative functions', () => {
  it('guesses the function of the examples of the specification', () => {
    const cases: [string[], string][] = [
      [['i', 'want', 'ball'], 'request_object'],
      [['open'], 'request_action'],
      [['help_me'], 'request_help'],
      [['need_break'], 'request_break'],
      [['i', 'want', 'stop_v'], 'request_break'],
      [['where', 'dad'], 'request_info'],
      [['no'], 'refuse'],
      [['i', 'not', 'want'], 'refuse'],
      [['i', 'like', 'pizza'], 'preference'],
      [['funny'], 'comment'],
      [['i', 'look', 'ball'], 'share_info'],
      [['yes'], 'answer'],
      [['hello'], 'greet'],
      [['look_at'], 'attention'],
      [['i', 'scared'], 'emotion'],
      [['it_hurts', 'head'], 'pain'],
      [['disagree'], 'opinion'],
      [['yesterday', 'i', 'go', 'park'], 'narrate'],
      [['not_that'], 'repair'],
      [['joking'], 'humour'],
      [['leave_me'], 'self_determination'],
      [['apple'], 'request_object'],
    ];
    for (const [ids, fn] of cases) expect([ids.join(' '), classifyUtterance(profile, s(...ids))]).toEqual([ids.join(' '), fn]);
  });

  it('merges the sentences with the adults’ observations (an observation replaces the guess)', () => {
    const obs: Observation[] = [
      {
        id: 'o1', profileId: 'p', at: T('2026-11-09', 19, 5), sampleT: T('2026-11-09', 19, 5), utterance: 'non',
        function: 'refuse', context: 'bain', partner: 'maman', autonomy: 'spontaneous', result: 'respecté',
        createdBy: 'u', authorName: 'Rita', createdAt: 0,
      },
      {
        id: 'o2', profileId: 'p', at: T('2026-11-10', 10), function: 'greet', context: 'école', partner: 'enseignante',
        autonomy: 'prompted', createdBy: 'u', authorName: 'Rita', createdAt: 0,
      },
      { id: 'o3', profileId: 'p', at: T('2026-10-01', 10), function: 'humour', createdBy: 'u', authorName: 'Rita', createdAt: 0 },
    ];
    const f = functionsSummary(days, obs, profile, period, (id) => profile.customConcepts[id]?.labels.fr ?? id);
    const by = Object.fromEntries(f.rows.map((r) => [r.fn, r]));
    expect(f.diversity).toBe(4);
    expect(f.detected).toBe(2); // the "no" sentence has an observation
    expect(f.observed).toBe(2); // the October one is outside the period
    expect(by.refuse).toMatchObject({ detected: 0, observed: 1, autonomy: { spontaneous: 1, prompted: 0, modelled: 0 } });
    expect(by.refuse.contexts).toEqual([{ concept: 'bain', count: 1 }]);
    expect(by.greet.partners).toEqual([{ concept: 'enseignante', count: 1 }]);
    expect(by.request_help.examples).toEqual(['help_me Rex']);
    expect(by.request_object.detected).toBe(1);
    expect(by.humour).toBeUndefined();
  });

  it('exports CSV safely', () => {
    expect(toCsv([['a', 'b,c'], ['"x"', 1]])).toBe('a,"b,c"\n"""x""",1');
  });
});
