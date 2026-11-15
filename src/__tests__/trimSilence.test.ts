import { encodeWav, envelope, levelSpan, lighter, soundSpan, spanOfName, spanTag, toMono, trimmedWav, trimSamples, type Level } from '../lib/trimSilence';
import { mediaNamesIn } from '../lib/deviceData';
import { safeFileName } from '../lib/safety';

const RATE = 48000;
/** A made-up recording: quiet room, then a "word" (a tone), then quiet room again. */
function recording(before: number, word: number, after: number, noise = 0.002, loud = 0.3): Float32Array {
  const out = new Float32Array(Math.round((before + word + after) * RATE));
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const inWord = t >= before && t < before + word;
    out[i] = rnd() * noise + (inWord ? Math.sin(2 * Math.PI * 220 * t) * loud : 0);
  }
  return out;
}

describe('recorded words: the silence before and after is left out', () => {
  it('finds where the voice starts and stops', () => {
    const s = recording(0.8, 0.6, 1.1);
    const span = soundSpan(envelope(s, RATE), 0.01)!;
    // A little is kept around the word, never the long silences.
    expect(span.from).toBeGreaterThan(0.7);
    expect(span.from).toBeLessThanOrEqual(0.8);
    expect(span.to).toBeGreaterThanOrEqual(1.4);
    expect(span.to).toBeLessThan(1.6);
  });

  it('cuts the sound itself (browser), keeping the whole word', () => {
    const s = recording(0.8, 0.6, 1.1);
    const cut = trimSamples(s, RATE)!;
    const seconds = cut.length / RATE;
    expect(seconds).toBeGreaterThanOrEqual(0.6);
    expect(seconds).toBeLessThan(0.85);
    // No click at the cuts: the sound starts and ends at zero.
    expect(Math.abs(cut[0])).toBeLessThan(0.001);
    expect(Math.abs(cut[cut.length - 1])).toBeLessThan(0.001);
    // The middle of the word is untouched.
    expect(Math.max(...cut.slice(cut.length >> 1, (cut.length >> 1) + 500).map(Math.abs))).toBeGreaterThan(0.25);
  });

  it('ignores a click (the finger on the button) before the word', () => {
    const s = recording(0.8, 0.6, 0.5);
    for (let i = Math.round(0.1 * RATE); i < Math.round(0.11 * RATE); i++) s[i] = 0.5; // 10 ms click
    const span = soundSpan(envelope(s, RATE), 0.01)!;
    expect(span.from).toBeGreaterThan(0.7);
  });

  it('works in a noisy room and with a soft voice', () => {
    const noisy = soundSpan(envelope(recording(0.7, 0.5, 0.9, 0.02, 0.25), RATE), 0.01)!;
    expect(noisy.from).toBeGreaterThan(0.6);
    expect(noisy.to).toBeLessThan(1.45);
    const soft = soundSpan(envelope(recording(0.7, 0.5, 0.9, 0.001, 0.03), RATE), 0.01)!;
    expect(soft.from).toBeGreaterThan(0.6);
    expect(soft.to).toBeLessThan(1.45);
  });

  it('leaves a recording alone when nothing was said, or when there is nothing to cut', () => {
    expect(trimSamples(recording(0, 0, 1.5), RATE)).toBeNull();
    expect(trimSamples(recording(0.02, 0.8, 0.02), RATE)).toBeNull();
    expect(soundSpan([], 0.01)).toBeNull();
  });

  it('keeps a word said in two parts whole (a pause inside is not a cut)', () => {
    const a = recording(0.5, 0.3, 0.4);
    const b = recording(0, 0.3, 0.6);
    const s = new Float32Array(a.length + b.length);
    s.set(a);
    s.set(b, a.length);
    const cut = trimSamples(s, RATE)!;
    // 0.3 + 0.4 of pause + 0.3, plus what is kept around.
    expect(cut.length / RATE).toBeGreaterThanOrEqual(1.0);
    expect(cut.length / RATE).toBeLessThan(1.25);
  });

  it('writes a WAV file every browser reads, lighter than what was recorded', () => {
    const wav = trimmedWav([recording(0.8, 0.6, 1.1), recording(0.8, 0.6, 1.1)], RATE)!;
    const view = new DataView(wav.buffer);
    const text = (at: number) => String.fromCharCode(...wav.slice(at, at + 4));
    expect(text(0)).toBe('RIFF');
    expect(text(8)).toBe('WAVE');
    expect(view.getUint16(22, true)).toBe(1); // one channel
    expect(view.getUint32(24, true)).toBe(24000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(wav.length - 44);
    expect(view.getUint32(4, true)).toBe(wav.length - 8);
    // About 0.8 s of sound at 24 000 values of 2 bytes a second.
    expect(wav.length).toBeLessThan(0.9 * 24000 * 2);
    expect(toMono([new Float32Array([1, 0]), new Float32Array([0, 1])])).toEqual(new Float32Array([0.5, 0.5]));
    expect(lighter(new Float32Array(100), 16000).rate).toBe(16000);
    expect(new DataView(encodeWav(new Float32Array([1, -1, 2]), 8000).buffer).getInt16(44, true)).toBe(32767);
  });

  it('tablet app: finds the two moments from the loudness measured while recording', () => {
    // One measure every 60 ms for 3 s: room at -55 dB, the word at -15 dB from 1.0 s to 1.8 s.
    const levels: Level[] = [];
    for (let ms = 60; ms <= 3000; ms += 60) levels.push({ ms, db: ms > 1000 && ms <= 1800 ? -15 : -55 });
    const span = levelSpan(levels, 3000)!;
    expect(span.from).toBeGreaterThan(0.75);
    expect(span.from).toBeLessThanOrEqual(1.0);
    expect(span.to).toBeGreaterThanOrEqual(1.8);
    expect(span.to).toBeLessThan(2.1);
    // Nothing said, or no measure: the recording is played whole.
    expect(levelSpan(levels.map((l) => ({ ...l, db: -60 })), 3000)).toBeNull();
    expect(levelSpan([], 3000)).toBeNull();
    expect(levelSpan([{ ms: 60, db: -160 }, { ms: 120, db: -Infinity }, { ms: 180, db: NaN }], 180)).toBeNull();
  });

  it('keeps the two moments in the name of the file, and reads them back', () => {
    const name = `1762000000001_zz99zz.${spanTag({ from: 0.12, to: 0.98 })}.m4a`;
    expect(name).toBe('1762000000001_zz99zz.t120-980.m4a');
    expect(spanOfName(name)).toEqual({ from: 0.12, to: 0.98 });
    expect(spanOfName('1762000000001_zz99zz.m4a')).toBeUndefined();
    expect(spanOfName('1762000000001_zz99zz.t980-120.m4a')).toBeUndefined();
    expect(spanOfName('1762000000000_ab12cd.jpg')).toBeUndefined();
    // Such a recording still leaves the device with its child, and is still a safe file name.
    expect(mediaNamesIn({ overrides: { b: { audio: { fr: name } }, c: { audio: { fr: '1762000000002_aa11aa.wav' } } } })).toEqual([name, '1762000000002_aa11aa.wav']);
    expect(safeFileName(name)).toBe(true);
  });
});
