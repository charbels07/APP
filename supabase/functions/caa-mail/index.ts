/**
 * Server function "caa-mail" (Supabase Edge Function, Deno): the postman of the app's team.
 *
 * The database writes the e-mails for the team (a professional applied, the figures of the
 * week) in its table `team_mail`, then calls this function. The function asks the database for
 * the waiting messages, sends them through the mailbox that already sends the sign-in codes,
 * and tells the database which ones left.
 *
 * It cannot write a message nor choose what is in it: subject and text come from the database,
 * and they always go to one address, the team's (secret MAIL_TO).
 * It is called by the database only: the caller shows a key that the database made and checks
 * itself (`team_mail_take`); anything else gets "401" and nothing happens.
 *
 * Secrets (Supabase → Edge Functions → Secrets), never written in the code or in a chat:
 *   SMTP_USER  the mailbox that sends (the Gmail address of the app)
 *   SMTP_PASS  its app password (Google Account → Security → App passwords)
 *   MAIL_TO    where the team reads its e-mails (the same address if left out)
 *   SMTP_HOST  only for another provider than Gmail (default smtp.gmail.com, port 465)
 *
 * This function must be deployed with "Verify JWT" turned off (the database has no sign-in
 * token to show; the key above replaces it).
 *
 * To talk to the database it uses the server key that Supabase hands to every function by
 * itself: the new "secret key" (SUPABASE_SECRET_KEY) first, the older "service role" key
 * (SUPABASE_SERVICE_ROLE_KEY, retired in 2027) as a second try. Nothing to set for either.
 */
import nodemailer from 'npm:nodemailer@6.9.16';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SENDER_NAME = 'Daleth AAC';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The plain text as a simple page: titles in capitals become headings, "- " lines a list. */
export function htmlOf(text: string): string {
  const out: string[] = [];
  let list = false;
  const closeList = () => {
    if (list) out.push('</ul>');
    list = false;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('- ')) {
      if (!list) out.push('<ul style="margin:4px 0 12px;padding-left:20px">');
      list = true;
      out.push(`<li style="margin:3px 0">${escapeHtml(line.slice(2))}</li>`);
      continue;
    }
    closeList();
    if (!line) continue;
    const heading = line.length > 3 && line === line.toUpperCase() && /[A-Z]/.test(line);
    out.push(
      heading
        ? `<h3 style="margin:18px 0 4px;font-size:14px;letter-spacing:.04em;color:#1D4ED8">${escapeHtml(line)}</h3>`
        : `<p style="margin:8px 0">${escapeHtml(line)}</p>`,
    );
  }
  closeList();
  return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1F2937;max-width:560px">${out.join('')}</div>`;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  // The key the database made (64 letters and digits). Anything else stops here.
  const key = req.headers.get('x-mail-key') ?? '';
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ error: 'unauthorized' }, 401);

  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const url = Deno.env.get('SUPABASE_URL');
  const serverKeys = [Deno.env.get('SUPABASE_SECRET_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter((k): k is string => !!k);
  if (!user || !pass || !url || !serverKeys.length) return json({ error: 'not_configured' }, 503);
  const to = Deno.env.get('MAIL_TO') || user;

  // The database checks the caller's key and hands out the waiting messages (10 at most).
  // If the project no longer accepts one of the two server keys, the other one is tried.
  let db: ReturnType<typeof createClient> | null = null;
  let waiting: { id: string; subject: string; body: string }[] = [];
  for (const serverKey of serverKeys) {
    const client = createClient(url, serverKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: mails, error } = await client.rpc('team_mail_take', { p_key: key });
    if (!error) {
      db = client;
      waiting = (mails ?? []) as typeof waiting;
      break;
    }
    // "forbidden" is the database's own answer to a wrong caller key: no second try.
    if (/forbidden/.test(error.message ?? '')) return json({ error: 'unauthorized' }, 401);
  }
  if (!db) return json({ error: 'unavailable' }, 503);
  if (!waiting.length) return json({ sent: 0, failed: 0 });

  const transport = nodemailer.createTransport({
    host: Deno.env.get('SMTP_HOST') || 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  let sent = 0;
  let failed = 0;
  for (const mail of waiting) {
    try {
      await transport.sendMail({
        from: { name: SENDER_NAME, address: user },
        to,
        subject: mail.subject,
        text: mail.body,
        html: htmlOf(mail.body),
      });
      await db.rpc('team_mail_done', { p_key: key, p_id: mail.id, p_error: null });
      sent++;
    } catch (e) {
      // The reason is kept for the owner of the project (team_mail_check); the message is tried again later.
      const reason = e instanceof Error ? e.message : String(e);
      await db.rpc('team_mail_done', { p_key: key, p_id: mail.id, p_error: reason.slice(0, 300) });
      failed++;
    }
  }
  return json({ sent, failed });
});
