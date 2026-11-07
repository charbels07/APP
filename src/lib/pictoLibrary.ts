/**
 * Offline ARASAAC library (≈9,000 pictograms bundled with the app): used to find a
 * picture when the family creates a word or a TLA, with or without internet.
 */
import { PICTO_INDEX, PICTO_PACKS } from '../data/pictoLibrary';
import { saveMedia, saveMediaBytes } from './media';
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

/** ARASAAC's own server, for pictograms found online that aren't in the offline library. */
export const remotePictoUrl = (id: number) => `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;

export async function pictoImageUri(id: number): Promise<string | undefined> {
  const bytes = await bytesOf(id);
  return bytes ? bytesToImageUri(bytes, `p${id}`) : remotePictoUrl(id);
}

/** Copies a library pictogram into the media store so the word keeps it offline. */
export async function pictoToMedia(id: number): Promise<string | undefined> {
  const bytes = await bytesOf(id);
  if (bytes) return saveMediaBytes(bytes, 'webp');
  return saveMedia(remotePictoUrl(id), 'png');
}

export async function pictoLabels(id: number): Promise<{ fr?: string; en?: string; ar?: string }> {
  const lib = await loadPictoLibrary();
  const it = lib.byId.get(id);
  return { fr: it?.[4][0], en: it?.[5][0], ar: it?.[6][0] };
}
