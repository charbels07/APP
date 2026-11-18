/**
 * "The way to this feature was on screen", for the app's team (families who agreed only, like
 * every product figure): one call when a button, panel or tip appears, kept as a single yes per
 * day (`countSeen` in src/lib/product.ts). Never what is on the screen, only the feature's name.
 */
import { useEffect } from 'react';
import { countSeen, type Feature } from '../lib/product';

/**
 * Counts the features given (a `false` is skipped) when they appear, and again only if the list
 * changes or a new day starts while they stay on screen (a tablet can keep its board open for days).
 */
export function useSeen(...features: (Feature | false | null | undefined)[]): void {
  const list = features.filter((f): f is Feature => !!f).join(' ');
  const today = new Date().toDateString();
  useEffect(() => {
    if (list) for (const f of list.split(' ')) countSeen(f as Feature);
  }, [list, today]);
}

/** The same as an element, for a part that is only drawn while the feature's button is. */
export function Seen({ feature }: { feature: Feature }) {
  useSeen(feature);
  return null;
}
