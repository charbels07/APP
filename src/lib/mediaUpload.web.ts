/**
 * A photo or a recording as it travels to the account (browser).
 * A photo bigger than about 200 KB is redrawn smaller first on a canvas (longest side 1024 px,
 * JPEG); the copy in this browser is not touched. A recording travels as it is.
 */
import { mediaContent } from './media';
import { fitSide, mimeOf, PHOTO_TARGET } from './mediaPlan';

export interface UploadBody {
  body: ArrayBuffer | Blob;
  type: string;
}

async function smallPhoto(blob: Blob): Promise<Blob | undefined> {
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return undefined;
  const image = await createImageBitmap(blob);
  try {
    const size = fitSide(image.width, image.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    // A transparent picture gets a white background (JPEG has no transparency).
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size.width, size.height);
    ctx.drawImage(image, 0, 0, size.width, size.height);
    const steps = [0.8, 0.65, 0.5, 0.4];
    for (const q of steps) {
      const out = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', q));
      if (out && (out.size <= PHOTO_TARGET.bytes || q === steps[steps.length - 1])) return out;
    }
    return undefined;
  } finally {
    image.close();
  }
}

/** What is sent for this file, or undefined when it is not in this browser (or not a photo or a recording). */
export async function uploadBody(name: string): Promise<UploadBody | undefined> {
  const type = mimeOf(name);
  if (!type) return undefined;
  const content = await mediaContent(name);
  if (!content) return undefined;
  const blob = content instanceof Blob ? content : new Blob([content as Uint8Array<ArrayBuffer>], { type });
  if (type === 'image/jpeg' && blob.size > PHOTO_TARGET.bytes) {
    try {
      const small = await smallPhoto(blob);
      if (small && small.size < blob.size) return { body: small, type };
    } catch {
      /* this browser cannot redraw it: sent as it is (the account still refuses more than 2 MB) */
    }
  }
  return { body: blob, type };
}
