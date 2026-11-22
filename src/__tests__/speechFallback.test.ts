/**
 * A recording that cannot be played must not stall the sentence nor leave the word unsaid
 * (gap review of November 2026): the device's voice says the word instead.
 */
import type { Settings } from '../model/types';

type Status = Record<string, unknown>;
interface FakePlayer {
  uri: string;
  isLoaded: boolean;
  emit: (s: Status) => void;
  play: jest.Mock;
  pause: jest.Mock;
  remove: jest.Mock;
}
const mockPlayers: FakePlayer[] = [];
let mockMakePlayer: (uri: string) => Partial<FakePlayer> = () => ({});

jest.mock('expo-audio', () => ({
  createAudioPlayer: (uri: string) => {
    let listener: (s: Status) => void = () => {};
    const p = {
      uri,
      isLoaded: false,
      play: jest.fn(),
      pause: jest.fn(),
      remove: jest.fn(),
      seekTo: jest.fn(async () => {}),
      addListener: (_: string, fn: (s: Status) => void) => {
        listener = fn;
        return { remove: () => (listener = () => {}) };
      },
      emit: (s: Status) => listener(s),
      ...mockMakePlayer(uri),
    };
    mockPlayers.push(p as unknown as FakePlayer);
    return p;
  },
}));
const mockSaid: string[] = [];
jest.mock('expo-speech', () => ({
  speak: (text: string, opts: { onDone?: () => void }) => {
    mockSaid.push(text);
    setTimeout(() => opts.onDone?.(), 10);
  },
  stop: async () => {},
  getAvailableVoicesAsync: async () => [],
}));
jest.mock('../lib/media', () => ({ mediaUri: async (name: string) => (name.startsWith('missing') ? null : `file:///${name}`) }));

import { speakSegments, stopSpeech } from '../lib/speech';
import { recordingWav } from '../lib/trimSilence';

const settings = { speechRate: 1, voiceKind: 'f', voiceAge: 'adult', voices: {} } as unknown as Settings;
const recorded = (media: string, text: string) => ({ kind: 'audio' as const, media, text, lang: 'fr' as const });

beforeEach(() => {
  jest.useFakeTimers();
  mockPlayers.length = 0;
  mockSaid.length = 0;
  mockMakePlayer = () => ({});
});
afterEach(() => {
  stopSpeech();
  jest.useRealTimers();
});

const run = async (ms: number) => {
  await jest.advanceTimersByTimeAsync(ms);
};

describe('a recorded word', () => {
  it('that plays is heard once, and the sentence goes on', async () => {
    const p = speakSegments([recorded('a.m4a', 'maman'), { kind: 'tts', text: 'arrive', lang: 'fr' }], settings);
    await run(1);
    mockPlayers[0].emit({ isLoaded: true, playing: true, currentTime: 0.1 });
    await run(400);
    mockPlayers[0].emit({ isLoaded: true, didJustFinish: true });
    await run(50);
    await p;
    expect(mockSaid).toEqual(['arrive']);
  });

  it('that this device cannot read (an error from the player) is said by the device\'s voice at once', async () => {
    const p = speakSegments([recorded('a.webm', 'maman'), { kind: 'tts', text: 'arrive', lang: 'fr' }], settings);
    await run(1);
    mockPlayers[0].emit({ isLoaded: false, error: 'Playback error (code 4)' });
    await run(50);
    await p;
    expect(mockSaid).toEqual(['maman', 'arrive']);
    expect(mockPlayers[0].remove).toHaveBeenCalled();
  });

  it('that never loads is replaced after a moment, not after 15 seconds', async () => {
    const p = speakSegments([recorded('a.webm', 'maman')], settings);
    await run(1400);
    expect(mockSaid).toEqual([]);
    await run(200);
    expect(mockSaid).toEqual(['maman']);
    await run(50);
    await p;
  });

  it('whose player cannot even be made is said by the device\'s voice', async () => {
    mockMakePlayer = () => {
      throw new Error('no player');
    };
    const p = speakSegments([recorded('a.m4a', 'maman')], settings);
    await run(50);
    await p;
    expect(mockSaid).toEqual(['maman']);
  });

  it('that fails after it was heard is not said a second time', async () => {
    const p = speakSegments([recorded('a.m4a', 'maman')], settings);
    await run(1);
    mockPlayers[0].emit({ isLoaded: true, playing: true, currentTime: 0.3 });
    mockPlayers[0].emit({ isLoaded: true, error: 'interrupted', currentTime: 0.3 });
    await run(50);
    await p;
    expect(mockSaid).toEqual([]);
  });

  it('stopped on purpose (a new touch) is not said by the voice on top of the new word', async () => {
    void speakSegments([recorded('a.m4a', 'maman')], settings);
    await run(100);
    const next = speakSegments([{ kind: 'tts', text: 'papa', lang: 'fr' }], settings);
    await run(3000);
    await next;
    expect(mockSaid).toEqual(['papa']);
  });

  it('that has not reached this device yet is said by the device\'s voice (as before)', async () => {
    const p = speakSegments([recorded('missing.m4a', 'maman')], settings);
    await run(50);
    await p;
    expect(mockSaid).toEqual(['maman']);
  });
});

describe('a word recorded in a browser', () => {
  const wavHeader = (b: Uint8Array) => String.fromCharCode(...b.slice(0, 4)) + String.fromCharCode(...b.slice(8, 12));
  it('is always saved as a WAV file, also when there is no silence to cut', () => {
    const rate = 48000;
    const tone = new Float32Array(rate / 2);
    for (let i = 0; i < tone.length; i++) tone[i] = Math.sin((2 * Math.PI * 220 * i) / rate) * 0.3;
    const wav = recordingWav([tone], rate)!;
    expect(wavHeader(wav)).toBe('RIFFWAVE');
    expect(wav.length).toBeGreaterThan(1000);
  });
  it('nothing recorded gives nothing to save', () => {
    expect(recordingWav([], 48000)).toBeNull();
    expect(recordingWav([new Float32Array(0)], 48000)).toBeNull();
  });
});
