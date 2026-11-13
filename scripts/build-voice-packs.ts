/**
 * Builds the dialect voice packs: every Arabic word of the built-in vocabulary, said once by a
 * synthetic voice of the right country, stored in the app so it works offline.
 *
 *   npm run build:voices -- --dry             what would be generated, and how many characters (no network)
 *   npm run build:voices -- --voices          the voices the service offers for each dialect
 *   npm run build:voices -- --sample 20       20 words per dialect as MP3 files to listen to (voice-samples/)
 *   npm run build:voices                      the packs (assets/voice/) and their index (src/data/)
 *   npm run build:voices -- --only eg,sa      only these dialects (the others keep their packs)
 *
 * Service: Microsoft Azure AI Speech, the only one found with a voice per Arab country.
 * Needs a PAID Speech resource (the free tier does not give the right to ship the audio in a
 * product): AZURE_SPEECH_KEY and AZURE_SPEECH_REGION in the environment, never in a file.
 * Only the app's own vocabulary is sent — nothing about any child.
 *
 * Output:
 *   assets/voice/<dialect>.<f|m>.pack   base64 text of the MP3 clips, one after the other
 *   src/data/voicePackIndex.ts          which word is where, and which voice says it
 *   src/data/voicePackAssets.ts         the asset list
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BUILTIN_CONCEPTS } from '../src/data/concepts.ts';
import { DIALECT_WORDS } from '../src/data/dialectWords.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'assets/voice');
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : undefined);

type Dialect = keyof typeof DIALECT_WORDS;
type Gender = 'f' | 'm';

/** Countries whose voice may speak each dialect, best first. Standard Arabic uses the Saudi voice. */
const LOCALES: Record<Dialect, string[]> = {
  lb: ['ar-LB'],
  sy: ['ar-SY', 'ar-LB'],
  jo: ['ar-JO', 'ar-LB'],
  eg: ['ar-EG'],
  sa: ['ar-SA'],
  gulf: ['ar-AE', 'ar-KW', 'ar-QA', 'ar-BH', 'ar-OM'],
  iq: ['ar-IQ'],
  msa: ['ar-SA', 'ar-EG'],
};
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

/** Every Arabic word the board can show in this dialect (masculine and feminine forms). */
export function wordsOf(dialect: Dialect): string[] {
  const out = new Set<string>();
  for (const c of Object.values(BUILTIN_CONCEPTS)) {
    const changed = DIALECT_WORDS[dialect][c.id];
    const forms = changed ? changed.split('|') : [c.labels.ar, c.labelsF?.ar];
    for (const f of forms) if (f?.trim()) out.add(f.trim());
  }
  return [...out];
}

interface ServiceVoice {
  ShortName: string;
  Locale: string;
  Gender: string;
  VoiceType: string;
}

const key = process.env.AZURE_SPEECH_KEY;
const region = process.env.AZURE_SPEECH_REGION;
const host = () => `https://${region}.tts.speech.microsoft.com/cognitiveservices`;

function needKey(): void {
  if (key && region) return;
  console.error('Set AZURE_SPEECH_KEY and AZURE_SPEECH_REGION (a paid Azure AI Speech resource) in your terminal first.');
  process.exit(1);
}

async function serviceVoices(): Promise<ServiceVoice[]> {
  const res = await fetch(`${host()}/voices/list`, { headers: { 'Ocp-Apim-Subscription-Key': key! } });
  if (!res.ok) throw new Error(`voices list: HTTP ${res.status}`);
  return ((await res.json()) as ServiceVoice[]).filter((v) => v.Locale.startsWith('ar-'));
}

