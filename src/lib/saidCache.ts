/**
 * Where a tablet keeps the sounds of the children's voice (see childVoice.ts): one small MP3 per
 * phrase, in the app's cache. They are a child's words: `forgetEverything` erases them.
 */
import { Directory, File, Paths } from 'expo-file-system';

const dir = () => new Directory(Paths.cache, 'said');

export async function saidUri(key: string): Promise<string | undefined> {
  const file = new File(dir(), `${key}.mp3`);
  return file.exists && (file.size ?? 0) > 0 ? file.uri : undefined;
}

export async function keepSaid(key: string, bytes: Uint8Array): Promise<string> {
  const d = dir();
  if (!d.exists) d.create({ idempotent: true, intermediates: true });
  const file = new File(d, `${key}.mp3`);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);
  return file.uri;
}

export async function clearSaid(): Promise<void> {
  const d = dir();
  if (d.exists) d.delete();
}
