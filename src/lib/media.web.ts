/**
 * Media store (web build): IndexedDB, with an in-memory fallback when storage is blocked
 * (private mode, sandboxed previews). A copy travels through the account to the child's other
 * devices (`src/state/mediaSync.ts`) under the same name.
 */
import { storageFailed, storageWritten } from './deviceFull';

const DB_NAME = 'caa-media';
const STORE = 'files';
const memory = new Map<string, Blob>();
const urlCache = new Map<string, string>();

let opening: Promise<IDBDatabase | null> | null = null;

/** One connection for the whole visit (the copying of a child's files asks it many times). */
function openDb(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => {
        const db = req.result;
        // Another tab updates the store: this connection steps aside and the next call opens a new one.
        db.onversionchange = () => {
          db.close();
          opening = null;
        };
        db.onclose = () => {
          opening = null;
        };
        resolve(db);
      };
      req.onerror = () => {
        opening = null;
        resolve(null);
      };
    } catch {
      opening = null;
      resolve(null);
    }
  });
  return opening;
}

/** `keep`: also held in memory (what is shown now); a file received in the background is not. */
async function put(name: string, blob: Blob, keep = true): Promise<void> {
  if (keep) memory.set(name, blob);
  const db = await openDb();
  if (!db) {
    memory.set(name, blob);
    return;
  }
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, name);
      tx.oncomplete = () => {
        storageWritten('media');
        resolve();
      };
      // A browser whose storage is full aborts the write: said on the board ("this device is full").
      tx.onerror = () => resolve();
      tx.onabort = () => {
        storageFailed('media', tx.error);
        resolve();
      };
    } catch {
      resolve();
    }
  });
}

async function get(name: string, keep = true): Promise<Blob | undefined> {
  if (memory.has(name)) return memory.get(name);
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(name);
      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob && keep) memory.set(name, blob);
        resolve(blob);
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

/** Erases every photo and recording kept in this browser (account deleted, or asked at sign-out). */
export async function clearMedia(): Promise<void> {
  memory.clear();
  for (const u of urlCache.values()) URL.revokeObjectURL(u);
  urlCache.clear();
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** `tag`: a note kept in the name (a recording's start and stop moments: `trimSilence.ts`). */
export function newMediaName(ext: string, tag?: string): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${tag ? `.${tag}` : ''}.${ext}`;
}

export async function saveMedia(sourceUri: string, ext: string, tag?: string): Promise<string> {
  const name = newMediaName(ext, tag);
  const blob = await (await fetch(sourceUri)).blob();
  await put(name, blob);
  return name;
}

export async function mediaUri(name: string): Promise<string | undefined> {
  if (urlCache.has(name)) return urlCache.get(name);
  const blob = await get(name);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urlCache.set(name, url);
  return url;
}

export async function mediaDataUrl(name: string): Promise<string | undefined> {
  const blob = await get(name);
  if (!blob) return undefined;
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(blob);
  });
}

export async function deleteMedia(name: string): Promise<void> {
  memory.delete(name);
  const url = urlCache.get(name);
  if (url) URL.revokeObjectURL(url);
  urlCache.delete(name);
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).delete(name);
  } catch {
    /* ignore */
  }
}

export async function saveMediaBytes(bytes: Uint8Array, ext: string): Promise<string> {
  const name = newMediaName(ext);
  const type =
    ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : ext === 'jpg' ? 'image/jpeg' : ext === 'wav' ? 'audio/wav' : 'application/octet-stream';
  await put(name, new Blob([bytes as Uint8Array<ArrayBuffer>], { type }));
  return name;
}

/** Stores a file under the name a board uses (a board file imported with its photos); kept if already here. */
export async function saveMediaNamed(name: string, bytes: Uint8Array): Promise<void> {
  if (await hasMedia(name)) return;
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  const type = TYPES[ext] ?? 'application/octet-stream';
  await put(name, new Blob([bytes as Uint8Array<ArrayBuffer>], { type }), false);
}

const TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  mp4: 'audio/mp4',
  wav: 'audio/wav',
  webm: 'audio/webm',
  mp3: 'audio/mpeg',
};

/** True when this browser has the file (without reading it). */
export async function hasMedia(name: string): Promise<boolean> {
  if (memory.has(name)) return true;
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).count(name);
      req.onsuccess = () => resolve(req.result > 0);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** The file as it is (sent to the account), without keeping it in memory. */
export async function mediaContent(name: string): Promise<Uint8Array | Blob | undefined> {
  return get(name, false);
}

/** Stores a file received from the account under the name the profile uses. */
export async function saveMediaFrom(url: string, name: string): Promise<void> {
  if (await hasMedia(name)) return;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  const blob = await res.blob();
  if (!blob.size) throw new Error('empty');
  await put(name, blob, false);
}
