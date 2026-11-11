/**
 * Photo → activity board: the parent takes or picks a photo (a menu, a game box, ingredients…).
 * It is made smaller (faster to send, enough to read a menu) and kept only in memory:
 * it is sent once to the AI helper, never saved with the child's board.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

export interface AiPhoto {
  /** For the preview on screen. */
  uri: string;
  /** JPEG, base64 without the "data:" prefix. */
  data: string;
  mediaType: 'image/jpeg';
}

const WIDTH = 1280;

export async function pickPhotoForAi(source: 'library' | 'camera'): Promise<AiPhoto | null> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.9 };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return null;
  const asset = res.assets[0];
  const ctx = ImageManipulator.manipulate(asset.uri);
  if ((asset.width ?? 0) > WIDTH) ctx.resize({ width: WIDTH });
  const ref = await ctx.renderAsync();
  const out = await ref.saveAsync({ compress: 0.7, format: SaveFormat.JPEG, base64: true });
  if (!out.base64) return null;
  return { uri: out.uri, data: out.base64, mediaType: 'image/jpeg' };
}
