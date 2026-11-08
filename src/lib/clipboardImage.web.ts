/**
 * "Paste picture" in the browser: the Paste button reads the clipboard when the
 * browser allows it; Ctrl/⌘+V always works (the page listens while the picker is open).
 * Neither needs the page to reach the internet.
 */
import { saveMediaBytes } from './media';

async function store(blob: Blob): Promise<string> {
  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  return saveMediaBytes(new Uint8Array(await blob.arrayBuffer()), ext);
}

export async function pasteImageFromClipboard(): Promise<string | undefined> {
  const clip = (navigator as Navigator & { clipboard?: { read?: () => Promise<ClipboardItem[]> } }).clipboard;
  if (!clip?.read) throw new Error('clipboard unavailable');
  for (const item of await clip.read()) {
    const type = item.types.find((t) => t.startsWith('image/'));
    if (type) return store(await item.getType(type));
  }
  return undefined;
}

export function onPastedImage(cb: (mediaName: string) => void): () => void {
  const handler = (e: ClipboardEvent) => {
    const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith('image/'));
    if (!file) return;
    e.preventDefault();
    store(file).then(cb).catch(() => {});
  };
  document.addEventListener('paste', handler);
  return () => document.removeEventListener('paste', handler);
}
