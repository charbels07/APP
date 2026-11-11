/**
 * Server function "caa-ai" (Supabase Edge Function, Deno): the app's AI helper on phones and
 * tablets. It asks Claude for
 *  - 'tla':     the words of a new activity board from a topic ("going to the dentist");
 *  - 'photo':   the words of an activity board from a photo (a restaurant menu, a game box…);
 *  - 'drawing': what a finger drawing shows (search by drawing).
 * Only signed-in accounts can call it, a few dozen times a day each (count_ai_call), and only the
 * topic, photo or drawing is sent — never the child's name, words or sentences.
 * The Anthropic key is a Supabase secret (ANTHROPIC_API_KEY); it never reaches the app.
 */
import Anthropic from 'npm:@anthropic-ai/sdk@1.8.0';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  type AiRequest,
  DRAWING_PROMPT,
  DRAWING_SCHEMA,
  MAX_IMAGE_B64,
  PLAN_SCHEMA,
  photoPrompt,
  tlaPrompt,
} from '../_shared/aiPrompts.ts';

const MODEL = 'claude-opus-5-5';
/** Calls per account and per day. */
const DAILY_LIMIT = 40;

const anthropic = new Anthropic(); // reads ANTHROPIC_API_KEY

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  // 1. A signed-in account (parent, professional or a child's device), with calls left today.
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: who } = await sb.auth.getUser();
  if (!who.user) return json({ error: 'unauthorized' }, 401);
  const { data: calls, error: countError } = await sb.rpc('count_ai_call');
  if (countError) return json({ error: 'unavailable' }, 503);
  if ((calls as number) > DAILY_LIMIT) return json({ error: 'limit' }, 429);

  // 2. What is asked.
  let body: AiRequest;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const image = body.image;
  if (image && (!['image/jpeg', 'image/png'].includes(image.mediaType) || typeof image.data !== 'string' || image.data.length > MAX_IMAGE_B64)) {
    return json({ error: 'bad_image' }, 400);
  }
  let prompt: string;
  let schema: Record<string, unknown>;
  if (body.task === 'tla' && body.topic?.trim()) {
    prompt = tlaPrompt(body.topic);
    schema = PLAN_SCHEMA;
  } else if (body.task === 'photo' && image) {
    prompt = photoPrompt(body.hint);
    schema = PLAN_SCHEMA;
  } else if (body.task === 'drawing' && image) {
    prompt = DRAWING_PROMPT;
    schema = DRAWING_SCHEMA;
  } else {
    return json({ error: 'bad_request' }, 400);
  }

  // 3. Claude answers in the JSON shape the app expects (structured outputs).
  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  if (image) content.push({ type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } });
  content.push({ type: 'text', text: prompt });
  try {
    const msg = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // If a safety check declines, the request is re-run on Anthropic's recommended model.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: body.task === 'drawing' ? 'low' : 'medium', format: { type: 'json_schema', schema } },
      messages: [{ role: 'user', content }],
    });
    if (msg.stop_reason === 'refusal') return json({ error: 'refused' }, 422);
    const text = msg.content.find((b) => b.type === 'text');
    if (!text || text.type !== 'text') return json({ error: 'empty' }, 502);
    return json(JSON.parse(text.text));
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: 'busy' }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: 'ai_error', status: e.status }, 502);
    return json({ error: 'ai_error' }, 502);
  }
});
