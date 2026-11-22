/**
 * Recorded words: find where the voice starts and where it stops, so that the silence before and
 * after is left out (the word is then said at once, and words follow each other in a sentence).
 *
 * Two ways to use it, one per platform:
 *  - in a browser the recording is opened as sound, cut, and saved again (`trimmedWav`);
 *  - in the tablet app a recording cannot be opened as sound: the loudness measured while
 *    recording gives the two moments (`levelSpan`), kept in the file's name (`spanTag`,
 *    `spanOfName`) and followed when the word is played.
 * Nothing here touches a file or the microphone: only numbers, so it can be tested.
 */

/** A piece of a recording, in seconds from its beginning. */
export type Span = { from: number; to: number };

/** Loudness is looked at 10 ms at a time. */
const WINDOW = 0.01;
/** Kept around the voice, so a soft first or last sound ("f", "s", "h") is not eaten. */
const KEEP_BEFORE = 0.06;
const KEEP_AFTER = 0.14;
/** Shorter than this is a click (the finger on the button), not a voice. */
const SHORTEST_SOUND = 0.03;
/** Quieter than this everywhere: nothing was said, the recording is left as it is. */
const QUIET = 0.008;

/**
 * Where the sound is, from loudness values (0 to 1, one every `step` seconds).
 * Null when nothing stands out: the recording is then kept whole.
 */
export function soundSpan(levels: ArrayLike<number>, step: number): Span | null {
  const n = levels.length;
  if (!n || !(step > 0)) return null;
  let peak = 0;
  for (let i = 0; i < n; i++) if (levels[i] > peak) peak = levels[i];
  if (peak < QUIET) return null;
  // The room's own noise: the quietest tenth of the recording.
  const sorted = Array.from(levels).sort((a, b) => a - b);
  const floor = sorted[Math.floor(n * 0.1)];
  // Voice = clearly above the room's noise, and not a tiny fraction of the loudest moment.
  const threshold = Math.max(peak * 0.06, Math.min(floor * 3, peak * 0.3));
  const run = Math.max(1, Math.round(SHORTEST_SOUND / step));
  let first = -1;
  let last = -1;
  let streak = 0;
  for (let i = 0; i < n; i++) {
    if (levels[i] >= threshold) {
      streak++;
      if (streak >= run) {
        if (first < 0) first = i - run + 1;
        last = i;
      }
    } else streak = 0;
  }
  if (first < 0) return null;
  return { from: Math.max(0, first * step - KEEP_BEFORE), to: Math.min(n * step, (last + 1) * step + KEEP_AFTER) };
}

/** Loudness (0 to 1) of each 10 ms of a sound. */
export function envelope(samples: Float32Array, rate: number): number[] {
  const size = Math.max(1, Math.round(rate * WINDOW));
  const out: number[] = [];
  for (let at = 0; at < samples.length; at += size) {
    const end = Math.min(samples.length, at + size);
    let sum = 0;
    for (let i = at; i < end; i++) sum += samples[i] * samples[i];
    out.push(Math.sqrt(sum / (end - at)));
  }
  return out;
}

/** Several channels (stereo microphone) into one. */
export function toMono(channels: Float32Array[]): Float32Array {
  if (channels.length === 1) return channels[0];
  const out = new Float32Array(channels[0]?.length ?? 0);
  for (const ch of channels) for (let i = 0; i < out.length; i++) out[i] += ch[i] / channels.length;
  return out;
}

/**
 * The sound without the silence at both ends (a very short fade at each cut, so it does not
 * click). Null when there is nothing to cut out: the caller keeps the original recording.
 */
