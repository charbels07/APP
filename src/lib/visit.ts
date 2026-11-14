/**
 * "This visit": from the moment the app is opened until it is closed. Used when someone signs in
 * without "Keep me logged in": the session then lasts for the visit only.
 * On a phone or tablet a visit is one launch of the app, so its little store lives in memory.
 * (The browser version is in visit.web.ts.)
 */
let marked = false;
const memory = new Map<string, string>();

/** Has someone already signed in (or been recognised) during this visit? */
export const sameVisit = (): boolean => marked;
export const markVisit = (): void => {
  marked = true;
};

/** A store that is emptied when the visit ends. */
export const visitStore = {
  get: (key: string): string | null => memory.get(key) ?? null,
  set: (key: string, value: string): void => void memory.set(key, value),
  remove: (key: string): void => void memory.delete(key),
};
