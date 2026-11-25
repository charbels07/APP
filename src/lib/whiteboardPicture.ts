/**
 * Where a picture for the whiteboard comes from: the device's pictures, the camera, a picture copied
 * (from a web page, another app…), or the address of a picture on the web. The picture is only shown
 * on this device while the app is open: it is not copied into the child's files, saved or sent.
 */
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'react-native';
import { outside } from './outside';

export interface BoardPicture {
  uri: string;
  width: number;
  height: number;
}

export async function pickBoardPicture(source: 'library' | 'camera'): Promise<BoardPicture | null> {
  try {
    if (source === 'camera') {
      const perm = await outside(() => ImagePicker.requestCameraPermissionsAsync());
      if (!perm.granted) return null;
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.8 };
    const res = await outside(() => (source === 'camera' ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options)));
    if (res.canceled || !res.assets?.length) return null;
    const a = res.assets[0];
    return { uri: a.uri, width: a.width || 0, height: a.height || 0 };
  } catch {
    return null;
  }
}

/** The picture last copied (on a web page: touch and hold, or right-click, then "Copy image"). */
export async function pastedPicture(): Promise<BoardPicture | null> {
  try {
    const img = await Clipboard.getImageAsync({ format: 'png' });
    if (!img?.data) return null;
    return { uri: img.data, width: img.size?.width ?? 0, height: img.size?.height ?? 0 };
  } catch {
    return null;
  }
}

/** A web address that can be shown as a picture: https only, no spaces, not too long. */
export function webPictureLink(text: string): string | undefined {
  const t = text.trim();
  return /^https:\/\/[^\s"'<>]+$/i.test(t) && t.length <= 2048 ? t : undefined;
}

/** The picture's own size, or null when nothing can be shown from that address (8 s at most). */
export function pictureSize(uri: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 8000);
    try {
      Image.getSize(
        uri,
        (width, height) => {
          clearTimeout(timer);
          resolve(width > 0 && height > 0 ? { width, height } : null);
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
      );
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}