/** The plain neural voice of that country and gender (not the multilingual or preview ones). */
export function pickVoice(voices: ServiceVoice[], dialect: Dialect, gender: Gender): ServiceVoice | undefined {
  const want = gender === 'f' ? 'Female' : 'Male';
  for (const locale of LOCALES[dialect]) {
    const v = voices
      .filter((x) => x.Locale === locale && x.Gender === want && /Neural$/.test(x.ShortName) && !/Multilingual|:/.test(x.ShortName))
      .sort((a, b) => a.ShortName.localeCompare(b.ShortName))[0];
    if (v) return v;
  }
  return undefined;
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function say(text: string, voice: ServiceVoice): Promise<Buffer> {
  const ssml = `<speak version="1.0" xml:lang="${voice.Locale}"><voice name="${voice.ShortName}">${xml(text)}</voice></speak>`;
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`${host()}/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key!,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'aac-voice-packs',
      },
      body: ssml,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    // Too many requests, or a passing server error: wait and try again.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`"${text}" with ${voice.ShortName}: HTTP ${res.status}`);
  }
}

async function sayAll(words: string[], voice: ServiceVoice): Promise<Buffer[]> {
  const out: Buffer[] = new Array(words.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (next < words.length) {
        const i = next++;
        out[i] = await say(words[i], voice);
      }
    }),
  );
  return out;
}

interface PackInfo {
  voice: string;
  locale: string;
  clips: Record<string, [number, number]>;
}

/** Packs already in the project (kept when only some dialects are rebuilt). */
function existingIndex(): Record<string, PackInfo> {
  const file = join(root, 'src/data/voicePackIndex.ts');
  const m = existsSync(file) ? /export const VOICE_INDEX: Record<string, VoicePackInfo> = (\{[\s\S]*\});\s*$/.exec(readFileSync(file, 'utf8')) : null;
  try {
    return m ? (JSON.parse(m[1]) as Record<string, PackInfo>) : {};
  } catch {
    return {};
  }
}

export function writeIndex(index: Record<string, PackInfo>): void {
  const keys = Object.keys(index).sort();
  const sorted = Object.fromEntries(keys.map((k) => [k, index[k]]));
  writeFileSync(
    join(root, 'src/data/voicePackIndex.ts'),
    `// GENERATED by scripts/build-voice-packs.ts — do not edit by hand.
// Dialect voices: for each pack (\`<dialect>.<f|m>\`), the Arabic words that have a spoken clip and
// where the clip sits in the pack. Empty until the packs are generated (the app then speaks Arabic
// with the tablet's own voice).
/* eslint-disable */
export interface VoicePackInfo {
  /** Name of the synthetic voice that speaks this pack. */
  voice: string;
  locale: string;
  /** Spoken word → [offset, length] in bytes inside the pack. */
  clips: Record<string, [number, number]>;
}
export const VOICE_BUILT: string | null = ${keys.length ? JSON.stringify(new Date().toISOString().slice(0, 10)) : 'null'};
/** The speech service the clips come from (shown in Settings → About). */
export const VOICE_PROVIDER = { name: 'Microsoft Azure AI Speech', url: 'https://azure.microsoft.com/products/ai-services/ai-speech' };
export const VOICE_INDEX: Record<string, VoicePackInfo> = ${JSON.stringify(sorted)};
`,
  );
  writeFileSync(
    join(root, 'src/data/voicePackAssets.ts'),
    `// GENERATED by scripts/build-voice-packs.ts — do not edit by hand.
// The audio of each dialect voice pack (base64 text of MP3 clips), kept apart from the index so
// that code which only needs to know "is there a clip for this word" loads no audio.
/* eslint-disable */
export const VOICE_ASSETS: Record<string, number> = {
${keys.map((k) => `  ${JSON.stringify(k)}: require('../../assets/voice/${k}.pack'),`).join('\n')}
};
`,
  );
}

/** One pack: the clips one after the other, as base64 text (some hosts refuse binary files). */
export function writePack(name: string, words: string[], clips: Buffer[], voice: ServiceVoice): PackInfo {
  const info: PackInfo = { voice: voice.ShortName, locale: voice.Locale, clips: {} };
  let offset = 0;
  words.forEach((w, i) => {
    info.clips[w] = [offset, clips[i].length];
    offset += clips[i].length;
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, `${name}.pack`), Buffer.concat(clips).toString('base64'));
  return info;
}

async function main(): Promise<void> {
  const all = Object.keys(DIALECT_WORDS) as Dialect[];
  const only = value('only')?.split(',').filter((d): d is Dialect => (all as string[]).includes(d));
  const dialects = only?.length ? only : all;

  if (flag('dry')) {
    let chars = 0;
    for (const d of dialects) {
      const words = wordsOf(d);
      const n = words.join('').length;
      chars += n * 2;
      console.log(`- ${d}: ${words.length} words, ${n} characters per voice (woman + man: ${n * 2})`);
    }
    console.log(`Total sent to the service: about ${chars} characters, once.`);
    return;
  }

  needKey();
  const voices = await serviceVoices();
  if (flag('voices')) {
    for (const d of all) console.log(`- ${d}: woman ${pickVoice(voices, d, 'f')?.ShortName ?? '—'} · man ${pickVoice(voices, d, 'm')?.ShortName ?? '—'}`);
    return;
  }

  const sample = Number(value('sample') ?? 0);
  if (sample > 0) {
    const dir = join(root, 'voice-samples');
    for (const d of dialects) {
      for (const g of ['f', 'm'] as Gender[]) {
        const voice = pickVoice(voices, d, g);
        if (!voice) continue;
        // The words that differ from Lebanese first: they are the ones worth listening to.
        const own = Object.values(DIALECT_WORDS[d]).flatMap((w) => w.split('|'));
        const words = [...new Set([...own, ...wordsOf(d)])].slice(0, sample);
        const clips = await sayAll(words, voice);
        mkdirSync(join(dir, `${d}-${g}`), { recursive: true });
        words.forEach((w, i) => writeFileSync(join(dir, `${d}-${g}`, `${String(i + 1).padStart(2, '0')} ${w.replace(/[\\/:*?"<>|!؟]/g, '')}.mp3`), clips[i]));
        console.log(`- ${d} ${g}: ${words.length} samples with ${voice.ShortName}`);
      }
    }
    console.log(`Listen to the files in ${dir} with a native speaker before building the packs.`);
    return;
  }

  const index = existingIndex();
  for (const d of dialects) {
    const words = wordsOf(d);
    for (const g of ['f', 'm'] as Gender[]) {
      const name = `${d}.${g}`;
      const voice = pickVoice(voices, d, g);
      if (!voice) {
        console.log(`- ${name}: the service has no such voice, skipped`);
        delete index[name];
        if (existsSync(join(outDir, `${name}.pack`))) unlinkSync(join(outDir, `${name}.pack`));
        continue;
      }
      index[name] = writePack(name, words, await sayAll(words, voice), voice);
      console.log(`- ${name}: ${words.length} words with ${voice.ShortName}`);
    }
  }
  // No pack file without its index entry, and the other way round.
  if (existsSync(outDir)) for (const f of readdirSync(outDir)) if (f.endsWith('.pack') && !index[f.slice(0, -5)]) unlinkSync(join(outDir, f));
  writeIndex(index);
  console.log(`Voice packs: ${Object.keys(index).length}. Have each dialect listened to by a native speaker before selling there.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(String(e instanceof Error ? e.message : e));
    process.exit(1);
  });
}
