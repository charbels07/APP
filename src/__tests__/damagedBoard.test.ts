/**
 * A damaged board must still open (gap review of November 2026, Q42): `migrate` puts a safe value
 * where a part of a saved profile cannot be read, and changes nothing that is sound.
 */
import { createDefaultProfile } from '../data/defaults';
import { getConcept, label } from '../lib/lexicon';
import { migrate } from '../lib/storage';
import type { Profile } from '../model/types';

const saved = (): Profile => JSON.parse(JSON.stringify(createDefaultProfile()));
const damaged = (edit: (p: Record<string, any>) => void): Profile => { // eslint-disable-line @typescript-eslint/no-explicit-any
  const p = saved() as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  edit(p);
  return migrate(p as Partial<Profile>);
};

describe('a sound profile', () => {
  it('comes back as it was saved, and twice is the same as once', () => {
    const p = saved();
    p.overrides.ball = { labels: { fr: 'ballon' }, symbol: { kind: 'media', name: '1762000000001_ab12cd.jpg' }, audio: { fr: '1762000000002_zz99zz.m4a' }, cls: 'noun' };
    p.customConcepts.c_teta = { id: 'c_teta', cls: 'people', labels: { fr: 'Téta', en: 'Teta', ar: 'تيتا' }, emoji: '👵', custom: true };
    p.bin = [{ id: 'bin1', at: Date.now(), kind: 'cell', board: 'core', index: 3, cell: { concept: 'ball' } }];
    p.guide = { seen: true, read: ['start'], tailored: { newToAac: true } };
    p.firstThen = { first: 'eat', then: 'play' };
    const once = migrate(JSON.parse(JSON.stringify(p)));
    expect(once).toEqual(p);
    expect(migrate(JSON.parse(JSON.stringify(once)))).toEqual(once);
  });

  it('keeps the very same boards (no word is copied, moved or re-made)', () => {
    const p = saved();
    const m = migrate(p);
    for (const id of Object.keys(p.boards)) expect(m.boards[id]).toBe(p.boards[id]);
  });
});

