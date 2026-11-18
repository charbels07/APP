/**
 * "Export for another AAC app (.obz)": reads the pictures and recordings the boards use, then
 * shares (tablet) or downloads (browser) the file. The file itself is written by `obz.ts`.
 */
import { SYMBOL_IMAGES } from '../data/symbolMap';
import type { Profile } from '../model/types';
import { mediaDataUrl } from './media';
import { obzBytes, obzFileName, planObz, type ObzData } from './obz';
import { base64ToBytes, pictoBytesByKey } from './pictoLibrary';
import { exportBytes, readAssetBytes } from './platform';

const TYPES: Record<string, string> = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
};

/** The type of a picture or recording of the media store, from its name. */
export function mediaType(name: string): string {
  return TYPES[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
}

/** A file of this device's media store (a photo, a recording); undefined when it is not here. */
async function mediaBytes(name: string): Promise<ObzData | undefined> {
  const url = await mediaDataUrl(name).catch(() => undefined);
  const comma = url?.indexOf(',') ?? -1;
  if (!url || comma < 0) return undefined;
  return { bytes: base64ToBytes(url.slice(comma + 1)), contentType: mediaType(name) };
}

/** A pictogram: one of the built-in pictures shipped with the app, or from the offline library. */
async function pictoBytes(key: string): Promise<ObzData | undefined> {
  const bundled = SYMBOL_IMAGES[key];
  const bytes = bundled !== undefined ? await readAssetBytes(bundled) : await pictoBytesByKey(key);
  return bytes ? { bytes, contentType: 'image/webp' } : undefined;
}

/** Builds the child's `.obz` and hands it to the share sheet / the browser's downloads. */
export async function exportObz(profile: Profile, childName: string | undefined): Promise<void> {
  const plan = planObz(profile);
  const pictures = new Map<string, ObzData>();
  const sounds = new Map<string, ObzData>();
  for (const [key, p] of plan.pictures) {
    // A picture that cannot be read (a photo made on another device…) leaves the word with its label.
    const data = await (p.kind === 'picto' ? pictoBytes(p.key) : mediaBytes(p.name)).catch(() => undefined);
    if (data) pictures.set(key, data);
  }
  for (const [key, name] of plan.sounds) {
    const data = await mediaBytes(name);
    if (data) sounds.set(key, data);
  }
  await exportBytes(obzFileName(childName), obzBytes(profile, { pictures, sounds }, { plan }), 'application/zip');
}
