/**
 * Photos and recordings that just arrived from the account (`src/state/mediaSync.ts`): a picture
 * drawn as an empty square while its file was missing draws itself again.
 */
const listeners = new Set<(name: string) => void>();

export function onMediaArrived(fn: (name: string) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function mediaArrived(name: string): void {
  for (const fn of [...listeners]) {
    try {
      fn(name);
    } catch {
      /* one screen's trouble never stops the others */
    }
  }
}
