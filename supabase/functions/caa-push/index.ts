/**
 * Server function "caa-push" (Supabase Edge Function, Deno): delivers the notifications that leave
 * the app (the 12:00 reminder for parents, a new idea put to the vote).
 *
 * The database decides who is told what and writes each notification, already worded, in its
 * queue `push_out` (supabase/migrations/20261120000000_push.sql), then calls this function. The
 * function asks the database for the waiting notifications, sends each one to the browser that
 * accepted them (encrypted for that browser: the notification services of Google, Mozilla, Apple
 * or Microsoft carry it without being able to read it), and tells the database what happened.
 * It cannot write a notification nor choose who receives it, and it only posts to those
 * notification services.
 *
 * The pair of keys that signs the notifications is made here the first time the function runs,
 * and kept by the database (the private half sealed). Nothing to set by hand.
 *
 * Called by the database only: the caller shows the key the database made (`team_mail_config`, the
 * same key as caa-mail and caa-purge) and the database checks it; anything else gets "401".
 *
 * Deploy with "Verify JWT" turned off (the database has no sign-in token to show):
 *   supabase functions deploy caa-push --no-verify-jwt
 * Optional secret: PUSH_CONTACT (an address the notification services may write to if something
 * goes wrong: "mailto:someone@example.com"). Left out: the mailbox that sends the sign-in codes
 * (SMTP_USER), else the project's address.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import { makeVapidKeys, sendPush, type VapidKeys } from '../_shared/webPush.ts';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Db = ReturnType<typeof createClient>;
type Job = { id: string; endpoint: string; p256dh: string; auth: string; kind: string; title: string; body: string; ttl: number };

async function readKeys(db: Db, key: string): Promise<{ keys: VapidKeys | null; error?: string }> {
  const { data, error } = await db.rpc('push_keys', { p_key: key });
  if (error) return { keys: null, error: error.message };
  const row = ((data ?? []) as { public_key: string; private_key: string }[])[0];
  return { keys: row ? { publicKey: row.public_key, privateKey: row.private_key } : null };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const key = req.headers.get('x-mail-key') ?? '';
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serverKeys = [Deno.env.get('SUPABASE_SECRET_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter((k): k is string => !!k);
  if (!url || !serverKeys.length) return json({ error: 'not_configured' }, 503);

  // The database checks the caller's key and hands out the signing keys.
  let db: Db | null = null;
  let keys: VapidKeys | null = null;
  for (const serverKey of serverKeys) {
    const client = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const read = await readKeys(client, key);
    if (!read.error) {
      db = client;
      keys = read.keys;
      break;
    }
    if (/forbidden/.test(read.error)) return json({ error: 'unauthorized' }, 401);
  }
  if (!db) return json({ error: 'database' }, 502);

  // First run: the keys are made here. The database keeps the first pair it is given, so two
  // runs at the same moment end up with the same one.
  if (!keys) {
    const made = await makeVapidKeys();
    await db.rpc('push_keys_set', { p_key: key, p_public: made.publicKey, p_private: made.privateKey });
    keys = (await readKeys(db, key)).keys;
    if (!keys) return json({ error: 'keys' }, 502);
  }

  const { data, error } = await db.rpc('push_take', { p_key: key });
  if (error) return json({ error: 'database' }, 502);
  const jobs = (data ?? []) as Job[];
  const smtp = Deno.env.get('SMTP_USER');
  const contact = Deno.env.get('PUSH_CONTACT') || (smtp ? `mailto:${smtp}` : url);

  let sent = 0;
  let gone = 0;
  let failed = 0;
  for (const job of jobs) {
    const r = await sendPush(job, { title: job.title, body: job.body, tag: job.kind }, keys, { contact, ttl: job.ttl, topic: job.kind });
    await db.rpc('push_done', { p_key: key, p_id: job.id, p_result: r.result, p_error: r.result === 'failed' ? r.error : null });
    if (r.result === 'sent') sent++;
    else if (r.result === 'gone') gone++;
    else failed++;
  }
  return json({ ok: true, sent, gone, failed });
});
