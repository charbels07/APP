/**
 * Server function "caa-billing" (Supabase Edge Function, Deno): writes who has paid.
 *
 * Two callers, the same work: ask RevenueCat's own servers what an account has bought, then write it
 * in the database (`billing_record`, for the server's key only). What a caller says is never written.
 *  - RevenueCat's webhook (a purchase, a renewal, a cancellation, a refund, an expiry), recognised by
 *    the secret set in RevenueCat → Integrations → Webhooks → "Authorization header value".
 *  - The app, just after a purchase or "Restore purchases", with the person's sign-in token: only that
 *    person's account is looked up.
 *
 * The RevenueCat app user id is the Supabase account id (the app calls Purchases.logIn with it).
 *
 * Secrets (Supabase → Edge Functions → Secrets):
 *   REVENUECAT_SECRET_KEY    RevenueCat → Project settings → API keys → a secret key (v1)
 *   REVENUECAT_WEBHOOK_AUTH  any long random text, the same as in RevenueCat's webhook settings
 * Deploy with "Verify JWT" off (RevenueCat has no sign-in token; this function checks both callers):
 *   supabase functions deploy caa-billing --no-verify-jwt
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ENTITLEMENTS = ['family', 'pro'] as const;

/** Same length and same characters, without stopping at the first difference. */
function sameSecret(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

interface RcEntitlement {
  expires_date: string | null;
  product_identifier: string;
}
interface RcSubscription {
  store?: string;
  unsubscribe_detected_at?: string | null;
  billing_issues_detected_at?: string | null;
  refunded_at?: string | null;
}

/** What RevenueCat knows of this account, written in the database. */
async function record(db: ReturnType<typeof createClient>, userId: string, rcKey: string): Promise<'done' | 'revenuecat'> {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${rcKey}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) return 'revenuecat';
  const body = (await res.json()) as { subscriber?: { entitlements?: Record<string, RcEntitlement>; subscriptions?: Record<string, RcSubscription>; non_subscriptions?: Record<string, { store?: string }[]> } };
  const sub = body.subscriber ?? {};
  for (const name of ENTITLEMENTS) {
    const e = sub.entitlements?.[name];
    if (!e) continue;
    const s = sub.subscriptions?.[e.product_identifier];
    const one = sub.non_subscriptions?.[e.product_identifier]?.[0];
    const store = s?.store ?? one?.store ?? 'other';
    // A refunded purchase ends now.
    const expires = s?.refunded_at ? s.refunded_at : e.expires_date;
    const renews = !!s && !s.unsubscribe_detected_at && !s.billing_issues_detected_at && !s.refunded_at;
    const { error } = await db.rpc('billing_record', {
      p_user: userId,
      p_entitlement: name,
      p_expires: expires,
      p_renews: renews,
      p_store: store,
      p_product: e.product_identifier,
    });
    if (error) throw error;
  }
  return 'done';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-client-info' } });
  }
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const url = Deno.env.get('SUPABASE_URL');
  const serverKey = Deno.env.get('SUPABASE_SECRET_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const rcKey = Deno.env.get('REVENUECAT_SECRET_KEY');
  const hook = Deno.env.get('REVENUECAT_WEBHOOK_AUTH') ?? '';
  if (!url || !serverKey || !rcKey) return json({ error: 'not_configured' }, 503);
  const db = createClient(url, serverKey, { auth: { persistSession: false } });
  const auth = req.headers.get('authorization') ?? '';

  let users: string[] = [];
  if (hook.length >= 24 && sameSecret(auth, hook)) {
    // RevenueCat's webhook: the accounts the event is about (the ids that are our account ids).
    const body = (await req.json().catch(() => ({}))) as { event?: { app_user_id?: string; original_app_user_id?: string; aliases?: string[]; transferred_to?: string[]; transferred_from?: string[] } };
    const e = body.event ?? {};
    users = [e.app_user_id, e.original_app_user_id, ...(e.aliases ?? []), ...(e.transferred_to ?? []), ...(e.transferred_from ?? [])]
      .filter((id): id is string => typeof id === 'string' && UUID.test(id));
  } else {
    // The app: the person's own account only.
    const token = auth.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'unauthorized' }, 401);
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return json({ error: 'unauthorized' }, 401);
    users = [data.user.id];
  }

  try {
    for (const id of [...new Set(users)].slice(0, 10)) {
      if ((await record(db, id, rcKey)) === 'revenuecat') return json({ error: 'revenuecat' }, 502);
    }
  } catch {
    return json({ error: 'database' }, 502);
  }
  return json({ ok: true });
});
