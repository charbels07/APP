/**
 * The child's boards in the Open Board Format (OBF 0.1, openboardformat.org), the exchange format
 * several AAC apps import: a `.obz` file is a ZIP holding `manifest.json`, one `.obf` JSON file per
 * board and the pictures (and recordings) the boards use. With it a family is never locked in.
 *
 * Pure: `planObz` says which pictures and recordings are needed, the caller reads them (from the
 * app's library, the device's media store: `obzExport.ts`), and `buildObz` writes the files.
 *
 * What is exported:
 *  - the main board, every folder reached from it, the activity boards and their folders;
 *  - the stored places of the cards (the real grid, never the "no holes" display of levels 1–2);
 *    words above the board's level are kept in place, marked `hidden`;
 *  - the words in the board's language (the family's own labels, the chosen Arabic), with the
 *    child's other languages in `strings`;
 *  - a folder keeps its name as its label, opens its board (`load_board`) and is never said
 *    (no `vocalization`): a folder's name is not a word;
 *  - pictograms with their library's licence and author; the family's own photos marked private;
 *  - the family's recordings of a word in that language, as the button's sound.
 * Links to other apps (YouTube…) are not exported: links never travel with shared content.
 */
import { PICTO_LIBRARIES, type PictoLibraryInfo } from '../data/pictoLibraries';
import type { Board, Lang, Profile, SymbolRef } from '../model/types';
import { CLASS_COLORS, tint } from '../ui/theme';
import { coveredSlots } from './boardOps';
import { audioOf, display, isFolderName, label, symbolOf, wordClass } from './lexicon';
import { zipStore, type ZipEntry } from './zip';

export const OBF_FORMAT = 'open-board-0.1';

export interface ObfLicense {
  type: string;
  copyright_notice_url?: string;
  source_url?: string;
  author_name?: string;
  author_url?: string;
}

export interface ObfButton {
  id: string;
  label: string;
  vocalization?: string;
  image_id?: string;
  sound_id?: string;
  background_color?: string;
  border_color?: string;
  hidden?: boolean;
  load_board?: { id: string; path: string };
}

export interface ObfImage {
  id: string;
  path: string;
  content_type: string;
  license: ObfLicense;
}

export interface ObfSound {
  id: string;
  path: string;
  content_type: string;
  license: ObfLicense;
}

export interface ObfBoard {
  format: typeof OBF_FORMAT;
  id: string;
  locale: string;
  name: string;
  buttons: ObfButton[];
  grid: { rows: number; columns: number; order: (string | null)[][] };
  images: ObfImage[];
  sounds: ObfSound[];
  /** The child's other languages: the board's words → the same words in that language. */
  strings?: Record<string, Record<string, string>>;
  license: ObfLicense;
}

export interface ObzManifest {
  format: typeof OBF_FORMAT;
  root: string;
  paths: { boards: Record<string, string>; images: Record<string, string>; sounds: Record<string, string> };
}

/** A picture to read: a pictogram of the app's library, or a picture of the device's media store. */
export type ObzPicture = { kind: 'picto'; key: string } | { kind: 'media'; name: string };

export interface ObzPlan {
  /** The boards, the main board first. */
  boards: Board[];
  /** The pictures to read, by the key `buildObz` expects them under. */
  pictures: Map<string, ObzPicture>;
  /** The recordings to read (media names), by their key. */
  sounds: Map<string, string>;
}

export interface ObzData {
  bytes: Uint8Array;
  contentType: string;
}

/** What the caller could read (missing ones are simply left out: the button keeps its label). */
export interface ObzLoaded {
  pictures: Map<string, ObzData>;
  sounds: Map<string, ObzData>;
}

/**
 * An emoji's picture in OpenMoji (one of the app's libraries): the file named by its code points,
 * without the variation selector ("❤️" → openmoji/2764). The caller checks it exists.
 */
export function emojiPictoKey(emoji: string): string | undefined {
  const points = [...emoji].map((ch) => ch.codePointAt(0)!).filter((cp) => cp !== 0xfe0f);
  if (!points.length || points.every((cp) => cp < 0x2000)) return undefined;
  return `openmoji/${points.map((cp) => cp.toString(16).toUpperCase().padStart(4, '0')).join('-')}`;
}

/** The key of a word's picture in `ObzPlan.pictures`, and what to read; none for a word without a picture. */
function pictureOf(symbol: SymbolRef): { key: string; picture: ObzPicture } | undefined {
  if (symbol.kind === 'picto') return { key: `picto:${symbol.key}`, picture: { kind: 'picto', key: symbol.key } };
  if (symbol.kind === 'media') return { key: `media:${symbol.name}`, picture: { kind: 'media', name: symbol.name } };
  const key = emojiPictoKey(symbol.value);
  return key ? { key: `picto:${key}`, picture: { kind: 'picto', key } } : undefined;
}

