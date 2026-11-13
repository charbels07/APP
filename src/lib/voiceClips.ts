/** Loads a clip of a dialect voice pack as something the audio player can play. */
import { VOICE_ASSETS } from '../data/voicePackAssets';
import { VOICE_INDEX } from '../data/voicePackIndex';
import { base64ToBytes } from './pictoLibrary';
import { bytesToAudioUri, readAssetText } from './platform';

const packs = new Map<string, Promise<Uint8Array>>();

export async function clipUri(pack: string, text: string): Promise<string | undefined> {
  const at = VOICE_INDEX[pack]?.clips[text.trim()];
  const mod = VOICE_ASSETS[pack];
  if (!at || mod === undefined) return undefined;
  let bytes = packs.get(pack);
  if (!bytes) {
    bytes = readAssetText(mod).then(base64ToBytes);
    bytes.catch(() => packs.delete(pack));
    packs.set(pack, bytes);
  }
  try {
    const all = await bytes;
    return await bytesToAudioUri(all.slice(at[0], at[0] + at[1]), `${pack.replace('.', '-')}-${at[0]}`);
  } catch {
    return undefined;
  }
}
