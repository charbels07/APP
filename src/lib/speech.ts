/**
 * Speech output. Synthesised voices run on-device (offline for installed
 * voices, spec COM-01 / OFF-02); recorded words play the family's recording.
 */
import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { Lang, Settings } from '../model/types';
import type { Segment } from './grammar';
import { speechTag } from './lexicon';
import { mediaUri } from './media';

let generation = 0;
let player: AudioPlayer | null = null;

export function stopSpeech(): void {
  generation++;
  Speech.stop().catch(() => {});
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {
      /* ignore */
    }
    player = null;
  }
}

function speakOne(text: string, lang: Lang, settings: Settings): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    Speech.speak(text, {
      language: speechTag(lang),
      rate: settings.speechRate,
      voice: settings.voices[lang],
      onDone: done,
      onStopped: done,
      onError: done,
    });
    // Some browser engines never fire end events: don't block the queue forever.
    setTimeout(done, 2500 + text.length * 140);
  });
}

function playOne(uri: string): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const p = createAudioPlayer(uri);
    player = p;
    const done = () => {
      if (settled) return;
      settled = true;
      sub.remove();
      resolve();
    };
    const sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) done();
    });
    p.play();
    setTimeout(done, 15000);
  });
}

export async function speakSegments(segments: Segment[], settings: Settings): Promise<void> {
  stopSpeech();
  const mine = generation;
  for (const seg of segments) {
    if (mine !== generation) return;
    if (seg.kind === 'tts') {
      if (seg.text.trim()) await speakOne(seg.text, seg.lang, settings);
    } else {
      const uri = await mediaUri(seg.media);
      if (uri && mine === generation) await playOne(uri);
    }
  }
}

export function speakText(text: string, lang: Lang, settings: Settings): Promise<void> {
  return speakSegments([{ kind: 'tts', text, lang }], settings);
}

export async function playMedia(name: string): Promise<void> {
  stopSpeech();
  const uri = await mediaUri(name);
  if (uri) await playOne(uri);
}

export async function listVoices(lang: Lang): Promise<{ id: string; name: string }[]> {
  try {
    const prefix = speechTag(lang).slice(0, 2);
    const voices = await Speech.getAvailableVoicesAsync();
    return voices
      .filter((v) => v.language?.toLowerCase().startsWith(prefix))
      .map((v) => ({ id: v.identifier, name: `${v.name} (${v.language})` }));
  } catch {
    return [];
  }
}

/** Short beep (web only; on devices the timer uses speech + haptics). */
export function beep(): void {
  if (Platform.OS !== 'web') return;
  try {
    const Ctx = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.35, 0.7].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    });
  } catch {
    /* audio blocked */
  }
}
