/** Browser implementations (used by the web demo). */
import { Asset } from 'expo-asset';

export const PAPER_POINTS = { A4: { w: 595, h: 842 }, A3: { w: 842, h: 1191 } };

export async function bundledImageSrc(mod: number): Promise<string> {
  const uri = Asset.fromModule(mod).uri;
  return new URL(uri, window.location.href).href;
}

/** Prints through a hidden iframe; the browser dialog also offers "Save as PDF". */
export async function printDocument(html: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
  document.body.appendChild(frame);
  await new Promise<void>((resolve) => {
    frame.onload = () => resolve();
    frame.srcdoc = html;
  });
  // Give images a moment to decode before opening the dialog.
  await new Promise((r) => setTimeout(r, 400));
  try {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
  } finally {
    setTimeout(() => frame.remove(), 60000);
  }
}

export async function exportPdf(html: string): Promise<void> {
  await printDocument(html);
}

export async function exportJson(filename: string, data: unknown): Promise<void> {
  await exportText(filename, JSON.stringify(data, null, 2), 'application/json');
}

/** Downloads a text file (CSV with a byte-order mark so spreadsheets read accents and Arabic). */
export async function exportText(filename: string, text: string, mimeType: string): Promise<void> {
  const blob = new Blob([mimeType === 'text/csv' ? `\uFEFF${text}` : text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function readAssetBytes(mod: number): Promise<Uint8Array> {
  const res = await fetch(Asset.fromModule(mod).uri);
  return new Uint8Array(await res.arrayBuffer());
}

export async function readAssetText(mod: number): Promise<string> {
  return (await fetch(Asset.fromModule(mod).uri)).text();
}

const audioUrls = new Map<string, string>();
export async function bytesToAudioUri(bytes: Uint8Array, key: string): Promise<string> {
  let url = audioUrls.get(key);
  if (!url) {
    url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'audio/mpeg' }));
    audioUrls.set(key, url);
  }
  return url;
}

const imageUrls = new Map<string, string>();
export async function bytesToImageUri(bytes: Uint8Array, key: string): Promise<string> {
  let url = imageUrls.get(key);
  if (!url) {
    url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'image/webp' }));
    imageUrls.set(key, url);
  }
  return url;
}
