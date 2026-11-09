import { createDefaultProfile } from '../data/defaults';
import { applyOps, diffProfiles, invertOps, isCoreOp, same } from '../lib/profileDiff';
import { classifyOps, preset } from '../lib/permissions';
import type { Profile } from '../model/types';

const base = createDefaultProfile();
const copy = (p: Profile): Profile => JSON.parse(JSON.stringify(p));

describe('changes as a list of ops', () => {
  it('sees exactly what a professional changed in a copy', () => {
    const draft = copy(base);
    draft.customConcepts.c_playground = { id: 'c_playground', cls: 'noun', labels: { fr: 'aire de jeux', en: 'playground', ar: 'ملعب' }, emoji: '🛝', custom: true };
    const empty = draft.boards.places.cells.findIndex((c) => c === null);
    draft.boards.places.cells[empty] = { concept: 'c_playground' };
    draft.settings.speechRate = 0.8;
    draft.settings.pin = '9999'; // private: never part of a change set
    const ops = diffProfiles(base, draft);
    expect(ops.map((o) => o.path)).toEqual(
      expect.arrayContaining([['cell', 'places', empty], ['concept', 'c_playground'], ['setting', 'speechRate']]),
    );
    expect(ops.some((o) => o.path[1] === 'pin')).toBe(false);
    expect(ops).toHaveLength(3);
  });

  it('applies changes, detects conflicts and undoes', () => {
    const draft = copy(base);
    draft.boards.food.cells[0] = { concept: 'pizza' };
    const ops = diffProfiles(base, draft);
    const { profile: after, conflicts } = applyOps(base, ops);
    expect(conflicts).toHaveLength(0);
    expect(after.boards.food.cells[0]).toEqual({ concept: 'pizza' });
    // undo brings the original back
    expect(same(applyOps(after, invertOps(ops)).profile.boards.food, base.boards.food)).toBe(true);
    // someone else changed the same cell meanwhile: conflict, nothing overwritten
    const other = copy(base);
    other.boards.food.cells[0] = { concept: 'fries' };
    const res = applyOps(other, ops);
    expect(res.conflicts).toHaveLength(1);
    expect(res.profile.boards.food.cells[0]).toEqual({ concept: 'fries' });
  });

  it('treats core-vocabulary positions as protected', () => {
    const draft = copy(base);
    [draft.boards.core.cells[0], draft.boards.core.cells[1]] = [draft.boards.core.cells[1], draft.boards.core.cells[0]];
    const ops = diffProfiles(base, draft);
    expect(ops.every(isCoreOp)).toBe(true);
  });
});

describe('permissions decide what is direct, proposed or refused', () => {
  const draft = copy(base);
  draft.boards.food.cells[0] = { concept: 'pizza' }; // vocabulary
  [draft.boards.core.cells[0], draft.boards.core.cells[1]] = [draft.boards.core.cells[1], draft.boards.core.cells[0]]; // core
  draft.settings.speechRate = 0.7; // access settings
  const ops = diffProfiles(base, draft);

  it('therapist (level 2): vocabulary and core go for approval, settings refused', () => {
    const r = classifyOps(ops, preset('therapist'), base);
    expect(r.direct).toHaveLength(0);
    expect(r.approval.length).toBe(3);
    expect(r.forbidden.map((o) => o.path[0])).toEqual(['setting']);
  });
  it('level 3: direct, except core positions which still need approval', () => {
    const r = classifyOps(ops, { level: 3, perms: { ...preset('therapist').perms, changeAccess: true } }, base);
    expect(r.approval.every(isCoreOp)).toBe(true);
    expect(r.direct.map((o) => o.path[0]).sort()).toEqual(['cell', 'setting']);
  });
  it('teacher (level 1): nothing; parent: everything direct', () => {
    expect(classifyOps(ops, preset('teacher'), base).forbidden).toHaveLength(ops.length);
    expect(classifyOps(ops, { owner: true, ...preset('parent') }, base).direct).toHaveLength(ops.length);
  });
});
