/**
 * Media store (web build, used for the browser demo): IndexedDB, with an
 * in-memory fallback when storage is blocked (private mode, sandboxed previews).
 */
const DB_NAME = 'caa-media';
const STORE = 'files';
const memory = new Map<string, Blob>();
const urlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function put(name: string, blob: Blob): Promise<void> {
  memory.set(name, blob);
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(blob, name);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function get(name: string): Promise<Blob | undefined> {
  if (memory.has(name)) return memory.get(name);
  const db = await openDb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    try {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(name);
      req.onsuccess = () => {
        const blob = req.result as Blob | undefined;
        if (blob) memory.set(name, blob);
        resolve(blob);
      };
      req.onerror = () => resolve(undefined);
    } catch {
      resolve(undefined);
    }
  });
}

export function newMediaName(ext: string): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
}

export async function saveMedia(sourceUri: string, ext: string): Promise<string> {
  const name = newMediaName(ext);
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
  const type = ext === 'webp' ? 'image/webp' : ext === 'png' ? 'image/png' : 'application/octet-stream';
  await put(name, new Blob([bytes as Uint8Array<ArrayBuffer>], { type }));
  return name;
}
