/** Lets the person choose a text file (a profile export) and reads it (browser version). */
import * as DocumentPicker from 'expo-document-picker';
import { outside } from './outside';

export async function pickTextFile(): Promise<{ name: string; text: string } | null> {
  // On a phone or tablet the browser's file chooser can hide the page for a moment.
  const r = await outside(() => DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain'] }));
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const text = a.file ? await a.file.text() : await (await fetch(a.uri)).text();
  return { name: a.name, text };
}

/** Lets the person choose a board file (`.caa.zip`, or an older `.json`) and reads its bytes (browser version). */
export async function pickBoardFile(): Promise<{ name: string; bytes: Uint8Array } | null> {
  const r = await outside(() => DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/x-zip-compressed', 'application/json', '.zip', '.json'] }));
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const buf = a.file ? await a.file.arrayBuffer() : await (await fetch(a.uri)).arrayBuffer();
  return { name: a.name, bytes: new Uint8Array(buf) };
}
