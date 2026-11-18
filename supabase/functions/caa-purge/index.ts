/**
 * Server function "caa-purge" (Supabase Edge Function, Deno): deletes stored files that belonged
 * to something erased (an account, a child's profile, a professional's document).
 *
 * The database writes what to delete in its queue `storage_purge`, then calls this function
 * (supabase/migrations/20261118000100_storage_purge.sql). The function asks the database for the
 * waiting work, deletes the files through the Storage service with the server's own key, and tells
 * the database which ones are done. It cannot choose what to delete: the folders and files come
 * from the database, and only from the two private buckets, one person's or one child's folder.
 *
 * Called by the database only: the caller shows the key the database made (`team_mail_config`, the
 * same key as caa-mail) and the database checks it (`storage_purge_take`); anything else gets
 * "401" and nothing happens.
 *
 * Deploy with "Verify JWT" turned off (the database has no sign-in token to show):
 *   supabase functions deploy caa-purge --no-verify-jwt
 * Nothing to set: the server key is handed to every function by Supabase itself
 * (SUPABASE_SECRET_KEY, or the older SUPABASE_SERVICE_ROLE_KEY).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Db = ReturnType<typeof createClient>;

/** Every file under a folder (sub-folders included), as full paths. */
async function filesUnder(db: Db, bucket: string, folder: string): Promise<string[]> {
  const out: string[] = [];
  const queue = [folder.replace(/\/$/, '')];
  while (queue.length && out.length < 5000) {
    const dir = queue.shift()!;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db.storage.from(bucket).list(dir, { limit: 1000, offset });
      if (error) throw error;
      for (const item of data ?? []) {
        const path = `${dir}/${item.name}`;
        // A folder has no id in the Storage listing.
        if (item.id === null) queue.push(path);
        else out.push(path);
      }
      if (!data || data.length < 1000) break;
    }
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const key = req.headers.get('x-mail-key') ?? '';
  if (!/^[0-9a-f]{64}$/.test(key)) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const serverKeys = [Deno.env.get('SUPABASE_SECRET_KEY'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')].filter((k): k is string => !!k);
  if (!url || !serverKeys.length) return json({ error: 'not_configured' }, 503);

  // The database checks the caller's key and hands out the waiting work.
  let db: Db | null = null;
  let jobs: { id: string; bucket: string; path: string }[] = [];
  for (const serverKey of serverKeys) {
    const client = createClient(url, serverKey, { auth: { persistSession: false } });
    const { data, error } = await client.rpc('storage_purge_take', { p_key: key });
    if (!error) {
      db = client;
      jobs = (data ?? []) as typeof jobs;
      break;
    }
    if (/forbidden/.test(error.message)) return json({ error: 'unauthorized' }, 401);
  }
  if (!db) return json({ error: 'database' }, 502);

  let done = 0;
  for (const job of jobs) {
    // Only the two private buckets, only "<uuid>/" or "<uuid>/<file>" (the database checks it too).
    if (!['verification-docs', 'profile-media'].includes(job.bucket) || !/^[0-9a-f-]{36}\/([^/]{1,255})?$/.test(job.path)) {
      await db.rpc('storage_purge_done', { p_key: key, p_id: job.id, p_error: 'refused' });
      continue;
    }
    try {
      const paths = job.path.endsWith('/') ? await filesUnder(db, job.bucket, job.path) : [job.path];
      for (let i = 0; i < paths.length; i += 100) {
        const { error } = await db.storage.from(job.bucket).remove(paths.slice(i, i + 100));
        if (error) throw error;
      }
      await db.rpc('storage_purge_done', { p_key: key, p_id: job.id, p_error: null });
      done++;
    } catch (e) {
      await db.rpc('storage_purge_done', { p_key: key, p_id: job.id, p_error: String((e as Error)?.message ?? e).slice(0, 300) });
    }
  }
  return json({ ok: true, done, of: jobs.length });
});
