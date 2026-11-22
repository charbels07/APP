/** Lets the person choose a text file (a profile export) and reads it. */
import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';
import { outside } from './outside';

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const r = await outside(() => DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true }));
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return { name: a.name, text: await new FsFile(a.uri).text() };
}

/** Lets the person choose a board file (`.caa.zip`, or an older `.json`) and reads its bytes. */
export async function pickBoardFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  const r = await outside(() => DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/json', '*/*'], copyToCacheDirectory: true }));
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return { name: a.name, bytes: await new FsFile(a.uri).bytes() };
}
