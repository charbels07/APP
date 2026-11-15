/**
 * Gets the sound of a phrase said by the children's voice (see childVoice.ts): from the device
 * when it was already said, otherwise from the app's server function "caa-voice".
 * Only the text to say, its language and "girl / boy" are sent — never the child's name.
 * Whenever the sound cannot be had quickly, the answer is "none" and the tablet's voice speaks:
 * a child is never left without a voice, and no error sentence is shown.
 */
import { backend } from '../backend';
import type { Lang, Settings } from '../model/types';
import { childVoiceKind, sayable, soundKey } from './childVoice';
import { base64ToBytes } from './pictoLibrary';
import { keepSaid, saidUri } from './saidCache';

/** How long a child waits for a phrase never said before, then the tablet's voice says it. */
const WAIT_MS = 3500;
/** After a failure the server is left alone for a while: offline, every word would wait otherwise. */
let pausedUntil = 0;
const asking = new Map<string, Promise<string | undefined>>();

export async function childVoiceAvailable(): Promise<boolean> {
  const api = backend();
  if (!api.sayAsChild) return false;
  return api.childVoiceReady ? api.childVoiceReady() : true;
}

export async function childVoiceUri(text: string, lang: Lang, settings: Settings): Promise<string | undefined> {
  const kind = childVoiceKind(settings, lang);
  const say = kind && sayable(text);
  if (!kind || !say || (lang !== 'fr' && lang !== 'en')) return undefined;
  const key = soundKey(lang, kind, say);
  const kept = await saidUri(key).catch(() => undefined);
  if (kept) return kept;
  const api = backend();
  if (!api.sayAsChild || Date.now() < pausedUntil) return undefined;
  let ask = asking.get(key);
  if (!ask) {
    ask = api
      .sayAsChild({ text: say, lang, kind })
      .then((b64) => {
        const bytes = base64ToBytes(b64);
        if (!bytes.length) throw new Error('empty');
        return keepSaid(key, bytes);
      })
      .catch((e: unknown) => {
        // Today's limit reached: quiet until much later. Anything else (no connection…): a minute.
        pausedUntil = Date.now() + (/limit|busy|forbidden/.test(String((e as Error)?.message)) ? 15 : 1) * 60 * 1000;
        return undefined;
      })
      .finally(() => asking.delete(key));
    asking.set(key, ask);
  }
  // Too slow: the tablet's voice says it now; the sound still arrives and is kept for next time.
  return Promise.race([ask, new Promise<undefined>((r) => setTimeout(() => r(undefined), WAIT_MS))]);
}
