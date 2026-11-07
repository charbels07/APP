import { ARASAAC_DEFAULTS, ARASAAC_IMAGES } from '../data/arasaacMap';
import { BUILTIN_CONCEPTS } from '../data/concepts';
import { createDefaultProfile, DEFAULT_HELP, QUICK_ZONE } from '../data/defaults';
import { label } from '../lib/lexicon';
import { migrate } from '../lib/storage';
import { LANGS } from '../model/types';

const profile = createDefaultProfile();
const boards = Object.values(profile.boards);

describe('starter content integrity', () => {
  it('every board cell, schedule step and help option refers to an existing concept', () => {
    const missing: string[] = [];
    for (const b of boards) {
      if (!BUILTIN_CONCEPTS[b.concept]) missing.push(`${b.id}:title`);
      b.cells.forEach((c) => c && !BUILTIN_CONCEPTS[c.concept] && missing.push(`${b.id}:${c.concept}`));
    }
    for (const s of profile.schedules) s.steps.forEach((st) => !BUILTIN_CONCEPTS[st.concept] && missing.push(st.concept));
    for (const id of [...DEFAULT_HELP.options, ...QUICK_ZONE]) if (!BUILTIN_CONCEPTS[id]) missing.push(id);
    expect(missing).toEqual([]);
  });

  it('boards have exactly rows × cols cells, and folders point to real boards', () => {
    for (const b of boards) {
      expect(b.cells).toHaveLength(b.rows * b.cols);
      b.cells.forEach((c) => c?.folder && expect(profile.boards[c.folder]).toBeDefined());
    }
  });

  it('linked TLAs in schedules exist', () => {
    for (const s of profile.schedules) for (const st of s.steps) if (st.tla) expect(profile.boards[st.tla]).toBeDefined();
  });

  it('every concept has a label in French, English and Arabic', () => {
    for (const c of Object.values(BUILTIN_CONCEPTS)) for (const l of LANGS) expect(c.labels[l].trim()).not.toBe('');
  });

  it('every default pictogram is bundled (works offline, OFF-01)', () => {
    for (const id of Object.values(ARASAAC_DEFAULTS)) expect(ARASAAC_IMAGES[id]).toBeDefined();
  });

  it('no core word appears twice on the core board', () => {
    const ids = profile.boards.core.cells.filter(Boolean).map((c) => c!.concept);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('stable motor plan (spec §24, COM-03, GEN-01)', () => {
  it('switching language changes labels but never positions', () => {
    const before = profile.boards.core.cells.map((c) => c?.concept ?? null);
    const p = createDefaultProfile();
    for (const l of LANGS) {
      p.settings.lang = l;
      expect(p.boards.core.cells.map((c) => c?.concept ?? null)).toEqual(before);
      expect(label(p, 'want', l)).toBe(BUILTIN_CONCEPTS.want.labels[l]);
    }
  });

  it('family overrides change the label without touching the built-in vocabulary', () => {
    const p = createDefaultProfile();
    p.overrides.grandma = { labels: { fr: 'Téta' } };
    expect(label(p, 'grandma', 'fr')).toBe('Téta');
    expect(BUILTIN_CONCEPTS.grandma.labels.fr).toBe('mamie');
  });

  it('feminine forms follow the profile setting', () => {
    const p = createDefaultProfile();
    p.settings.gender = 'f';
    expect(label(p, 'tired', 'fr')).toBe('fatiguée');
    expect(label(p, 'tired', 'ar')).toBe('تعبانة');
    expect(label(p, 'tired', 'en')).toBe('tired');
  });
});

describe('profile migration', () => {
  it('fills in settings added after a profile was saved', () => {
    const old = createDefaultProfile() as any;
    delete old.settings.quickZone;
    delete old.settings.timer;
    const m = migrate(old);
    expect(m.settings.quickZone).toBe(false);
    expect(m.settings.timer.display.length).toBeGreaterThan(0);
  });
});
