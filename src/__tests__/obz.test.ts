/** "Export for another AAC app (.obz)": the ZIP writer and the Open Board Format files. */
import { createDefaultProfile } from '../data/defaults';
import { PICTO_LIBRARIES } from '../data/pictoLibraries';
import { label } from '../lib/lexicon';
import { buildObz, emojiPictoKey, OBF_FORMAT, obzBytes, obzFileName, planObz, type ObfBoard, type ObzLoaded } from '../lib/obz';
import { crc32, unzipStore, zipStore } from '../lib/zip';
import type { Profile } from '../model/types';

const text = (s: string) => new TextEncoder().encode(s);
const read = (b: Uint8Array) => new TextDecoder().decode(b);

describe('ZIP writer (stored files)', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('writes an archive that reads back the same, names in UTF-8', () => {
    const png = new Uint8Array([137, 80, 78, 71, 0, 255, 1, 2]);
    const zip = zipStore(
      [
        { name: 'manifest.json', data: '{"a":1}' },
        { name: 'images/صورة é.png', data: png },
        { name: 'empty.txt', data: '' },
      ],
      new Date(2026, 10, 18, 10, 30, 0),
    );
    // Local header first, end record last.
    expect([...zip.subarray(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect([...zip.subarray(zip.length - 22, zip.length - 18)]).toEqual([0x50, 0x4b, 0x05, 0x06]);
    const files = unzipStore(zip);
    expect([...files.keys()]).toEqual(['manifest.json', 'images/صورة é.png', 'empty.txt']);
    expect(read(files.get('manifest.json')!)).toBe('{"a":1}');
    expect([...files.get('images/صورة é.png')!]).toEqual([...png]);
    expect(files.get('empty.txt')!.length).toBe(0);
  });

  it('refuses names that would leave the folder, or the same name twice', () => {
    expect(() => zipStore([{ name: '../x', data: '' }])).toThrow();
    expect(() => zipStore([{ name: '/x', data: '' }])).toThrow();
    expect(() => zipStore([{ name: 'a', data: '' }, { name: 'a', data: '' }])).toThrow();
  });
});

/** A profile in English and French, with a photo, a recording, a word above the level and an app link. */
function familyProfile(): Profile {
  const p = createDefaultProfile();
  p.settings.lang = 'en';
  p.settings.langs = ['en', 'fr'];
  p.settings.arabic = 'none';
  p.settings.revealLevel = 1;
  p.overrides.mom = { symbol: { kind: 'media', name: '170000_abc.jpg' } };
  p.overrides.eat = { audio: { en: '170001_def.t120-980.m4a' } };
  p.overrides.app_youtube = { app: { url: 'https://www.youtube.com/watch?v=secret', triggers: [] } };
  return p;
}

/** Fake bytes for every picture and recording the plan asks for, except the ones listed. */
function loadAll(profile: Profile, missing: string[] = []): ObzLoaded {
  const plan = planObz(profile);
  const pictures = new Map(
    [...plan.pictures.keys()].filter((k) => !missing.includes(k)).map((k) => [k, { bytes: text(k), contentType: k.startsWith('media:') ? 'image/jpeg' : 'image/webp' }]),
  );
  const sounds = new Map([...plan.sounds.keys()].map((k) => [k, { bytes: text(k), contentType: 'audio/mp4' }]));
  return { pictures, sounds };
}

describe('Open Board Format export', () => {
  const profile = familyProfile();
  const loaded = loadAll(profile);
  const { manifest, boards, files } = buildObz(profile, loaded);
  const byId = new Map(boards.map((b) => [b.id, b]));
  const fileNames = files.map((f) => f.name);
  const core = byId.get('core')!;

  it('has a manifest pointing at the main board, every board and every picture', () => {
    expect(manifest.format).toBe(OBF_FORMAT);
    expect(manifest.root).toBe('boards/core.obf');
    expect(fileNames[0]).toBe('manifest.json');
    // The main board, its folders, the activity boards.
    for (const id of ['core', 'food', 'people', 'apps', 'tla_meal', 'tla_dentist']) expect(manifest.paths.boards[id]).toBe(`boards/${id}.obf`);
    for (const path of [...Object.values(manifest.paths.boards), ...Object.values(manifest.paths.images), ...Object.values(manifest.paths.sounds)])
      expect(fileNames).toContain(path);
  });

  it('keeps the real places of the cards, not the "no holes" display of level 1', () => {
    const stored = profile.boards.core;
    expect(core.grid).toMatchObject({ rows: stored.rows, columns: stored.cols });
    const button = new Map(core.buttons.map((b) => [b.id, b]));
    stored.cells.forEach((cell, i) => {
      const id = core.grid.order[Math.floor(i / stored.cols)][i % stored.cols];
      if (!cell) return expect(id).toBeNull();
      expect(button.get(id!)!.label).toBe(label(profile, cell.concept, 'en'));
    });
    // Words above the level stay in place, hidden (as on the child's board).
    const hidden = core.buttons.filter((b) => b.hidden).length;
    expect(hidden).toBe(stored.cells.filter((c) => c && (c.level ?? 1) > 1).length);
    expect(hidden).toBeGreaterThan(0);
  });

  it('says the words, never a folder: a folder opens its board', () => {
    const want = core.buttons.find((b) => b.label === 'want')!;
    expect(want.vocalization).toBe('want');
    expect(want.load_board).toBeUndefined();
    const folders = core.buttons.filter((b) => b.load_board);
    expect(folders.length).toBe(profile.boards.core.cells.filter((c) => c?.folder).length);
    for (const f of folders) {
      expect(f.vocalization).toBeUndefined();
      expect(f.label).toBeTruthy();
      expect(manifest.paths.boards[f.load_board!.id]).toBe(f.load_board!.path);
    }
  });

  it('gives each pictogram its library, licence and author; the family photo is private', () => {
    const want = core.buttons.find((b) => b.label === 'want')!;
    const img = core.images.find((i) => i.id === want.image_id)!;
    const mulberry = PICTO_LIBRARIES.find((l) => l.id === 'mulberry')!;
    expect(img.license).toMatchObject({ type: mulberry.license, author_name: mulberry.author, source_url: mulberry.website });
    expect(img.content_type).toBe('image/webp');
    expect(fileNames).toContain(img.path);
    // Every picture a board uses is listed on that board.
    for (const b of boards) for (const btn of b.buttons) if (btn.image_id) expect(b.images.some((i) => i.id === btn.image_id)).toBe(true);
    const people = byId.get('people')!;
    const mom = people.buttons.find((b) => b.label === label(profile, 'mom', 'en'))!;
    const photo = people.images.find((i) => i.id === mom.image_id)!;
    expect(photo).toMatchObject({ content_type: 'image/jpeg', license: { type: 'private' } });
    expect(photo.path).toMatch(/^images\/.+\.jpg$/);
  });

  it('a picture that could not be read leaves the word with its label', () => {
    const iButton = core.buttons.find((b) => b.label === 'I')!;
    expect(iButton.image_id).toBeTruthy();
    const without = buildObz(profile, loadAll(profile, ['picto:openmoji/1F64B'])).boards.find((b) => b.id === 'core')!;
    const again = without.buttons.find((b) => b.label === 'I')!;
    expect(again.image_id).toBeUndefined();
    expect(again.vocalization).toBe('I');
  });

  it('carries the family recording of a word, in the board language', () => {
    const eat = core.buttons.find((b) => b.label === 'eat')!;
    const snd = core.sounds.find((s) => s.id === eat.sound_id)!;
    expect(snd).toMatchObject({ content_type: 'audio/mp4', license: { type: 'private' } });
    expect(snd.path).toMatch(/^sounds\/.+\.m4a$/);
  });

  it('adds the other language of the child as translations', () => {
    expect(core.locale).toBe('en');
    expect(core.strings?.fr?.want).toBe(label(profile, 'want', 'fr'));
    expect(core.strings?.ar).toBeUndefined();
  });

  it('never exports a link to another app', () => {
    const all = files.map((f) => (typeof f.data === 'string' ? f.data : '')).join('\n');
    expect(all).not.toContain('youtube.com');
    expect(all).not.toMatch(/"url"/);
  });

  it('is a ZIP that reads back to the same boards', () => {
    const zip = unzipStore(obzBytes(profile, loaded));
    const again = JSON.parse(read(zip.get('boards/core.obf')!)) as ObfBoard;
    expect(again).toEqual(core);
    expect(JSON.parse(read(zip.get('manifest.json')!))).toEqual(manifest);
  });

  it('uses the chosen Arabic and its words when the board is in Arabic', () => {
    const p = createDefaultProfile();
    p.settings.lang = 'ar';
    p.settings.langs = ['ar'];
    p.settings.arabic = 'eg';
    const { boards: arBoards } = buildObz(p, { pictures: new Map(), sounds: new Map() });
    const arCore = arBoards.find((b) => b.id === 'core')!;
    expect(arCore.locale).toBe('ar');
    expect(arCore.buttons.find((b) => b.id === 'btn_12')!.label).toBe(label(p, p.boards.core.cells[12]!.concept, 'ar'));
    expect(arCore.strings).toBeUndefined();
  });
});

describe('export helpers', () => {
  it('names an emoji picture after its OpenMoji file', () => {
    expect(emojiPictoKey('❤️')).toBe('openmoji/2764');
    expect(emojiPictoKey('👨‍👩‍👧')).toBe('openmoji/1F468-200D-1F469-200D-1F467');
    expect(emojiPictoKey('A')).toBeUndefined();
  });

  it('names the file after the child', () => {
    expect(obzFileName('Lina')).toBe('Lina.obz');
    expect(obzFileName('ري/م')).toBe('ريم.obz');
    expect(obzFileName('')).toBe('boards.obz');
  });
});
