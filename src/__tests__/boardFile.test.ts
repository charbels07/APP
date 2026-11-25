/** "Export the board" and "Import a board from another caregiver" (gap review, Q40, Q41, Q49; src/lib/backupFile.ts). */
import { createDefaultProfile } from '../data/defaults';
import { asReceived, backupBytes, backupFileName, boardForFile, readBoardFile } from '../lib/backupFile';
import { familyCodeUnset } from '../lib/caregiverCode';

jest.mock('../lib/media', () => ({ mediaContent: async () => undefined, saveMediaNamed: async () => {} }));
jest.mock('../lib/platform', () => ({ exportBytes: async () => {} }));

const PHOTO = '1762000000001_aa11aa.jpg';
const VOICE = '1762000000002_aa11aa.t120-980.m4a';
const MISSING = '1762000000003_aa11aa.jpg';

function family() {
  const p = createDefaultProfile();
  p.settings.pin = '4826';
  p.settings.dataCollection = 'vocabulary';
  p.settings.shareStats = 'anonymous';
  p.overrides.manger = { symbol: { kind: 'media', name: PHOTO }, audio: { fr: VOICE } };
  p.overrides.boire = { symbol: { kind: 'media', name: MISSING }, app: { url: 'https://example.com', triggers: [] } };
  p.help = { ...p.help, emergencyContact: 'Maman 03 123 456', howICommunicate: 'Je montre du doigt.' };
  p.demos = [{ id: 'd1', title: 'Goûter', lang: 'fr', steps: [] }];
  p.bin = [{ id: 'b1', at: Date.now(), kind: 'cell', board: 'core', index: 0, cell: { concept: 'manger' } }];
  return p;
}

describe('the board file', () => {
  it('is labelled Daleth AAC, and a file exported before the rename still opens', () => {
    const wrap = (format: string) => new TextEncoder().encode(JSON.stringify({ format, version: 1, profile: boardForFile(family()) }));
    expect(readBoardFile(wrap('daleth-board')).profile.boards.core.cells).toEqual(family().boards.core.cells);
    expect(readBoardFile(wrap('empower-board')).profile.boards.core.cells).toEqual(family().boards.core.cells);
    expect(() => readBoardFile(wrap('something-else'))).toThrow('not a board');
  });

  it('holds the board and its photos and sounds, never the caregiver code', async () => {
    const read = async (n: string) => (n === MISSING ? undefined : new Uint8Array([1, 2, 3, n.length]));
    const { bytes, missing } = await backupBytes(family(), 'Adam', read);
    expect(missing).toBe(1);
    const back = readBoardFile(bytes);
    expect((back.profile.settings as { pin?: string }).pin).not.toBe('4826');
    expect(JSON.stringify(back.profile)).not.toContain('4826');
    expect([...back.media.keys()].sort()).toEqual([PHOTO, VOICE].sort());
    expect([...back.media.get(PHOTO)!]).toEqual([1, 2, 3, PHOTO.length]);
    // The board itself, with its words in their places.
    expect(back.profile.boards.core.cells).toEqual(family().boards.core.cells);
    expect(boardForFile(family()).settings).not.toHaveProperty('pin');
  });

  it('a file from an older version (the profile as JSON) is still read; anything else is refused', () => {
    const old = new TextEncoder().encode(JSON.stringify(family()));
    expect(readBoardFile(old).profile.boards.core).toBeDefined();
    expect(() => readBoardFile(new TextEncoder().encode('{"hello":1}'))).toThrow();
    expect(() => readBoardFile(new Uint8Array([0x50, 0x4b, 3, 4, 0, 0]))).toThrow();
  });

  it('its name survives any child’s name', () => {
    expect(backupFileName('Adam / Léa')).toBe('Adam Léa.caa.zip');
    expect(backupFileName('../../x')).toBe('.. .. x.caa.zip');
    expect(backupFileName(undefined)).toBe('board.caa.zip');
    expect(backupFileName('a'.repeat(80)).length).toBeLessThanOrEqual(48);
  });

  it('imported, it is someone else’s board: no code, links, help contact, demonstrations, bin or family choices', () => {
    const p = asReceived(family());
    expect(familyCodeUnset(p.settings.pin)).toBe(true);
    expect(p.overrides.boire).not.toHaveProperty('app');
    expect(p.overrides.manger.symbol).toEqual({ kind: 'media', name: PHOTO });
    expect(p.help.emergencyContact).toBe('');
    expect(p.help.howICommunicate).toBe('Je montre du doigt.');
    expect(p.demos).toEqual([]);
    expect(p.bin).toBeUndefined();
    expect(p.settings.dataCollection).toBe('off');
    expect(p.settings.shareStats).toBe('none');
    expect(p.boards.core.cells).toEqual(family().boards.core.cells);
  });
});
