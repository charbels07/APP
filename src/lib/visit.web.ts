/**
 * "This visit" in a browser: one tab, until it is closed (reloading the page stays in the same
 * visit). The browser's own sessionStorage does exactly that; when it is not available (private
 * mode, a locked-down page) the visit lives in memory, so it ends at the next reload.
 */
const KEY = 'caa.visit.v1';
const memory = new Map<string, string>();

const tab = (): Storage | null => {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
};
const read = (key: string): string | null => {
  try {
    return tab()?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
};
const write = (key: string, value: string): void => {
  memory.set(key, value);
  try {
    tab()?.setItem(key, value);
  } catch {
    /* kept in memory */
  }
};

/** Has someone already signed in (or been recognised) during this visit? */
export const sameVisit = (): boolean => read(KEY) === '1';
export const markVisit = (): void => write(KEY, '1');

/** A store that is emptied when the visit ends. */
export const visitStore = {
  get: read,
  set: write,
  remove: (key: string): void => {
    memory.delete(key);
    try {
      tab()?.removeItem(key);
    } catch {
      /* nothing to remove */
    }
  },
};
