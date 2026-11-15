/**
 * Server function "caa-voice" (Supabase Edge Function, Deno): the real girl's voice.
 * In French and English the app asks it to say a word or a sentence with a girl's voice of a
 * speech service (Microsoft Azure AI Speech) and plays the sound it gets back; the tablet keeps
 * the sound, so each phrase is asked once per device.
 *
 * Only signed-in accounts that look after a child can call it, a limited number of times a day
 * (count_voice_call). Only the text to say, its language and the kind of voice are received: never
 * the child's name or the account. The voice itself is chosen here, not by the app. Nothing is kept.
 * The Azure key is a Supabase secret (AZURE_SPEECH_KEY, AZURE_SPEECH_REGION); it never reaches the app.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

/** New phrases per account and per day (a phrase already said on a tablet costs nothing). */
const DAILY_LIMIT = 1500;
const MAX_CHARS = 300;
const FORMAT = 'audio-24khz-48kbitrate-mono-mp3';

/**
 * The voices chosen by the app's owner after listening (November 2026): real girls' voices.
 * No real boy's voice exists at the service, so the boy is not said here: he keeps the tablet's
 * own voice (the app never asks for one; a request for a boy is refused like any unknown voice).
 */
const VOICES: Record<string, { name: string; locale: string; pitch?: string }> = {
  'en.f': { name: 'en-GB-MaisieNeural', locale: 'en-GB' },
  'fr.f': { name: 'fr-FR-EloiseNeural', locale: 'fr-FR' },
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function encodeBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 0x8000) out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(out);
}

/** No silence before the word and almost none after: words follow each other in a sentence. */
const SILENCE = '<mstts:silence type="Leading-exact" value="0ms"/><mstts:silence type="Tailing-exact" value="60ms"/>';

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const key = Deno.env.get('AZURE_SPEECH_KEY');
  const region = Deno.env.get('AZURE_SPEECH_REGION');
  // Installed without its key: the app treats the voice as absent (and says nothing about it).
  if (!key || !region || !/^[a-z0-9]+$/.test(region)) return json({ error: 'not_configured' }, 503);
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // 1. What is asked: checked before anything is counted.
  let body: { text?: unknown; lang?: unknown; kind?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const text = typeof body?.text === 'string' ? body.text.replace(/\s+/g, ' ').trim() : '';
  const voice = VOICES[`${body?.lang}.${body?.kind}`];
  if (!text || text.length > MAX_CHARS || !voice || typeof body.lang !== 'string' || typeof body.kind !== 'string') {
    return json({ error: 'bad_request' }, 400);
  }

  // 2. A signed-in account that looks after a child, with calls left today (the database decides).
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY'))!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: who } = await sb.auth.getUser();
  if (!who.user) return json({ error: 'unauthorized' }, 401);
  const { data: calls, error: countError } = await sb.rpc('count_voice_call');
  if (countError) {
    if (/forbidden/.test(countError.message ?? '')) return json({ error: 'forbidden' }, 403);
    if (/voice_busy/.test(countError.message ?? '')) return json({ error: 'busy' }, 429);
    return json({ error: 'unavailable' }, 503);
  }
  if ((calls as number) > DAILY_LIMIT) return json({ error: 'limit' }, 429);

  // 3. The speech service says it. The text is escaped: it can never become an instruction (SSML).
  const said = voice.pitch ? `<prosody pitch="${voice.pitch}">${xml(text)}</prosody>` : xml(text);
  const ssml = `<speak version="1.0" xmlns:mstts="http://www.w3.org/2001/mstts" xml:lang="${voice.locale}"><voice name="${voice.name}">${SILENCE}<lang xml:lang="${voice.locale}">${said}</lang></voice></speak>`;
  try {
    const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': FORMAT,
        'User-Agent': 'caa-voice',
      },
      body: ssml,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return json({ error: res.status === 429 ? 'busy' : 'voice_error' }, res.status === 429 ? 429 : 502);
    const audio = new Uint8Array(await res.arrayBuffer());
    if (!audio.length) return json({ error: 'empty' }, 502);
    return json({ audio: encodeBase64(audio) });
  } catch {
    return json({ error: 'voice_error' }, 502);
  }
});