/** The boards exported: the main board and what it opens, then the activity boards and what they open. */
function boardsToExport(profile: Profile): Board[] {
  const out: Board[] = [];
  const seen = new Set<string>();
  for (const start of ['core', ...profile.tlaOrder]) {
    // Each board, then the folders it opens in the order they appear on it (the child's way through).
    const queue = [start];
    while (queue.length) {
      const id = queue.shift()!;
      const b = profile.boards[id];
      if (!b || seen.has(id)) continue;
      seen.add(id);
      // Folders name their board by its key in the profile.
      out.push(b.id === id ? b : { ...b, id });
      for (const cell of b.cells) if (cell?.folder && !seen.has(cell.folder)) queue.push(cell.folder);
    }
  }
  return out;
}

/** The cards of a board that are drawn (a slot covered by a spread card is empty). */
function cardsOf(board: Board) {
  const covered = coveredSlots(board);
  return board.cells
    .slice(0, board.rows * board.cols)
    .map((cell, index) => ({ cell, index }))
    .filter((x): x is { cell: NonNullable<typeof x.cell>; index: number } => !!x.cell && !covered.has(x.index));
}

/** Which pictures and recordings the export needs. */
export function planObz(profile: Profile, lang: Lang = profile.settings.lang): ObzPlan {
  const boards = boardsToExport(profile);
  const pictures = new Map<string, ObzPicture>();
  const sounds = new Map<string, string>();
  for (const b of boards)
    for (const { cell } of cardsOf(b)) {
      if (display(profile, cell.concept) !== 'text') {
        const p = pictureOf(symbolOf(profile, cell.concept));
        if (p) pictures.set(p.key, p.picture);
      }
      const audio = !cell.folder && !isFolderName(profile, cell.concept) ? audioOf(profile, cell.concept, lang) : undefined;
      if (audio) sounds.set(`media:${audio}`, audio);
    }
  return { boards, pictures, sounds };
}

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

/** File names inside the archive: letters, digits, "-" and "_" only, and never twice. */
function fileNames() {
  const used = new Set<string>();
  return (base: string, ext: string) => {
    const clean = base.replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'board';
    let name = `${clean}.${ext}`;
    for (let n = 2; used.has(name.toLowerCase()); n++) name = `${clean}_${n}.${ext}`;
    used.add(name.toLowerCase());
    return name;
  };
}

function libraryLicense(lib: PictoLibraryInfo): ObfLicense {
  return {
    type: lib.license,
    copyright_notice_url: lib.licenseUrl,
    source_url: lib.website,
    author_name: lib.author,
    author_url: lib.website,
  };
}

/**
 * Licence of a picture: its library's for a pictogram; for a picture of the media store, the
 * credit kept with the word ("Mulberry Symbols — CC BY-SA 4.0" for a pictogram copied there),
 * otherwise the family's own photo.
 */
function pictureLicense(picture: ObzPicture, credit: string | undefined): ObfLicense {
  if (picture.kind === 'picto') {
    const lib = PICTO_LIBRARIES.find((l) => l.id === picture.key.split('/')[0]);
    return lib ? libraryLicense(lib) : { type: 'private' };
  }
  if (credit) {
    const [who, licence] = credit.split(' — ').map((x) => x.trim());
    const lib = PICTO_LIBRARIES.find((l) => l.name === who);
    if (lib) return libraryLicense(lib);
    return { type: licence || 'unknown', author_name: who };
  }
  return { type: 'private' };
}

