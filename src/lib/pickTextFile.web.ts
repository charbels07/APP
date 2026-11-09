/** Lets the person choose a text file (a profile export) and reads it (browser version). */
import * as DocumentPicker from 'expo-document-picker';

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const text = a.file ? await a.file.text() : await (await fetch(a.uri)).text();
  return { name: a.name, text };
}
