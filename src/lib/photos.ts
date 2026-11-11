import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { saveMedia } from './media';

/**
 * Lets the family add a personal photo (camera, library or file) to a word
 * (spec §13). Photos are resized and stored locally only.
 */
export async function pickPhoto(source: 'library' | 'camera'): Promise<string | undefined> {
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return undefined;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  };
  const res =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets?.length) return undefined;
  let uri = res.assets[0].uri;
  try {
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 400 }).renderAsync();
    const out = await ref.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
    uri = out.uri;
  } catch {
    /* keep the original if resizing isn't available */
  }
  return saveMedia(uri, 'jpg');
}
