/**
 * Media store (native): personal photos and voice recordings are stored locally
 * in the app's document directory (spec §34: photos stay on the device by default).
 * Profiles reference media by file *name*, never by absolute path, because the
 * iOS container path changes between app updates.
 */
import { Directory, File, Paths } from 'expo-file-system';

function dir(): Directory {
  const d = new Directory(Paths.document, 'media');
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  return d;
}

/** `tag`: a note kept in the name (a recording's start and stop moments: `trimSilence.ts`). */
export function newMediaName(ext: string, tag?: string): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${tag ? `.${tag}` : ''}.${ext}`;
}

/** Copies a temporary file (camera, picker, recorder) — or downloads a web picture — into the media store. */
export async function saveMedia(sourceUri: string, ext: string, tag?: string): Promise<string> {
  const name = newMediaName(ext, tag);
  const dest = new File(dir(), name);
  if (/^https?:/i.test(sourceUri)) await File.downloadFileAsync(sourceUri, dest);
  else await new File(sourceUri).copy(dest);
  return name;
}

export async function mediaUri(name: string): Promise<string | undefined> {
  const f = new File(dir(), name);
  return f.exists ? f.uri : undefined;
}

export async function mediaDataUrl(name: string): Promise<string | undefined> {
  const f = new File(dir(), name);
  if (!f.exists) return undefined;
  const ext = name.split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'm4a' ? 'audio/mp4' : ext === 'wav' ? 'audio/wav' : 'image/jpeg';
  return `data:${mime};base64,${await f.base64()}`;
}

export async function deleteMedia(name: string): Promise<void> {
  const f = new File(dir(), name);
  if (f.exists) f.delete();
}

/** Erases every photo and recording kept on this device (account deleted, or asked at sign-out). */
export async function clearMedia(): Promise<void> {
  const d = new Directory(Paths.document, 'media');
  if (d.exists) d.delete();
}

/** Stores raw bytes (e.g. a pictogram from the offline library) in the media store. */
export async function saveMediaBytes(bytes: Uint8Array, ext: string): Promise<string> {
  const name = newMediaName(ext);
  const file = new File(dir(), name);
  file.create();
  await file.write(bytes);
  return name;
}
