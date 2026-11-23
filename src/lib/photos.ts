import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library/legacy';
import { Platform } from 'react-native';
import { saveMedia } from './media';
import { outside } from './outside';

/** What the device lets the app see of the person's pictures. */
export type LibraryAccess = 'all' | 'selected' | 'none' | 'notAsked' | 'chosenOnly';

/**
 * Access to the photo library. On a tablet or phone the system asks the person the first time
 * (selected pictures, all pictures, or none) and remembers; `ask` shows that question when it was
 * never answered. In a browser there is nothing to ask: a site only ever receives the picture
 * the person picks.
 */
export async function libraryAccess(ask = false): Promise<LibraryAccess> {
  if (Platform.OS === 'web') return 'chosenOnly';
  try {
    // The system's question covers the app for a moment (`outside`: caregiver mode stays open).
    const p = ask ? await outside(() => ImagePicker.requestMediaLibraryPermissionsAsync()) : await ImagePicker.getMediaLibraryPermissionsAsync();
    if (p.granted) return p.accessPrivileges === 'limited' ? 'selected' : 'all';
    return p.status === 'undetermined' ? 'notAsked' : 'none';
  } catch {
    return 'notAsked';
  }
}

/**
 * Lets the family add a personal photo (camera, library or file) to a word (spec §13). Photos are
 * resized, kept in the app and copied through the account; one taken with the camera is also
 * saved in the device's Photos.
 */
export async function pickPhoto(source: 'library' | 'camera'): Promise<string | undefined> {
  if (source === 'camera') {
    const perm = await outside(() => ImagePicker.requestCameraPermissionsAsync());
    if (!perm.granted) return undefined;
  } else if ((await libraryAccess(true)) === 'none') {
    // The person said no (now or earlier): nothing is opened. They can change it in the device's settings.
    return undefined;
  }
  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  };
  // The camera or the photo library is another screen (another app on Android): not "leaving the app".
  const res = await outside(() => (source === 'camera' ? ImagePicker.launchCameraAsync(options) : ImagePicker.launchImageLibraryAsync(options)));
  if (res.canceled || !res.assets?.length) return undefined;
  let uri = res.assets[0].uri;
  // A photo taken here also goes to the device's Photos (owner's decision, 23 November 2026): the family
  // finds it there to use it again for another word, whatever the board does with it later.
  if (source === 'camera') void keepInPhotos(uri);
  try {
    const ref = await ImageManipulator.manipulate(uri).resize({ width: 400 }).renderAsync();
    const out = await ref.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
    uri = out.uri;
  } catch {
    /* keep the original if resizing isn't available */
  }
  return saveMedia(uri, 'jpg');
}

/**
 * Saves a photo taken in the app to the device's Photos (add only: the app asks to add, never to
 * read more). Never blocks the word: refused or failing, the photo is still the word's. Not in a
 * browser (a site cannot write into the person's photos).
 */
async function keepInPhotos(uri: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // The system's question covers the app for a moment (`outside`: caregiver mode stays open).
    const p = await outside(() => MediaLibrary.requestPermissionsAsync(true, ['photo']));
    if (!p.granted) return;
    await MediaLibrary.saveToLibraryAsync(uri);
  } catch {
    /* the photo stays the word's all the same */
  }
}
