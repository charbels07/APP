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
import { chooseVoice, forVoice, plainKind, voiceGender, type VoiceChoice, type VoiceGender, type VoiceInfo } from './voices';
import { mediaUri } from './media';
import { spanOfName, type Span } from './trimSilence';
import { clipUri } from './voiceClips';

let generation = 0;
let player: AudioPlayer | null = null;
/** The `generation` of the words or sentence being said now (-1: nothing is being said). */
let talking = -1;

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

/** Progress while speaking: segment index and character offset of the word being said. */
export type SpeechProgress = (segment: number, charIndex: number) => void;

function speakOne(text: string, lang: Lang, settings: Settings, onWord?: (charIndex: number) => void): Promise<void> {
  // Until the device's voices are known, the pitch already follows the chosen voice.
  const choice =
    plan[lang] ?? chooseVoice([], lang, speechTag(lang), plainKind(settings), settings.voiceAge ?? 'adult');
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (!settled) {
        settled = true;
        resolve();
      }
    };
    Speech.speak(forVoice(text), {
      language: speechTag(lang),
      rate: settings.speechRate,
      voice: choice.id,
      // The voice as it is (1), raised for a child, or lowered / raised when the device has no voice of the chosen kind.
      pitch: choice.pitch,
      onDone: done,
      onStopped: done,
      onError: done,
      // iOS / Android / browsers report each word as it starts (charIndex in `text`).
      onBoundary: onWord ? (ev: unknown) => onWord((ev as { charIndex?: number })?.charIndex ?? 0) : undefined,
    });
    // Some browser engines never fire end events: don't block the queue forever.
    setTimeout(done, 2500 + text.length * 140);
  });
}

/**
 * `rate`: above 1 for the child voice of a dialect clip (faster and higher, like the synthetic child voice).
 * `span`: only this piece is played (a recorded word without the silence around it).
 */
function playOne(uri: string, rate = 1, span?: Span): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    // With a piece to play, the position is followed closely enough to stop at its end.
    const p = span ? createAudioPlayer(uri, { updateInterval: 40 }) : createAudioPlayer(uri);
    player = p;
    if (rate !== 1) {
      try {
        p.shouldCorrectPitch = false;
        p.playbackRate = rate;
      } catch {
        /* this device cannot change the speed: the clip plays as it is */
      }
    }
    const done = () => {
      if (settled) return;
      settled = true;
      sub.remove();
      resolve();
    };
    // A piece: go to its beginning once the sound is loaded, then play.
    let started = !span || span.from < 0.02;
    const start = () => {
      if (started || settled) return;
      started = true;
      p.seekTo(span!.from)
        .catch(() => {})
        .then(() => {
          if (!settled) p.play();
        });
    };
    const sub = p.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) return done();
      if (!started && status.isLoaded) return start();
      if (span && started && status.currentTime >= span.to) {
        try {
          p.pause();
        } catch {
          /* already stopped */
        }
        done();
      }
    });
    if (started) p.play();
    else if (p.isLoaded) start();
    // If the player never says it is loaded, the word is still said (from where it can).
    else setTimeout(start, 600);
    setTimeout(done, 15000);
  });
}

export async function speakSegments(segments: Segment[], settings: Settings, onProgress?: SpeechProgress): Promise<void> {
  stopSpeech();
  const mine = generation;
  talking = mine;
  try {
    await saySegments(segments, settings, mine, onProgress);
  } finally {
    if (talking === mine) talking = -1;
  }
}

async function saySegments(segments: Segment[], settings: Settings, mine: number, onProgress?: SpeechProgress): Promise<void> {
  for (const [i, seg] of segments.entries()) {
    if (mine !== generation) return;
    onProgress?.(i, 0);
    if (seg.kind === 'tts') {
      if (seg.text.trim())
        await speakOne(seg.text, seg.lang, settings, onProgress && ((c) => mine === generation && onProgress(i, c)));
    } else if (seg.kind === 'clip') {
      // The dialect's own voice; if the clip cannot be read, the tablet's voice says the word.
      const uri = await clipUri(seg.pack, seg.text);
      if (mine !== generation) return;
      if (uri) await playOne(uri);
      else await speakOne(seg.text, seg.lang, settings);
    } else {
      const uri = await mediaUri(seg.media);
      if (uri && mine === generation) await playOne(uri, 1, spanOfName(seg.media));
    }
  }
}

/**
 * Auditory scanning: the lit word said quietly and a little faster, with the device's voice.
 * Never over a word or a sentence being said (the chosen word, Speak): it is skipped then.
 */
export function speakPreview(text: string, lang: Lang, settings: Settings): void {
  if (talking === generation || !text.trim()) return;
  Speech.stop().catch(() => {});
  const choice = plan[lang] ?? chooseVoice([], lang, speechTag(lang), plainKind(settings), settings.voiceAge ?? 'adult');
  Speech.speak(forVoice(text), {
    language: speechTag(lang),
    rate: Math.min(2, (settings.speechRate || 1) * 1.3),
    voice: choice.id,
    pitch: choice.pitch,
    volume: 0.6,
  });
}

export function speakText(text: string, lang: Lang, settings: Settings): Promise<void> {
  return speakSegments([{ kind: 'tts', text, lang }], settings);
}

export async function playMedia(name: string): Promise<void> {
  stopSpeech();
  const uri = await mediaUri(name);
  if (uri) await playOne(uri, 1, spanOfName(name));
}

let voiceList: Promise<VoiceInfo[]> | null = null;
/** The device's voices (browsers may never announce any: give up after 3 s). */
function deviceVoices(): Promise<VoiceInfo[]> {
  voiceList ??= Promise.race([
    Speech.getAvailableVoicesAsync()
      .then((vs) => vs.map((v) => ({ id: v.identifier, name: v.name, language: v.language ?? '', quality: String(v.quality ?? '') })))
      .catch(() => [] as VoiceInfo[]),
    new Promise<VoiceInfo[]>((r) => setTimeout(() => r([]), 3000)),
  ]).then((vs) => {
    if (!vs.length) voiceList = null; // try again next time (voices can arrive late)
    return vs;
  });
  return voiceList;
}

/** Voice and pitch used for each language, from Settings → Voice (woman, man, girl or boy). */
let plan: Partial<Record<Lang, VoiceChoice>> = {};

// Arabic uses the device's standard Arabic voice whatever the family's dialect: the voices of each
// country were listened to by a native speaker and judged not good enough (the dialect only changes the words).
export async function prepareVoices(settings: Settings): Promise<Record<Lang, VoiceChoice>> {
  const voices = await deviceVoices();
  const next = {} as Record<Lang, VoiceChoice>;
  for (const l of ['fr', 'en', 'ar'] as Lang[])
    next[l] = chooseVoice(voices, l, speechTag(l), plainKind(settings), settings.voiceAge ?? 'adult');
  plan = next;
  return next;
}

export async function listVoices(lang: Lang): Promise<{ id: string; name: string; gender?: VoiceGender }[]> {
  const prefix = speechTag(lang).slice(0, 2);
  return (await deviceVoices())
    .filter((v) => v.language.toLowerCase().startsWith(prefix))
    .map((v) => ({ id: v.id, name: `${v.name} (${v.language})`, gender: voiceGender(v) }));
}

/** Short beep (web only; on devices the timer uses speech). */
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
