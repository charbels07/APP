/**
 * A photo or a recording as it travels to the account (tablet and phone app).
 * A photo bigger than about 200 KB is made smaller first (longest side 1024 px, JPEG); the copy on
 * this device is not touched. A recording travels as it is (already cut: `recordingTrim.ts`; its
 * start and stop moments stay in its name).
 */
import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { mediaContent, mediaUri } from './media';
import { fitSide, mimeOf, PHOTO_TARGET } from './mediaPlan';

export interface UploadBody {
  body: ArrayBuffer | Blob;
  type: string;
}

const toBuffer = (b: Uint8Array): ArrayBuffer => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;

async function smallPhoto(uri: string): Promise<Uint8Array | undefined> {
  const image = await ImageManipulator.manipulate(uri).renderAsync();
  const size = fitSide(image.width, image.height);
  const ready = size.width === image.width ? image : await ImageManipulator.manipulate(uri).resize(size).renderAsync();
  const steps = [0.8, 0.65, 0.5, 0.4];
  for (const q of steps) {
    const out = await ready.saveAsync({ compress: q, format: SaveFormat.JPEG });
    const f = new File(out.uri);
    try {
      if (f.size <= PHOTO_TARGET.bytes || q === steps[steps.length - 1]) return await f.bytes();
    } finally {
      if (f.exists) f.delete();
    }
  }
  return undefined;
}

/** What is sent for this file, or undefined when it is not on this device (or not a photo or a recording). */
export async function uploadBody(name: string): Promise<UploadBody | undefined> {
  const type = mimeOf(name);
  if (!type) return undefined;
  const content = await mediaContent(name);
  if (!content) return undefined;
  const bytes = content instanceof Uint8Array ? content : new Uint8Array(await content.arrayBuffer());
  if (type === 'image/jpeg' && bytes.byteLength > PHOTO_TARGET.bytes) {
    try {
      const uri = await mediaUri(name);
      const small = uri ? await smallPhoto(uri) : undefined;
      if (small && small.byteLength < bytes.byteLength) return { body: toBuffer(small), type };
    } catch {
      /* this device cannot redraw it: sent as it is (the account still refuses more than 2 MB) */
    }
  }
  return { body: toBuffer(bytes), type };
}
