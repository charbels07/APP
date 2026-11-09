import { createDefaultProfile } from '../data/defaults';
import { applyOps } from '../lib/profileDiff';
import { emptyResource, resourceFromSandbox, resourceToOps, sandboxFor } from '../lib/resources';

describe('professional materials', () => {
  it('a TLA made in a sandbox comes back out with its own words', () => {
    const data = emptyResource('tla');
    const sb = sandboxFor('tla', data);
    expect(sb.tlaOrder).toEqual([]);
    // the pro creates a TLA with a new word
    sb.customConcepts.c_dentist = { id: 'c_dentist', cls: 'noun', labels: { fr: 'dentiste', en: 'dentist', ar: 'طبيب أسنان' }, emoji: '🦷', custom: true };
    sb.boards.tla_dentist = { id: 'tla_dentist', kind: 'tla', concept: 'c_dentist', rows: 2, cols: 2, cells: [{ concept: 'c_dentist' }, { concept: 'open' }, null, null] };
    sb.tlaOrder.push('tla_dentist');
    const out = resourceFromSandbox('tla', sb, data);
    expect(out.boards.map((b) => b.id)).toEqual(['tla_dentist']);
    expect(Object.keys(out.customConcepts)).toEqual(['c_dentist']);
  });

  it('proposing it to a child adds the TLA without replacing anything', () => {
    const child = createDefaultProfile();
    const sb = sandboxFor('tla', emptyResource('tla'));
    const tla = { ...child.boards[child.tlaOrder[0]] }; // same id as one the child already has
    sb.boards[tla.id] = tla;
    sb.tlaOrder = [tla.id];
    const data = resourceFromSandbox('tla', sb, emptyResource('tla'));
    const ops = resourceToOps(child, 'tla', data, 'x1');
    const { profile, conflicts } = applyOps(child, ops);
    expect(conflicts).toEqual([]);
    expect(profile.tlaOrder).toEqual([...child.tlaOrder, `${tla.id}_x1`]);
    expect(profile.boards[tla.id]).toEqual(child.boards[tla.id]);
    expect(profile.boards.core).toEqual(child.boards.core);
  });

  it('a schedule resource keeps only its own schedule', () => {
    const sb = sandboxFor('schedule', emptyResource('schedule'));
    expect(sb.schedules).toHaveLength(1);
    sb.schedules[0].steps.push({ id: 's1', concept: 'eat', done: false });
    const out = resourceFromSandbox('schedule', sb, emptyResource('schedule'));
    expect(out.schedules[0].steps.map((s) => s.concept)).toEqual(['eat']);
  });
});
