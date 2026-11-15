/**
 * Saving a recorded word without the silence around it (browser).
 * The recording is opened as sound, cut where the voice starts and stops, and saved again as a
 * small WAV file. If the browser cannot open it, the recording is kept as it was made.
 */
import { saveMedia, saveMediaBytes } from './media';
import { trimmedWav, type Level } from './trimSilence';

type Ctor = new () => AudioContext;

async function channelsOf(uri: string): Promise<{ channels: Float32Array[]; rate: number } | null> {
  const w = window as unknown as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  const Ctx = w.AudioContext ?? w.webkitAudioContext;
  if (!Ctx) return null;
  const bytes = await (await fetch(uri)).arrayBuffer();
  const ctx = new Ctx();
  try {
    // Older Safari only knows the form with two callbacks.
    const audio = await new Promise<AudioBuffer>((resolve, reject) => {
      const p = ctx.decodeAudioData(bytes, resolve, reject) as Promise<AudioBuffer> | undefined;
      p?.then(resolve, reject);
    });
    const channels: Float32Array[] = [];
    for (let c = 0; c < audio.numberOfChannels; c++) channels.push(audio.getChannelData(c));
    return { channels, rate: audio.sampleRate };
  } finally {
    void ctx.close().catch(() => {});
  }
}

export async function saveRecording(uri: string, _levels: Level[], _totalMs: number): Promise<string> {
  try {
    const sound = await channelsOf(uri);
    const wav = sound && trimmedWav(sound.channels, sound.rate);
    if (wav) return await saveMediaBytes(wav, 'wav');
  } catch {
    /* not readable as sound here: kept as recorded */
  }
  return saveMedia(uri, 'webm');
}
