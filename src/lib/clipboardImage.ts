/**
 * "Paste picture": an image the family copied on any website or app (native).
 * Returns the media name, or undefined when the clipboard holds no image.
 */
import * as Clipboard from 'expo-clipboard';
import { saveMediaBytes } from './media';
import { base64ToBytes } from './pictoLibrary';

export async function pasteImageFromClipboard(): Promise<string | undefined> {
  if (!(await Clipboard.hasImageAsync())) return undefined;
  const img = await Clipboard.getImageAsync({ format: 'jpeg', jpegQuality: 0.85 });
  if (!img?.data) return undefined;
  return saveMediaBytes(base64ToBytes(img.data.replace(/^data:[^,]*,/, '')), 'jpg');
}

/** Keyboard paste (Ctrl/⌘+V) exists on the web only. */
export function onPastedImage(_cb: (mediaName: string) => void): () => void {
  return () => {};
}
