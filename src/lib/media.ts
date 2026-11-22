/**
 * Media store (native): personal photos and voice recordings are stored locally
 * in the app's document directory; a copy travels through the account to the child's other
 * devices (`src/state/mediaSync.ts`) under the same name.
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

/** Stores a file under the name a board uses (a board file imported with its photos); kept if already here. */
export async function saveMediaNamed(name: string, bytes: Uint8Array): Promise<void> {
  const file = new File(dir(), name);
  if (file.exists) return;
  file.create();
  await file.write(bytes);
}

/** True when this device has the file. */
export async function hasMedia(name: string): Promise<boolean> {
  return new File(dir(), name).exists;
}

/** The file as it is (sent to the account): bytes here, a Blob in a browser; undefined when it is not here. */
export async function mediaContent(name: string): Promise<Uint8Array | Blob | undefined> {
  const f = new File(dir(), name);
  return f.exists ? f.bytes() : undefined;
}

/**
 * Stores a file received from the account under the name the profile uses. Downloaded aside
 * first, then moved into place: a download cut short never leaves half a file in the store.
 */
export async function saveMediaFrom(url: string, name: string): Promise<void> {
  const dest = new File(dir(), name);
  if (dest.exists) return;
  const aside = () => new File(Paths.cache, `incoming-${name}`);
  const tmp = aside();
  if (tmp.exists) tmp.delete();
  let moved = false;
  try {
    await File.downloadFileAsync(url, tmp, { idempotent: true });
    if (!tmp.size) throw new Error('empty');
    if (!dest.exists) {
      // (after a move, `tmp` names the file in its new place)
      await tmp.move(dest);
      moved = true;
    }
  } finally {
    const left = aside();
    if (!moved && left.exists) left.delete();
  }
}
