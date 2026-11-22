/**
 * Offline pictogram library bundled with the app (about 24,000 pictograms from open libraries
 * that are free for commercial use: Mulberry, OpenMoji, Fluent, Noto, Twemoji, Health Icons,
 * Material Symbols, Phosphor, Lucide, Tabler — see docs/PICTOGRAM-LICENSES.md).
 * Used to find a picture when the family creates a word or an activity board, with or without internet.
 */
import { PICTO_LIBRARIES } from '../data/pictoLibraries';
import { PICTO_INDEX, PICTO_PACKS } from '../data/pictoLibrary';
import type { SymbolRef } from '../model/types';
import { saveMediaBytes } from './media';
import { prepareIndex, type PreparedIndex } from './pictoSearch';
import { bytesToImageUri, readAssetText } from './platform';

let library: Promise<PreparedIndex> | null = null;

export function loadPictoLibrary(): Promise<PreparedIndex> {
  if (!PICTO_PACKS.length) return Promise.reject(new Error('library not built'));
  library ??= readAssetText(PICTO_INDEX)
    .then((text) => prepareIndex(JSON.parse(text)))
    .catch((e) => {
      library = null;
      throw e;
    });
  return library;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Uint8Array(128);
for (let i = 0; i < B64.length; i++) LOOKUP[B64.charCodeAt(i)] = i;

/** Base64 → bytes (packs are stored as base64 text so every host serves them). */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let o = 0;
  for (let i = 0; i < clean.length; i += 4) {
    const n =
      (LOOKUP[clean.charCodeAt(i)] << 18) |
      (LOOKUP[clean.charCodeAt(i + 1)] << 12) |
      ((LOOKUP[clean.charCodeAt(i + 2)] ?? 0) << 6) |
      (LOOKUP[clean.charCodeAt(i + 3)] ?? 0);
    out[o++] = (n >> 16) & 255;
    if (i + 2 < clean.length) out[o++] = (n >> 8) & 255;
    if (i + 3 < clean.length) out[o++] = n & 255;
  }
  return out.subarray(0, o);
}

const packs = new Map<number, Promise<Uint8Array>>();
function pack(n: number): Promise<Uint8Array> {
  let p = packs.get(n);
  if (!p) {
    p = readAssetText(PICTO_PACKS[n]).then(base64ToBytes);
    p.catch(() => packs.delete(n));
    packs.set(n, p);
    // Keep memory bounded: forget the oldest packs.
    if (packs.size > 16) packs.delete(packs.keys().next().value!);
  }
  return p;
}

async function bytesOf(id: number): Promise<Uint8Array | undefined> {
  const lib = await loadPictoLibrary();
  const it = lib.byId.get(id);
  if (!it) return undefined;
  const buf = await pack(it[1]);
  return buf.slice(it[2], it[2] + it[3]);
}

export async function pictoImageUri(id: number): Promise<string | undefined> {
  const bytes = await bytesOf(id);
  return bytes ? bytesToImageUri(bytes, `p${id}`) : undefined;
}

/** Same, by the pictogram's stable key (`library/name`). */
export async function pictoImageUriByKey(key: string): Promise<string | undefined> {
  const lib = await loadPictoLibrary();
  const id = lib.byKey.get(key);
  return id === undefined ? undefined : pictoImageUri(id);
}

/** The picture's bytes (WebP), by the pictogram's stable key; undefined when the library has none. */
export async function pictoBytesByKey(key: string): Promise<Uint8Array | undefined> {
  const lib = await loadPictoLibrary();
  const id = lib.byKey.get(key);
  return id === undefined ? undefined : bytesOf(id);
}

/**
 * A library pictogram chosen for a word, as the word keeps it: its stable key (`library/name`),
 * never a copy in the media store (a copy is a file of this device only, which then has to travel
 * through the account; the key is the same picture on every device, offline). Falls back to a
 * copy only for an entry of the library that has no key (none today).
 */
export async function pictoRef(id: number): Promise<SymbolRef | undefined> {
  const lib = await loadPictoLibrary();
  const key = lib.byId.get(id)?.[10];
  if (key) return { kind: 'picto', key };
  const bytes = await bytesOf(id);
  return bytes ? { kind: 'media', name: await saveMediaBytes(bytes, 'webp') } : undefined;
}

const B64_OUT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
/** Bytes → base64 (pure, every platform). */
export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64_OUT[(n >> 18) & 63] + B64_OUT[(n >> 12) & 63] + (i + 1 < bytes.length ? B64_OUT[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? B64_OUT[n & 63] : '=');
  }
  return out;
}

/** A library pictogram as a `data:` address (printing on a tablet cannot read the app's own files). */
export async function pictoDataUrlByKey(key: string): Promise<string | undefined> {
  const bytes = await pictoBytesByKey(key);
  return bytes ? `data:image/webp;base64,${bytesToBase64(bytes)}` : undefined;
}

/** Where a library pictogram comes from, kept with the word: "Mulberry Symbols — CC BY-SA 4.0". */
export async function pictoCredit(id: number): Promise<string | undefined> {
  const lib = await loadPictoLibrary();
  const info = PICTO_LIBRARIES.find((l) => l.id === lib.raw.libs?.[lib.byId.get(id)?.[9] ?? -1]);
  return info ? `${info.name} — ${info.license.split(' (')[0]}` : undefined;
}

export async function pictoLabels(id: number): Promise<{ fr?: string; en?: string; ar?: string }> {
  const lib = await loadPictoLibrary();
  const it = lib.byId.get(id);
  return { fr: it?.[4][0], en: it?.[5][0], ar: it?.[6][0] };
}
