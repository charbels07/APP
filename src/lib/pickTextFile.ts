/** Lets the person choose a text file (a profile export) and reads it. */
import * as DocumentPicker from 'expo-document-picker';
import { File as FsFile } from 'expo-file-system';

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  return { name: a.name, text: await new FsFile(a.uri).text() };
}
