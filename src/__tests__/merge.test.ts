/** Two devices changed the board at the same time: what is kept (gap review, Q39; src/lib/merge.ts). */
import { createDefaultProfile } from '../data/defaults';
import { describeOps } from '../lib/describeOps';
import { mergeOps } from '../lib/merge';
import { diffProfiles } from '../lib/profileDiff';
import { removeCells } from '../lib/cellActions';
import { binBoard } from '../lib/wordBin';
import type { Profile } from '../model/types';

const copy = <T,>(v: T): T => structuredClone(v);
/** Every word placed on a board, all boards together. */
const words = (p: Profile) =>
  Object.values(p.boards)
    .flatMap((b) => b.cells)
    .filter(Boolean)
    .map((c) => c!.concept);
const count = (list: string[], w: string) => list.filter((x) => x === w).length;

function swap(p: Profile, board: string, a: number, b: number) {
  const cells = p.boards[board].cells;
  [cells[a], cells[b]] = [cells[b], cells[a]];
}

describe('merging two versions of the board', () => {
  const base = createDefaultProfile();
  const folder = Object.keys(base.boards).find((id) => id !== 'core' && base.boards[id].kind !== 'tla' && base.boards[id].cells.filter(Boolean).length >= 2)!;
  const filled = base.boards[folder].cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  const [a, b] = filled;
  const wordA = base.boards[folder].cells[a]!.concept;
  const wordB = base.boards[folder].cells[b]!.concept;

  it('a swap against a deletion: no word is lost, the deleted one is in the bin, the swap is dropped whole', () => {
    const ours = copy(base);
    swap(ours, folder, a, b);
    const theirs = copy(base);
    removeCells(theirs, folder, [a]);
    const r = mergeOps(theirs, diffProfiles(base, ours));
    const cells = r.profile.boards[folder].cells;
    expect(cells[a]).toBeNull();
    expect(cells[b]?.concept).toBe(wordB);
    expect(r.profile.bin?.some((x) => x.kind === 'cell' && x.cell.concept === wordA)).toBe(true);
    expect(r.dropped.length).toBe(2);
  });

  it('a deletion against a swap: the word that was deleted here goes nowhere twice', () => {
    const ours = copy(base);
    removeCells(ours, folder, [a]);
    const theirs = copy(base);
    swap(theirs, folder, a, b);
    const r = mergeOps(theirs, diffProfiles(base, ours));
    const all = words(r.profile);
    // Their swap stays; our deletion (and its entry in the bin) is not applied: each word once.
    expect(count(all, wordA)).toBe(count(words(base), wordA));
    expect(count(all, wordB)).toBe(count(words(base), wordB));
    expect(r.profile.bin?.length ?? 0).toBe(0);
    expect(r.dropped.map((o) => o.path[0]).sort()).toEqual(['bin', 'cell']);
  });

  it('a move that collides is dropped whole: the word is never on the board twice nor gone', () => {
    const empty = base.boards[folder].cells.findIndex((c) => !c);
    const ours = copy(base);
    ours.boards[folder].cells[empty] = ours.boards[folder].cells[a];
    ours.boards[folder].cells[a] = null;
    const theirs = copy(base);
    theirs.boards[folder].cells[empty] = { concept: 'c_new' };
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(count(words(r.profile), wordA)).toBe(count(words(base), wordA));
    expect(r.profile.boards[folder].cells[a]?.concept).toBe(wordA);
    expect(r.profile.boards[folder].cells[empty]?.concept).toBe('c_new');
  });

  it('core words never move in a merge: a swap of the main board that collides is not applied', () => {
    const core = base.boards.core.cells.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
    const ours = copy(base);
    swap(ours, 'core', core[0], core[1]);
    const theirs = copy(base);
    theirs.boards.core.cells[core[1]] = { ...theirs.boards.core.cells[core[1]]!, hidden: true } as never;
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(r.profile.boards.core.cells[core[0]]).toEqual(base.boards.core.cells[core[0]]);
    expect(r.profile.boards.core.cells[core[1]]?.concept).toBe(base.boards.core.cells[core[1]]!.concept);
  });

  it('two people each adding an activity board: both are listed', () => {
    const make = (p: Profile, id: string) => {
      p.boards[id] = { ...copy(p.boards[p.tlaOrder[0]]), id };
      p.tlaOrder.push(id);
    };
    const ours = copy(base);
    make(ours, 'tla_ours');
    const theirs = copy(base);
    make(theirs, 'tla_theirs');
    const r = mergeOps(theirs, diffProfiles(base, ours));
    // (ours goes after the board it followed on our side)
    expect(r.profile.tlaOrder).toEqual([...base.tlaOrder, 'tla_ours', 'tla_theirs']);
    expect(r.profile.boards.tla_ours).toBeDefined();
    expect(r.dropped).toEqual([]);
  });

  it('a board deleted on one side and the list re-ordered on the other: the deleted one is not listed again', () => {
    const ours = copy(base);
    ours.tlaOrder = [...ours.tlaOrder].reverse();
    const theirs = copy(base);
    const gone = theirs.tlaOrder[0];
    binBoard(theirs, gone);
    delete theirs.boards[gone];
    theirs.tlaOrder = theirs.tlaOrder.filter((x) => x !== gone);
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(r.profile.tlaOrder).toEqual([...base.tlaOrder].reverse().filter((x) => x !== base.tlaOrder[0]));
  });

  it('a word is merged part by part: our picture and their name both stay', () => {
    const ours = copy(base);
    ours.overrides[wordA] = { ...(ours.overrides[wordA] ?? {}), symbol: { kind: 'emoji', value: '🍎' } };
    const theirs = copy(base);
    theirs.overrides[wordA] = { ...(theirs.overrides[wordA] ?? {}), labels: { fr: 'pomme verte' } };
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(r.profile.overrides[wordA]).toMatchObject({ symbol: { kind: 'emoji', value: '🍎' }, labels: { fr: 'pomme verte' } });
    expect(r.dropped).toEqual([]);
  });

  it('recordings in two languages made on two devices: both kept; the same part changed on both: theirs, and it is named', () => {
    const ours = copy(base);
    ours.overrides[wordA] = { audio: { fr: '1762000000001_aa11aa.m4a' }, symbol: { kind: 'emoji', value: '🍎' } };
    const theirs = copy(base);
    theirs.overrides[wordA] = { audio: { en: '1762000000002_aa11aa.m4a' }, symbol: { kind: 'emoji', value: '🍏' } };
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(r.profile.overrides[wordA].audio).toEqual({ fr: '1762000000001_aa11aa.m4a', en: '1762000000002_aa11aa.m4a' });
    expect(r.profile.overrides[wordA].symbol).toEqual({ kind: 'emoji', value: '🍏' });
    expect(r.dropped.length).toBe(1);
    const said = describeOps(r.dropped, base, 'en', 'en').map((c) => c.text);
    expect(said[0]).toMatch(/^Picture, name or sound of “.+” changed$/);
  });

  it('demonstrations and the bin are merged entry by entry', () => {
    const demo = (id: string) => ({ id, title: id, lang: 'fr' as const, steps: [] });
    const ours = copy(base);
    ours.demos = [demo('d_ours')];
    removeCells(ours, folder, [b]);
    const theirs = copy(base);
    theirs.demos = [demo('d_theirs')];
    removeCells(theirs, folder, [a]);
    const r = mergeOps(theirs, diffProfiles(base, ours));
    expect(r.profile.demos.map((d) => d.id).sort()).toEqual(['d_ours', 'd_theirs']);
    expect(r.profile.bin?.length).toBe(2);
    expect(r.profile.boards[folder].cells[a]).toBeNull();
    expect(r.profile.boards[folder].cells[b]).toBeNull();
  });

  it('a word deleted on one side and changed on the other stays deleted (named)', () => {
    const ours = copy(base);
    ours.customConcepts.c_x = { id: 'c_x', cls: 'noun', labels: { fr: 'x', en: 'x', ar: 'x' }, emoji: '⭐', custom: true };
    const start = copy(ours);
    ours.customConcepts.c_x.labels.fr = 'xx';
    const theirs = copy(start);
    delete theirs.customConcepts.c_x;
    const r = mergeOps(theirs, diffProfiles(start, ours));
    expect(r.profile.customConcepts.c_x).toBeUndefined();
    expect(r.dropped.length).toBe(1);
  });
});