/** The OBF files of the child's boards (manifest, boards, pictures, recordings). */
export function buildObz(
  profile: Profile,
  loaded: ObzLoaded,
  { lang = profile.settings.lang, plan = planObz(profile, lang) }: { lang?: Lang; plan?: ObzPlan } = {},
): { manifest: ObzManifest; boards: ObfBoard[]; files: ZipEntry[] } {
  const name = fileNames();
  const files: ZipEntry[] = [];
  const manifest: ObzManifest = { format: OBF_FORMAT, root: '', paths: { boards: {}, images: {}, sounds: {} } };
  const otherLangs = (profile.settings.langs?.length ? profile.settings.langs : [lang]).filter((l) => l !== lang);

  // Board files first, so folders can point to them.
  const boardPath = new Map<string, string>();
  for (const b of plan.boards) {
    const path = `boards/${name(b.id, 'obf')}`;
    boardPath.set(b.id, path);
    manifest.paths.boards[b.id] = path;
  }
  manifest.root = boardPath.get('core') ?? boardPath.get(plan.boards[0]?.id ?? '') ?? '';

  // Pictures and recordings that could be read, each written once.
  const images = new Map<string, ObfImage>();
  const pictureCredit = new Map<string, string>();
  for (const o of Object.values(profile.overrides))
    if (o.symbol?.kind === 'media' && o.credit && !pictureCredit.has(o.symbol.name)) pictureCredit.set(o.symbol.name, o.credit);
  let n = 0;
  for (const [key, picture] of plan.pictures) {
    const data = loaded.pictures.get(key);
    if (!data) continue;
    const id = `img_${++n}`;
    const path = `images/${name(id, EXT[data.contentType] ?? 'bin')}`;
    images.set(key, {
      id,
      path,
      content_type: data.contentType,
      license: pictureLicense(picture, picture.kind === 'media' ? pictureCredit.get(picture.name) : undefined),
    });
    manifest.paths.images[id] = path;
    files.push({ name: path, data: data.bytes });
  }
  const sounds = new Map<string, ObfSound>();
  n = 0;
  for (const key of plan.sounds.keys()) {
    const data = loaded.sounds.get(key);
    if (!data) continue;
    const id = `snd_${++n}`;
    const path = `sounds/${name(id, EXT[data.contentType] ?? 'bin')}`;
    // A word recorded by the family: theirs.
    sounds.set(key, { id, path, content_type: data.contentType, license: { type: 'private' } });
    manifest.paths.sounds[id] = path;
    files.push({ name: path, data: data.bytes });
  }

  const level = profile.settings.revealLevel ?? 3;
  const boards: ObfBoard[] = plan.boards.map((b) => {
    const buttons: ObfButton[] = [];
    const usedImages = new Map<string, ObfImage>();
    const usedSounds = new Map<string, ObfSound>();
    const order: (string | null)[][] = Array.from({ length: b.rows }, () => new Array<string | null>(b.cols).fill(null));
    const strings: Record<string, Record<string, string>> = {};
    const translate = (text: string, id: string) => {
      for (const l of otherLangs) {
        const other = label(profile, id, l);
        if (other && other !== text) (strings[l] ??= {})[text] = other;
      }
    };
    for (const { cell, index } of cardsOf(b)) {
      const text = label(profile, cell.concept, lang);
      const button: ObfButton = { id: `btn_${index}`, label: text };
      // A folder (or a folder's name) is never said: it only opens its board.
      const folder = !!cell.folder || isFolderName(profile, cell.concept);
      if (!folder) button.vocalization = text;
      if (display(profile, cell.concept) !== 'text') {
        const p = pictureOf(symbolOf(profile, cell.concept));
        const img = p && images.get(p.key);
        if (img) {
          button.image_id = img.id;
          usedImages.set(img.id, img);
        }
      }
      const audio = !folder ? audioOf(profile, cell.concept, lang) : undefined;
      const snd = audio ? sounds.get(`media:${audio}`) : undefined;
      if (snd) {
        button.sound_id = snd.id;
        usedSounds.set(snd.id, snd);
      }
      const colors = CLASS_COLORS[cell.folder ? 'folder' : wordClass(profile, cell.concept)];
      button.background_color = rgb(cell.intensity === undefined ? colors.bg : tint(colors.border, cell.intensity));
      button.border_color = rgb(colors.border);
      // Above the board's level: in its place, not shown yet (as on the child's board).
      if ((cell.level ?? 1) > level) button.hidden = true;
      if (cell.folder && boardPath.has(cell.folder)) button.load_board = { id: cell.folder, path: boardPath.get(cell.folder)! };
      buttons.push(button);
      order[Math.floor(index / b.cols)][index % b.cols] = button.id;
      translate(text, cell.concept);
    }
    const title = label(profile, b.concept, lang);
    translate(title, b.concept);
    const board: ObfBoard = {
      format: OBF_FORMAT,
      id: b.id,
      locale: lang,
      name: title,
      buttons,
      grid: { rows: b.rows, columns: b.cols, order },
      images: [...usedImages.values()],
      sounds: [...usedSounds.values()],
      // The family's own arrangement of the words.
      license: { type: 'private' },
    };
    if (Object.keys(strings).length) board.strings = strings;
    return board;
  });
  boards.forEach((b, i) => files.push({ name: boardPath.get(plan.boards[i].id)!, data: JSON.stringify(b, null, 1) }));
  files.unshift({ name: 'manifest.json', data: JSON.stringify(manifest, null, 1) });
  return { manifest, boards, files };
}

/** The `.obz` file itself. */
export function obzBytes(profile: Profile, loaded: ObzLoaded, opts: { lang?: Lang; plan?: ObzPlan; when?: Date } = {}): Uint8Array {
  return zipStore(buildObz(profile, loaded, opts).files, opts.when);
}

/** "Lina" → "Lina.obz"; a name that has nothing usable → "boards.obz". */
export function obzFileName(childName: string | undefined): string {
  const clean = (childName ?? '').normalize('NFC').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').trim().slice(0, 40);
  return `${clean || 'boards'}.obz`;
}