describe('a damaged profile still gives a board', () => {
  it('nothing readable at all: the starting board', () => {
    for (const junk of [null, undefined, 5, 'x', [], {}]) {
      const m = migrate(junk as unknown as Partial<Profile>);
      expect(m.boards.core.cells.length).toBe(m.boards.core.rows * m.boards.core.cols);
      expect(m.tlaOrder.length).toBeGreaterThan(0);
    }
  });

  it('the list of activity boards is not a list', () => {
    const m = damaged((p) => (p.tlaOrder = 'tla_park'));
    expect(m.tlaOrder).toEqual(createDefaultProfile().tlaOrder);
    expect(damaged((p) => (p.tlaOrder = [5, null, 'tla_park', 'tla_park', 'nowhere'])).tlaOrder).toEqual(['tla_park']);
  });

  it('the sequences are not a list, or hold something that is not a sequence', () => {
    expect(Array.isArray(damaged((p) => (p.schedules = 5)).schedules)).toBe(true);
    const m = damaged((p) => {
      p.schedules = [p.schedules[0], 'x', { id: 's2', steps: 'none' }, { id: 's3', title: 7, concept: 's_morning', recurring: 'yes', steps: [{ id: 'a', concept: 'eat' }, 4] }];
    });
    expect(m.schedules.map((s) => s.id)).toEqual([saved().schedules[0].id, 's2', 's3']);
    expect(m.schedules[1].steps).toEqual([]);
    expect(m.schedules[2]).toMatchObject({ title: '', recurring: false, steps: [{ id: 'a', concept: 'eat', done: false }] });
  });

  it('a card that is not a card becomes an empty place, and no other card moves', () => {
    const before = saved();
    const m = damaged((p) => {
      p.boards.core.cells[2] = 'ball';
      p.boards.core.cells[5] = { concept: 7 };
      p.boards.core.cells[7] = { ...p.boards.core.cells[7], level: 9, size: 'big', span: [0, 'x'] };
    });
    expect(m.boards.core.cells[2]).toBeNull();
    expect(m.boards.core.cells[5]).toBeNull();
    expect(m.boards.core.cells[7]).toEqual({ concept: before.boards.core.cells[7]!.concept, ...(before.boards.core.cells[7]!.folder ? { folder: before.boards.core.cells[7]!.folder } : {}) });
    m.boards.core.cells.forEach((c, i) => {
      if (![2, 5, 7].includes(i)) expect(c).toEqual(before.boards.core.cells[i]);
    });
  });

  it('a board that lost its cards, its size or its kind', () => {
    const m = damaged((p) => {
      p.boards.food.cells = p.boards.food.cells.slice(0, 3);
      p.boards.people.kind = 'weird';
      p.boards.places = 'gone';
      delete p.boards.core;
    });
    expect(m.boards.food.cells.length).toBe(m.boards.food.rows * m.boards.food.cols);
    expect(m.boards.people.kind).toBe('folder');
    // A folder card always has a board to open; the main board is always there.
    expect(m.boards.places.cells.length).toBeGreaterThan(0);
    expect(m.boards.core.kind).toBe('core');
  });

  it('a visual scene that cannot be read: its place stays, an unreadable picture is left out', () => {
    const sound = damaged((p) => (p.boards.tla_park.scene = { image: { kind: 'media', name: '1762000000001_ab12cd.jpg' } }));
    expect(sound.boards.tla_park.scene).toEqual({ image: { kind: 'media', name: '1762000000001_ab12cd.jpg' } });
    expect(damaged((p) => (p.boards.tla_park.scene = { image: { kind: 'video' } })).boards.tla_park.scene).toEqual({});
    expect(damaged((p) => (p.boards.tla_park.scene = 'big')).boards.tla_park.scene).toBeUndefined();
    // The cards of the board do not move.
    expect(damaged((p) => (p.boards.tla_park.scene = 7)).boards.tla_park.cells).toEqual(saved().boards.tla_park.cells);
  });

  it('a folder the family made whose board is missing opens empty', () => {
    const m = damaged((p) => {
      const free = p.boards.mine.cells.findIndex((c: unknown) => c === null);
      p.boards.mine.cells[free] = { concept: 'c_holidays', folder: 'folder_holidays' };
    });
    expect(m.boards.folder_holidays).toMatchObject({ kind: 'folder', concept: 'c_holidays' });
    expect(m.boards.folder_holidays.cells.every((c) => c === null)).toBe(true);
  });

  it('a word of an unknown kind, a word without its names, a picture that is not one', () => {
    const m = damaged((p) => {
      p.customConcepts.c_a = { id: 'c_a', cls: 'sparkly', labels: { fr: 'chat' }, emoji: 5 };
      p.customConcepts.c_b = 'not a word';
      p.customConcepts.c_c = { cls: 'noun' };
      p.overrides.ball = { cls: 'sparkly', symbol: { kind: 'web', url: 'x' }, labels: { fr: 'ballon', en: 9 }, audio: 'no', display: 'huge' };
      p.overrides.eat = 4;
    });
    expect(m.customConcepts.c_a).toMatchObject({ id: 'c_a', cls: 'noun', labels: { fr: 'chat', en: 'chat', ar: 'chat' }, emoji: '⭐' });
    expect(m.customConcepts.c_b).toBeUndefined();
    expect(m.customConcepts.c_c).toMatchObject({ id: 'c_c', labels: { fr: 'c_c' } });
    expect(m.overrides.ball).toEqual({ labels: { fr: 'ballon' } });
    expect(m.overrides.eat).toBeUndefined();
  });

  it('settings of the wrong kind get the usual value, the others stay', () => {
    const m = damaged((p) => {
      Object.assign(p.settings, { visual: 'neon', access: 5, bar: 7, timer: { display: 'circle', sound: 'yes' }, speechRate: 'fast', showLabels: 'no', langs: ['xx'], voices: [], pin: 12, revealLevel: 8, repeatDelay: 3 });
    });
    const d = createDefaultProfile().settings;
    expect(m.settings).toMatchObject({ visual: d.visual, access: d.access, bar: d.bar, timer: d.timer, speechRate: d.speechRate, showLabels: d.showLabels, langs: [m.settings.lang], voices: d.voices, pin: d.pin, revealLevel: d.revealLevel, repeatDelay: 3 });
  });

  it('the help page, the plans, the demonstrations, the bin, the guide', () => {
    const m = damaged((p) => {
      p.help = { message: 'help', options: 'none' };
      p.weekPlan = { '0': 'x', '1': [{ id: 'a', concept: 'eat' }, 3] };
      p.monthPlan = [];
      p.demos = [{ id: 'd', title: 't', lang: 'fr', steps: [{ kind: 'speak' }] }, { id: 'e' }, 'x'];
      p.bin = [{ id: 'b', at: 1, kind: 'cell', board: 'core', index: 1, cell: 'ball' }, 5];
      p.guide = 'seen';
      p.firstThen = 'eat';
      p.lastTla = 5;
      p.activeSchedule = {};
    });
    const base = createDefaultProfile();
    expect(m.help).toEqual(base.help);
    expect(m.weekPlan).toEqual({ '0': [], '1': [{ id: 'a', concept: 'eat' }] });
    expect(m.monthPlan).toEqual({});
    expect(m.demos.map((d) => d.id)).toEqual(['d']);
    expect(m.bin).toBeUndefined();
    expect(m.guide).toBeUndefined();
    expect(m.firstThen).toBeUndefined();
    expect(m.lastTla).toBeUndefined();
    expect(m.activeSchedule).toBe(m.schedules[0].id);
  });
});

