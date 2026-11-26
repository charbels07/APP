/**
 * "Lock the screen" (the bar's Lock button): the app cannot keep a child inside by itself. Only
 * the device can: Guided Access on iPad / iPhone, app pinning on Android. The button opens the
 * device's settings, as close as the system allows to where that is turned on:
 *  - Android has no page of its own for app pinning: it lives under Security;
 *  - iOS only lets an app open its own page of Settings (the Accessibility pages are not
 *    reachable by a store app), so the steps say where to go from there.
 */
import { Linking, Platform } from 'react-native';

export const ANDROID_PINNING_PAGE = 'android.settings.SECURITY_SETTINGS';

/** True where a button can open the device's settings (the tablet apps, not a browser). */
export const opensDeviceSettings = true;

/** Opens the device's settings; false when the system refused. */
export async function openLockSettings(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent(ANDROID_PINNING_PAGE);
      return true;
    } catch {
      /* some makers hide that page: the app's own page of the settings instead */
    }
  }
  try {
    await Linking.openSettings();
    return true;
  } catch {
    return false;
  }
}
