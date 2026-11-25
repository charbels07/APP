/**
 * "Export the board": one file with the board and the photos and recordings it uses, so that it
 * can be kept as a backup or given to another caregiver (gap review, Q40, Q41, Q49).
 *
 * The file is a ZIP (`<child>.caa.zip`): `board.json` (the profile, never the caregiver code) and
 * `media/<name>` for each photo or recording this device has. A file from an older version (the
 * profile alone, as JSON) is still read.
 *
 * Imported, a board is someone else's ("from another caregiver"): it arrives with no code, no
 * links, no help contact, no demonstrations and no bin, and none of the family's choices about
 * follow-up and sharing (`asReceived`). The same family on another device simply signs in.
 */
import { DEFAULT_SETTINGS } from '../data/defaults';
import type { Profile } from '../model/types';
import { mediaContent, saveMediaNamed } from './media';
import { isSyncable, mediaNamesIn } from './mediaPlan';
import { exportBytes } from './platform';
import { plain } from './safety';
import { migrate } from './storage';
import { unzipStore, zipStore, type ZipEntry } from './zip';

export const BOARD_FORMAT = 'daleth-board';
/** Files exported before the app was renamed (25 November 2026) still import. */
const OLD_BOARD_FORMATS = ['empower-board'];

/** A name the file can have whatever the child's name ("/" and the like are left out). */
export function backupFileName(childName: string | undefined): string {
  const clean = (childName ?? '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);
  return `${clean || 'board'}.caa.zip`;
}

/** What goes into the file: the board without the caregiver code. */
export function boardForFile(profile: Profile): Profile {
  const p = JSON.parse(JSON.stringify(profile)) as Profile;
  delete (p.settings as { pin?: string }).pin;
  return p;
}

async function bytesOf(name: string): Promise<Uint8Array | undefined> {
  const c = await mediaContent(name).catch(() => undefined);
  if (!c) return undefined;
  return c instanceof Uint8Array ? c : new Uint8Array(await c.arrayBuffer());
}

/** The file's bytes. `read`: how a photo or a recording is read (tests bring their own). */
export async function backupBytes(profile: Profile, childName: string | undefined, read: (name: string) => Promise<Uint8Array | undefined> = bytesOf): Promise<{ bytes: Uint8Array; missing: number }> {
  const board = boardForFile(profile);
  const entries: ZipEntry[] = [
    { name: 'board.json', data: JSON.stringify({ format: BOARD_FORMAT, version: 1, exportedAt: new Date().toISOString(), childName: childName ?? '', profile: board }) },
  ];
  let missing = 0;
  for (const name of mediaNamesIn(board).filter(isSyncable)) {
    const bytes = await read(name).catch(() => undefined);
    if (bytes) entries.push({ name: `media/${name}`, data: bytes });
    else missing++; // made on another device and not received here yet
  }
  return { bytes: zipStore(entries), missing };
}

/** Builds the file and hands it to the share sheet (tablet) or the downloads (browser). */
export async function exportBackup(profile: Profile, childName: string | undefined): Promise<{ missing: number }> {
  const { bytes, missing } = await backupBytes(profile, childName);
  await exportBytes(backupFileName(childName), bytes, 'application/zip');
  return { missing };
}

export interface ReadBoard {
  profile: Profile;
  /** Photos and recordings found in the file, by name. */
  media: Map<string, Uint8Array>;
}

const isZip = (b: Uint8Array) => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b;

/** Reads a board file (this version's ZIP, or an older version's JSON). Throws when it is not one. */
export function readBoardFile(bytes: Uint8Array): ReadBoard {
  let json: unknown;
  const media = new Map<string, Uint8Array>();
  let total = 0;
  if (isZip(bytes)) {
    const files = unzipStore(bytes);
    const board = files.get('board.json');
    if (!board) throw new Error('not a board');
    json = JSON.parse(new TextDecoder().decode(board));
    for (const [path, data] of files) {
      const name = path.startsWith('media/') ? path.slice('media/'.length) : '';
      // Only pictures and sounds with the app's names, of a sensible size (10 MB each, 300 MB in all).
      if (isSyncable(name) && data.length <= 10 * 1024 * 1024 && (total += data.length) <= 300 * 1024 * 1024) media.set(name, data);
    }
  } else json = JSON.parse(new TextDecoder().decode(bytes));
  const env = json as { format?: unknown; profile?: unknown } | null;
  const raw = (env && (env.format === BOARD_FORMAT || OLD_BOARD_FORMATS.includes(env.format as string)) ? env.profile : json) as { boards?: { core?: unknown } } | null;
  if (!raw || typeof raw !== 'object' || !raw.boards?.core) throw new Error('not a board');
  const profile = migrate(raw as unknown as Partial<Profile>);
  // Only the files the board uses.
  const used = new Set(mediaNamesIn(profile));
  for (const n of [...media.keys()]) if (!used.has(n)) media.delete(n);
  return { profile, media };
}

/**
 * A board received from someone else: no caregiver code (the family chooses its own), no links to
 * apps or sites, no help contact, no demonstrations, no bin, none of the other family's choices
 * about follow-up and sharing, no guide progress.
 */
export function asReceived(profile: Profile): Profile {
  const p = JSON.parse(JSON.stringify(profile)) as Profile;
  const s = p.settings as unknown as Record<string, unknown>;
  // (the value that means "not chosen yet": src/lib/caregiverCode.ts)
  s.pin = DEFAULT_SETTINGS.pin;
  s.dataCollection = DEFAULT_SETTINGS.dataCollection;
  s.shareStats = DEFAULT_SETTINGS.shareStats;
  delete s.shareTerms;
  for (const o of Object.values(plain(p.overrides))) if (o && typeof o === 'object') delete (o as { app?: unknown }).app;
  for (const c of Object.values(plain(p.customConcepts))) if (c && typeof c === 'object') delete (c as { app?: unknown }).app;
  p.help = { ...p.help, emergencyContact: '' };
  p.demos = [];
  delete p.bin;
  delete p.guide;
  delete p.lastTla;
  return migrate(p);
}

/** The photos and recordings of a file go into this device's store (under the names the board uses). */
export async function keepFilesOf(read: ReadBoard): Promise<void> {
  for (const [name, bytes] of read.media) await saveMediaNamed(name, bytes).catch(() => {});
}
