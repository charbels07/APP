/**
 * Native (iOS/Android) implementations of printing, PDF export, file export
 * and image helpers. The browser demo uses platform.web.ts instead.
 */
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
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
