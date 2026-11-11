import { monthGrid, weekdayIndex, ymd } from '../data/calendar';
import { createDefaultProfile } from '../data/defaults';
import { describeOps } from '../lib/describeOps';
import { applyAnswers, emptyAnswers } from '../lib/onboarding';
import { applyOps, diffProfiles, invertOps } from '../lib/profileDiff';
import { migrate } from '../lib/storage';

describe('week and month plans', () => {
  it('are off by default and turned on by the set-up answers', () => {
    expect(createDefaultProfile().settings.plans).toEqual({ week: false, month: false });
    expect(migrate({}).settings.plans).toEqual({ week: false, month: false });
    const p = applyAnswers(createDefaultProfile(), { ...emptyAnswers('fr'), planWeek: true });
    expect(p.settings.plans).toEqual({ week: true, month: false });
  });

  it('two people changing different days are merged; undo works', () => {
    const base = createDefaultProfile();
    const mum = structuredClone(base);
    mum.weekPlan = { '0': [{ id: 'a', concept: 'school' }] };
    const therapist = structuredClone(base);
    therapist.weekPlan = { '2': [{ id: 'b', concept: 'swing' }] };
    therapist.monthPlan = { e1: { id: 'e1', date: '2026-11-14', concept: 'party' } };
    const mumOps = diffProfiles(base, mum);
    const theirs = applyOps(base, diffProfiles(base, therapist)).profile;
    const merged = applyOps(theirs, mumOps);
    expect(merged.conflicts).toEqual([]);
    expect(Object.keys(merged.profile.weekPlan!).sort()).toEqual(['0', '2']);
    expect(merged.profile.monthPlan!.e1.concept).toBe('party');
    const undone = applyOps(merged.profile, invertOps(mumOps)).profile;
    expect(undone.weekPlan!['0']).toBeUndefined();
  });

  it('changes are described in words', () => {
    const base = createDefaultProfile();
    const next = structuredClone(base);
    next.weekPlan = { '0': [{ id: 'a', concept: 'eat' }] };
    next.monthPlan = { e1: { id: 'e1', date: '2026-11-14', concept: 'eat' } };
    const items = describeOps(diffProfiles(base, next), base, 'fr', 'fr').map((i) => i.text);
    expect(items).toContain('Planning de la semaine : lundi modifié');
    expect(items.some((t) => t.includes('samedi 14 novembre'))).toBe(true);
  });

  it('calendar: weeks start on Monday', () => {
    expect(weekdayIndex(new Date(2026, 10, 9))).toBe(0); // Monday 9 November 2026
    const grid = monthGrid(2026, 10); // November 2026 starts on a Sunday
    expect(grid.slice(0, 7).filter((d) => d === null)).toHaveLength(6);
    expect(grid.filter(Boolean)).toHaveLength(30);
    expect(grid.length % 7).toBe(0);
    expect(ymd(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
