/**
 * Native (iOS/Android) implementations of printing, PDF export, file export
 * and image helpers. The browser demo uses platform.web.ts instead.
 */
import { Asset } from 'expo-asset';
import { Directory, File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export const PAPER_POINTS = { A4: { w: 595, h: 842 }, A3: { w: 842, h: 1191 } };

/** iOS printing can't load local asset URLs, so images are inlined as base64. */
export async function bundledImageSrc(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  const file = new File(asset.localUri ?? asset.uri);
  return `data:image/png;base64,${await file.base64()}`;
}

export async function printDocument(html: string, landscape: boolean): Promise<void> {
  await Print.printAsync({ html, orientation: landscape ? Print.Orientation.landscape : Print.Orientation.portrait });
}

/** Generates the PDF locally (works in airplane mode, PRN-02) and opens the share sheet. */
export async function exportPdf(html: string, paper: 'A4' | 'A3', landscape: boolean): Promise<void> {
  const size = PAPER_POINTS[paper];
  const { uri } = await Print.printToFileAsync({
    html,
    width: landscape ? size.h : size.w,
    height: landscape ? size.w : size.h,
  });
  await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' });
}

export async function exportJson(filename: string, data: unknown): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  await file.write(JSON.stringify(data, null, 2));
  await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
}

/** A text file (CSV…) through the share sheet. CSV gets a byte-order mark so spreadsheets read accents and Arabic. */
export async function exportText(filename: string, text: string, mimeType: string): Promise<void> {
  const file = new File(Paths.cache, filename);
  if (file.exists) file.delete();
  file.create();
  await file.write(mimeType === 'text/csv' ? `\uFEFF${text}` : text);
  await Sharing.shareAsync(file.uri, { mimeType });
}

/** Reads a bundled asset (e.g. the pictogram library) as bytes or text. */
export async function readAssetBytes(mod: number): Promise<Uint8Array> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).bytes();
}

export async function readAssetText(mod: number): Promise<string> {
  const asset = Asset.fromModule(mod);
  await asset.downloadAsync();
  return new File(asset.localUri ?? asset.uri).text();
}

/** Writes a short audio clip (MP3) to the cache once and returns a playable URI. */
export async function bytesToAudioUri(bytes: Uint8Array, key: string): Promise<string> {
  const dir = new Directory(Paths.cache, 'voice');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const file = new File(dir, `${key}.mp3`);
  if (!file.exists) {
    file.create();
    await file.write(bytes);
  }
  return file.uri;
}

/** Writes image bytes to the cache once and returns a displayable URI. */
export async function bytesToImageUri(bytes: Uint8Array, key: string): Promise<string> {
  const dir = new Directory(Paths.cache, 'picto');
  if (!dir.exists) dir.create({ idempotent: true, intermediates: true });
  const file = new File(dir, `${key}.webp`);
  if (!file.exists) {
    file.create();
    await file.write(bytes);
  }
  return file.uri;
}
