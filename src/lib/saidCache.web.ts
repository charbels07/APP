/**
 * Where a browser keeps the sounds of the children's voice (see childVoice.ts): the browser's
 * own store for files ("Cache Storage"), so a phrase already said works again without internet.
 * They are a child's words: `forgetEverything` erases them.
 */
const STORE = 'caa-said';
const urls = new Map<string, string>();
const address = (key: string) => `/__said/${key}.mp3`;

const store = async (): Promise<Cache | undefined> => {
  try {
    return typeof caches === 'undefined' ? undefined : await caches.open(STORE);
  } catch {
    return undefined; // private window, storage blocked: the sounds live for this visit only
  }
};
const asUrl = (key: string, blob: Blob): string => {
  const url = URL.createObjectURL(blob);
  urls.set(key, url);
  return url;
};

export async function saidUri(key: string): Promise<string | undefined> {
  const known = urls.get(key);
  if (known) return known;
  try {
    const hit = await (await store())?.match(address(key));
    if (!hit) return undefined;
    const blob = await hit.blob();
    return blob.size ? asUrl(key, blob) : undefined;
  } catch {
    return undefined;
  }
}

export async function keepSaid(key: string, bytes: Uint8Array): Promise<string> {
  const blob = new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'audio/mpeg' });
  try {
    await (await store())?.put(address(key), new Response(blob, { headers: { 'Content-Type': 'audio/mpeg' } }));
  } catch {
    /* no room or no permission: kept for this visit */
  }
  return asUrl(key, blob);
}

export async function clearSaid(): Promise<void> {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  try {
    if (typeof caches !== 'undefined') await caches.delete(STORE);
  } catch {
    /* nothing kept */
  }
}
