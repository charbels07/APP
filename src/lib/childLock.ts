/**
 * Child lock, device side (iPad / Android). The app cannot block the Home gesture by itself:
 * iPadOS reserves that for Guided Access, Android for screen pinning (explained in Settings).
 * What the app does: the Android back button is ignored while locked.
 */
import { BackHandler } from 'react-native';

export function enterFullscreen(): void {}
export function exitFullscreen(): void {}

/** Stops the back button from leaving the app; returns the function that undoes it. */
export function guardLeaving(): () => void {
  const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
  return () => sub.remove();
}