export function trimSamples(samples: Float32Array, rate: number): Float32Array | null {
  const size = Math.max(1, Math.round(rate * WINDOW));
  const span = soundSpan(envelope(samples, rate), size / rate);
  if (!span) return null;
  const from = Math.max(0, Math.floor(span.from * rate));
  const to = Math.min(samples.length, Math.ceil(span.to * rate));
  // Less than a twentieth of a second to gain: not worth touching the recording.
  if (samples.length - (to - from) < rate * 0.05) return null;
  const out = samples.slice(from, to);
  const fade = Math.min(Math.round(rate * 0.005), out.length >> 1);
  for (let i = 0; i < fade; i++) {
    out[i] *= i / fade;
    out[out.length - 1 - i] *= i / fade;
  }
  return out;
}

/** A voice does not need more than 24 000 values a second: half the place on the device. */
export function lighter(samples: Float32Array, rate: number): { samples: Float32Array; rate: number } {
  if (rate < 44100) return { samples, rate };
  const out = new Float32Array(samples.length >> 1);
  for (let i = 0; i < out.length; i++) out[i] = (samples[2 * i] + samples[2 * i + 1]) / 2;
  return { samples: out, rate: rate / 2 };
}

/** A sound as a WAV file (one channel, 16 bits): every browser and tablet plays it. */
export function encodeWav(samples: Float32Array, rate: number): Uint8Array {
  const bytes = new Uint8Array(44 + samples.length * 2);
  const view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(at + i, s.charCodeAt(i));
  };
  text(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // plain sound, not compressed
  view.setUint16(22, 1, true); // one channel
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const v = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(v < 0 ? v * 0x8000 : v * 0x7fff), true);
  }
  return bytes;
}

/** Browser: the recording (its channels) cut and ready to save; null when there is nothing to cut. */
export function trimmedWav(channels: Float32Array[], rate: number): Uint8Array | null {
  const cut = trimSamples(toMono(channels), rate);
  if (!cut) return null;
  const light = lighter(cut, rate);
  return encodeWav(light.samples, light.rate);
}

/**
 * Browser: the recording ready to save, always as a WAV file — cut when there is silence around
 * the voice, whole otherwise. A browser records in its own format (WebM in Chrome), which an
 * iPad cannot play: a recording that travels through the account must play on every device.
 */
export function recordingWav(channels: Float32Array[], rate: number): Uint8Array | null {
  if (!channels.length || !channels[0].length) return null;
  const cut = trimmedWav(channels, rate);
  if (cut) return cut;
  const light = lighter(toMono(channels), rate);
  return encodeWav(light.samples, light.rate);
}

/** Loudness measured while recording: the moment (ms from the start) and the level (decibels, 0 = loudest). */
export type Level = { ms: number; db: number };

/** Tablet app: where the voice is, from the loudness measured while recording. */
export function levelSpan(levels: Level[], totalMs: number): Span | null {
  if (levels.length < 3 || !(totalMs > 0)) return null;
  const step = totalMs / 1000 / levels.length;
  const span = soundSpan(
    levels.map((l) => (Number.isFinite(l.db) ? Math.min(1, Math.pow(10, l.db / 20)) : 0)),
    step,
  );
  if (!span) return null;
  // A measure covers what came just before it, and the file can start a little after the
  // button: one more measure is kept on each side.
  const wide = { from: Math.max(0, span.from - step), to: Math.min(totalMs / 1000, span.to + step) };
  return totalMs / 1000 - (wide.to - wide.from) < 0.05 ? null : wide;
}

/** The two moments written in the file's name: `t120-980` (milliseconds). */
export function spanTag(span: Span): string {
  return `t${Math.round(span.from * 1000)}-${Math.round(span.to * 1000)}`;
}

/** The piece to play, read back from a recording's name (`1700000000_ab12cd.t120-980.m4a`). */
export function spanOfName(name: string): Span | undefined {
  const m = /\.t(\d+)-(\d+)\.[a-z0-9]+$/i.exec(name);
  if (!m) return undefined;
  const from = +m[1] / 1000;
  const to = +m[2] / 1000;
  return to > from ? { from, to } : undefined;
}