describe('names that are not ids', () => {
  it('a word, a folder or a board named like a part of every object ("toString") is not kept', () => {
    const m = damaged((p) => {
      p.boards.core.cells[2] = { concept: 'toString' };
      p.boards.core.cells[5] = { ...p.boards.core.cells[5], folder: 'valueOf' };
      p.boards.hasOwnProperty = { ...p.boards.tla_park, id: 'hasOwnProperty' };
      p.tlaOrder = [...p.tlaOrder, 'constructor', 'toString'];
      p.lastTla = 'toString';
      p.customConcepts.toString = { id: 'toString', cls: 'noun', labels: { fr: 'a', en: 'a', ar: 'a' }, emoji: '⭐' };
      p.schedules[0].steps[0] = { ...p.schedules[0].steps[0], concept: 'valueOf' };
      p.help.options = ['toString', ...p.help.options];
    });
    const base = saved();
    expect(m.boards.core.cells[2]).toBeNull();
    expect(m.boards.core.cells[5]?.folder).toBeUndefined();
    expect(Object.keys(m.boards)).not.toContain('hasOwnProperty');
    expect(m.tlaOrder).toEqual(base.tlaOrder);
    expect(m.lastTla).toBeUndefined();
    expect(Object.keys(m.customConcepts)).toEqual([]);
    expect(m.schedules[0].steps.length).toBe(base.schedules[0].steps.length - 1);
    expect(m.help.options).toEqual(base.help.options);
  });

  it('looking up a word by such a name finds nothing (not a function)', () => {
    const p = saved();
    expect(getConcept(p, 'toString')).toBeUndefined();
    expect(label(p, 'valueOf', 'fr')).toBe('valueOf');
  });
});

describe('activity boards', () => {
  it('a starting board the family deleted is not added back', () => {
    const m = damaged((p) => {
      delete p.boards.tla_park;
      p.tlaOrder = p.tlaOrder.filter((id: string) => id !== 'tla_park');
    });
    expect(m.boards.tla_park).toBeUndefined();
    expect(m.tlaOrder).not.toContain('tla_park');
  });

  it('one an older version had added back (present but not in the list) stays out of the list', () => {
    const m = damaged((p) => (p.tlaOrder = p.tlaOrder.filter((id: string) => id !== 'tla_park')));
    expect(m.tlaOrder).not.toContain('tla_park');
  });

  it('a board the family made that the list lost is put back at the end', () => {
    const m = damaged((p) => {
      p.boards.tla_k3x9 = { ...p.boards.tla_park, id: 'tla_k3x9' };
    });
    expect(m.tlaOrder[m.tlaOrder.length - 1]).toBe('tla_k3x9');
    expect(m.tlaOrder.slice(0, -1)).toEqual(createDefaultProfile().tlaOrder);
  });

  it('a new folder of the app still arrives with its board (the Apps folder)', () => {
    const m = damaged((p) => {
      p.migrations = [];
      const slot = p.boards.core.cells.findIndex((c: { folder?: string } | null) => c?.folder === 'apps');
      p.boards.core.cells[slot] = null;
      delete p.boards.apps;
    });
    expect(m.boards.core.cells.some((c) => c?.folder === 'apps')).toBe(true);
    expect(m.boards.apps.cells.length).toBeGreaterThan(0);
  });
});
