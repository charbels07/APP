/**
 * "This device is full": a write on the device failed (the board's copy, the follow-up kept here,
 * the counters, a photo or a recording). The changes still go to the account when the connection
 * allows, but what is not written here can be lost if the app closes: the board says it in one
 * line (`DeviceFullNotice`) until a write of the same kind succeeds again. Pure state, no screen.
 */
export type StoreKind = 'board' | 'usage' | 'counters' | 'media' | 'files';

const failing = new Set<StoreKind>();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

/** A write failed. `e` is only looked at to tell a full storage from anything else (both are said). */
export function storageFailed(kind: StoreKind, _e?: unknown): void {
  if (failing.has(kind)) return;
  failing.add(kind);
  emit();
}

/** A write of this kind worked again. */
export function storageWritten(kind: StoreKind): void {
  if (!failing.delete(kind)) return;
  emit();
}

export const deviceFull = (): boolean => failing.size > 0;

export function onDeviceFull(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Writes, and says whether it worked (never throws). */
export async function written(kind: StoreKind, write: () => Promise<unknown>): Promise<boolean> {
  try {
    await write();
    storageWritten(kind);
    return true;
  } catch (e) {
    storageFailed(kind, e);
    return false;
  }
}
