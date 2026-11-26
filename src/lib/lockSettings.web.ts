/**
 * "Lock the screen" in a browser: a web page (even one added to the home screen) can neither keep
 * a child inside nor open the device's settings. The panel only says where to go.
 */
export const opensDeviceSettings = false;

export async function openLockSettings(): Promise<boolean> {
  return false;
}
