-- Payment (owner's decisions, November 2026: gap review Q28, Q44–Q46, and a free week before paying).
-- Sold in the App Store and Google Play only, through RevenueCat. The database decides, never the app:
--
--   1. Off until the owner switches it on (`billing_config.live`): before that nothing changes for anyone.
--      To switch it on, in the SQL Editor:  select public.billing_go_live();
--   2. A family pays for its children (the account that owns the child's profile):
--        never subscribed   days 1–7 the free week (no card), nothing blocked;
--        subscription ended days 1–7 nothing blocked, a reminder every day;
--        then               days 8–14 everything paused except the child talking;
--        then               the board is frozen, the child still talks, for good.
--      "Paused" and "frozen" refuse the same things: changes to the board, sending photos and recordings,
--      follow-up, the team (invitations, requests, new members, tablet codes) and copies made by hand.
--      Nothing is deleted meanwhile; paying gives everything back at once. Reading, opening, leaving a
--      team, deleting, "Download all my data" and handing the child to the other parent are never refused.
--      The child's voice never needs the server.
--   3. A professional pays once (her licence) to be on a child's team as a therapist or a teacher
--      (`pro_paid`, the one place batch 4 kept for it). Her own draft boards are not the family's to pay.
--   4. Who has paid is only written by the server function caa-billing, with RevenueCat's answer
--      (never what the app says): `billing_record`, for the server's key only.
--   5. A daily notification to the parent who pays (18:00 on that device), never with a child's name.
--
-- The app keeps working before this file is run (`missingFunction` fallbacks: payment is "free").
-- Safe to run once; check with supabase/check-migrations.sql.

-- ───────────────────────── 1. Switch and purchases ─────────────────────────

create table public.billing_config (
  one boolean primary key default true check (one),
  live boolean not null default false,
  live_since timestamptz
);
insert into public.billing_config default values;
alter table public.billing_config enable row level security;
revoke all on public.billing_config from public, anon, authenticated;

-- One line per account and entitlement, as RevenueCat last told it. An ended subscription stays (its
-- end date says that the family had subscribed: 7 days without blocking, not a free week).
create table public.billing_entitlements (
  user_id uuid not null references auth.users (id) on delete cascade,
  entitlement text not null check (entitlement in ('family', 'pro')),
  -- null: never ends (the professional's licence, or a family given the app for good)
  expires_at timestamptz,
  renews boolean not null default false,
  store text not null default 'other' check (store in ('app_store', 'play_store', 'other')),
  product_id text not null default '' check (length(product_id) <= 200),
  updated_at timestamptz not null default now(),
  primary key (user_id, entitlement)
);
alter table public.billing_entitlements enable row level security;
revoke all on public.billing_entitlements from public, anon, authenticated;

-- For the owner, in the SQL Editor. Families who never subscribed start their free week today.
create function public.billing_go_live() returns text
language sql security definer set search_path = public as $$
  update billing_config set live = true, live_since = coalesce(live_since, now());
  select 'Payment is on since ' || to_char(live_since, 'YYYY-MM-DD HH24:MI') || ' UTC.' from billing_config;
$$;
create function public.billing_stop() returns text
language sql security definer set search_path = public as $$
  update billing_config set live = false;
  select 'Payment is off: nothing is blocked for anyone.'::text;
$$;
revoke execute on function public.billing_go_live() from public, anon, authenticated, service_role;
revoke execute on function public.billing_stop() from public, anon, authenticated, service_role;

-- ───────────────────────── 2. Where a family stands ─────────────────────────

-- The same rule as src/lib/billing.ts (billingStatus). `p_owner`: the account that owns the child.
create function public.billing_for(p_owner uuid)
returns table (status text, until_at timestamptz, renews boolean, live boolean)
language sql stable security definer set search_path = public as $$
  with c as (select b.live, b.live_since from billing_config b),
  a as (select x.created_at, x.role from accounts x where x.id = p_owner),
  e as (select coalesce(x.expires_at, 'infinity'::timestamptz) as ends, x.renews
          from billing_entitlements x where x.user_id = p_owner and x.entitlement = 'family'),
  f as (select c.live, a.role, e.ends, coalesce(e.renews, false) as renews,
               case when e.ends is not null then greatest(e.ends, coalesce(c.live_since, '-infinity'))
                    else greatest(coalesce(a.created_at, now()), coalesce(c.live_since, '-infinity')) end as start_at
          from c left join a on true left join e on true)
  select case when not f.live or f.role = 'pro' then 'free'
              when f.ends > now() then 'paid'
              when now() < f.start_at + interval '7 days' then case when f.ends is null then 'trial' else 'grace' end
              when now() < f.start_at + interval '14 days' then 'paused'
              else 'frozen' end,
         case when not f.live or f.role = 'pro' then null
              when f.ends > now() then nullif(f.ends, 'infinity')
              when now() < f.start_at + interval '7 days' then f.start_at + interval '7 days'
              when now() < f.start_at + interval '14 days' then f.start_at + interval '14 days' end,
         f.live and f.ends > now() and f.renews,
         f.live
    from f
$$;
revoke execute on function public.billing_for(uuid) from public, anon, authenticated;

-- Changes to this child's board and team are refused (paused or frozen).
create function public.billing_blocks(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select b.status in ('paused', 'frozen')
                     from profiles p cross join lateral billing_for(p.owner_id) b where p.id = p_profile), false)
$$;
revoke execute on function public.billing_blocks(uuid) from public, anon, authenticated;

-- For the screens: where this child's board stands, and whether I am the one who pays.
create function public.billing_state(p_profile uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  r record;
  o uuid;
begin
  if not can_read(p_profile) then raise exception 'forbidden'; end if;
  select owner_id into o from profiles where id = p_profile;
  select * into r from billing_for(o);
  return jsonb_build_object('status', coalesce(r.status, 'free'), 'live', coalesce(r.live, false),
                            'until', r.until_at, 'renews', coalesce(r.renews, false),
                            'payer', o = auth.uid() and not is_tablet());
end $$;
revoke execute on function public.billing_state(uuid) from public, anon;
grant execute on function public.billing_state(uuid) to authenticated;

-- My own purchases (the Account page, the professional's licence).
create function public.billing_mine() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'live', (select live from billing_config),
    'family', (select jsonb_build_object('until', e.expires_at, 'renews', e.renews, 'store', e.store)
                 from billing_entitlements e where e.user_id = auth.uid() and e.entitlement = 'family'),
    'pro', exists (select 1 from billing_entitlements e where e.user_id = auth.uid() and e.entitlement = 'pro'
                                                       and (e.expires_at is null or e.expires_at > now())))
  where auth.uid() is not null
$$;
revoke execute on function public.billing_mine() from public, anon;
grant execute on function public.billing_mine() to authenticated;

-- Written by caa-billing only, with what RevenueCat says about this account (its own servers' answer).
create function public.billing_record(p_user uuid, p_entitlement text, p_expires timestamptz, p_renews boolean,
                                      p_store text, p_product text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_entitlement not in ('family', 'pro') then raise exception 'bad_entitlement'; end if;
  if not exists (select 1 from auth.users where id = p_user) then return; end if;
  insert into billing_entitlements (user_id, entitlement, expires_at, renews, store, product_id, updated_at)
  values (p_user, p_entitlement, p_expires, coalesce(p_renews, false),
          case when p_store in ('app_store', 'play_store') then p_store else 'other' end, left(coalesce(p_product, ''), 200), now())
  on conflict (user_id, entitlement) do update
    set expires_at = excluded.expires_at, renews = excluded.renews, store = excluded.store,
        product_id = excluded.product_id, updated_at = now();
end $$;
revoke execute on function public.billing_record(uuid, text, timestamptz, boolean, text, text) from public, anon, authenticated;
grant execute on function public.billing_record(uuid, text, timestamptz, boolean, text, text) to service_role;

-- ───────────────────────── 3. What is refused while paused or frozen ─────────────────────────

-- Only a person's request is checked (the server's own jobs have no person), never the app's team.
-- `TG_ARGV[0]`: the column holding the child's profile.
create function public.billing_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  row_ jsonb := to_jsonb(new);
  pid uuid := (row_ ->> tg_argv[0])::uuid;
begin
  if auth.uid() is null or is_admin() then return new; end if;
  -- Handing the child to the other parent (who may be the one to pay) is never refused.
  if tg_table_name in ('invitations', 'members') and row_ ->> 'role' = 'parent' then return new; end if;
  if tg_table_name = 'profiles' and tg_op = 'INSERT' then
    if exists (select 1 from billing_for(new.owner_id) b where b.status in ('paused', 'frozen')) then
      raise exception 'payment_needed';
    end if;
    return new;
  end if;
  if billing_blocks(pid) then raise exception 'payment_needed'; end if;
  return new;
end $$;
revoke execute on function public.billing_guard() from public, anon, authenticated;

create trigger billing_guard before insert on public.profiles
  for each row execute function public.billing_guard('id');
create trigger billing_guard_data before update of data on public.profiles
  for each row when (old.data is distinct from new.data) execute function public.billing_guard('id');
create trigger billing_guard before insert or update on public.usage_days
  for each row execute function public.billing_guard('profile_id');
create trigger billing_guard before insert or update on public.observations
  for each row execute function public.billing_guard('profile_id');
create trigger billing_guard before insert on public.invitations
  for each row execute function public.billing_guard('profile_id');
create trigger billing_guard before insert or update on public.members
  for each row when (new.status = 'active') execute function public.billing_guard('profile_id');
create trigger billing_guard before insert on public.pairing_codes
  for each row execute function public.billing_guard('profile_id');
create trigger billing_guard before insert on public.profile_snapshots
  for each row execute function public.billing_guard('profile_id');

-- Photos and recordings: sending waits too (the storage rule asks can_send_media).
create or replace function public.can_send_media(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not public.billing_blocks(p_profile)
     and coalesce((select a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false) or a.level >= 3
                          or (a.level >= 2 and (coalesce(a.perms -> 'proposeVocabulary' = 'true'::jsonb, false)
                                                or coalesce(a.perms -> 'createMaterials' = 'true'::jsonb, false))
                              and (select count(*) < 100
                                          and coalesce(sum(case when jsonb_typeof(o.metadata -> 'size') = 'number'
                                                                then (o.metadata ->> 'size')::numeric::bigint else 0 end), 0) < 20971520
                                     from storage.objects o
                                    where o.bucket_id = 'profile-media' and o.owner = auth.uid()
                                      and o.name like p_profile::text || '/%' and o.created_at > now() - interval '30 days'))
                     from public.access_of(p_profile) a), false)
$$;

-- ───────────────────────── 4. The professional's licence ─────────────────────────

create or replace function public.pro_paid(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_user is not null
     and (not coalesce((select live from billing_config), false)
          or exists (select 1 from billing_entitlements e where e.user_id = p_user and e.entitlement = 'pro'
                                                         and (e.expires_at is null or e.expires_at > now())))
$$;
revoke execute on function public.pro_paid(uuid) from public, anon, authenticated;

-- ───────────────────────── 5. The daily reminder ─────────────────────────

alter table public.push_subs add column billing_reminded_on date;
alter table public.push_out drop constraint push_out_kind_check;
alter table public.push_out add constraint push_out_kind_check check (kind in ('reminder', 'idea', 'billing_trial', 'billing'));

create or replace function public.push_words(p_kind text, p_lang text) returns table (title text, body text)
language sql immutable as $$
  select case when p_kind in ('reminder', 'billing_trial', 'billing') then 'Daleth AAC'
              else case p_lang when 'en' then 'A new idea to vote on' when 'ar' then 'فكرة جديدة للتصويت' else 'Une nouvelle idée à voter' end
         end,
         case p_kind
           when 'reminder' then case p_lang
             when 'en' then 'The board has not been opened yet today. A few minutes together make a difference.'
             when 'ar' then 'لم يُفتح اللوح اليوم بعد. بضع دقائق معًا تُحدث فرقًا.'
             else 'Le tableau n’a pas encore été ouvert aujourd’hui. Quelques minutes ensemble font la différence.' end
           when 'billing_trial' then case p_lang
             when 'en' then 'The free week is ending. To keep changing the board, subscribe in the Daleth AAC app (My account).'
             when 'ar' then 'الأسبوع المجاني ينتهي. لمواصلة تعديل اللوح، اشترك في تطبيق Daleth AAC (حسابي).'
             else 'La semaine gratuite se termine. Pour continuer à modifier le tableau, abonnez-vous dans l’app Daleth AAC (Mon compte).' end
           when 'billing' then case p_lang
             when 'en' then 'The subscription has ended. The child can still talk; subscribe again in the Daleth AAC app (My account) to keep everything else.'
             when 'ar' then 'انتهى الاشتراك. ما زال الطفل يستطيع التكلّم؛ جدّد الاشتراك في تطبيق Daleth AAC (حسابي) للاحتفاظ بكل شيء آخر.'
             else 'L’abonnement est terminé. L’enfant peut toujours parler ; réabonnez-vous dans l’app Daleth AAC (Mon compte) pour garder tout le reste.' end
           else ''
         end
$$;
revoke execute on function public.push_words(text, text) from public, anon, authenticated;

-- Once a day (18:00 on that device): the parent who pays for a child whose free week ends in 3 days
-- or less, or whose subscription ended less than 14 days ago. Never a child's name. Not after day 14.
create function public.billing_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if not coalesce((select live from billing_config), false) then return 0; end if;
  with due as (
    select s.id, s.lang, (now() at time zone s.tz)::date as today,
           case when b.status = 'trial' then 'billing_trial' else 'billing' end as kind
      from push_subs s join accounts a on a.id = s.user_id
      cross join lateral billing_for(s.user_id) b
     where a.role = 'parent'
       and exists (select 1 from profiles p where p.owner_id = s.user_id and p.deleted_at is null)
       and (b.status in ('grace', 'paused') or (b.status = 'trial' and b.until_at < now() + interval '3 days'))
       and extract(hour from now() at time zone s.tz) = 18
       and s.billing_reminded_on is distinct from (now() at time zone s.tz)::date
  ), marked as (
    update push_subs s set billing_reminded_on = d.today from due d where s.id = d.id returning s.id, d.lang, d.kind
  )
  insert into push_out (sub_id, kind, title, body, expires_at)
  select m.id, m.kind, w.title, w.body, now() + interval '3 hours'
    from marked m cross join lateral push_words(m.kind, m.lang) w;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.billing_reminders() from public, anon, authenticated;

create or replace function public.push_tick() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform push_reminders();
  perform billing_reminders();
  if not exists (select 1 from push_config)
     or exists (select 1 from push_out where done_at is null and tries < 5 and expires_at > now()) then
    perform push_poke();
  end if;
end $$;
revoke execute on function public.push_tick() from public, anon, authenticated;

-- ───────────────────────── 6. "Download all my data" includes the purchases ─────────────────────────

create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
  mine uuid[];
  pro boolean;
begin
  if me is null or is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('export', 10, interval '1 day');
  pro := is_pro(me);
  select coalesce(array_agg(id), '{}') into mine from profiles where owner_id = me and pro_cleared(me);
  return jsonb_build_object(
    'exportedAt', now(),
    'format', 'daleth-aac/export-1',
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'phone', u.phone, 'createdAt', u.created_at,
                                          'lastSignInAt', u.last_sign_in_at, 'type', a.role, 'name', a.display_name, 'preferences', a.prefs)
                  from auth.users u left join accounts a on a.id = u.id where u.id = me),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) - 'user_id' order by c.accepted_at), '[]') from consents c where c.user_id = me),
    'children', (select coalesce(jsonb_agg(case when pro then to_jsonb(p) || jsonb_build_object('data', no_code(p.data)) else to_jsonb(p) end
                                           order by p.name), '[]') from profiles p where p.id = any (mine)),
    'teams', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from members m where m.profile_id = any (mine) or m.user_id = me),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]') from invitations i
                     where i.profile_id = any (mine) or i.from_user_id = me or i.to_user_id = me),
    'proposals', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]') from proposals x where x.profile_id = any (mine) or x.author_id = me),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at), '[]') from history h where h.profile_id = any (mine)),
    'devices', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at), '[]') from devices d where d.profile_id = any (mine) or d.user_id = me),
    'followUpDays', (select coalesce(jsonb_agg(jsonb_build_object('profileId', u.profile_id, 'device', u.device_id, 'day', u.day)
                                                || u.data || case when u.samples_sealed is null then '{}'::jsonb
                                                                  else jsonb_build_object('samples', private.unseal(u.samples_sealed)::jsonb) end
                                                order by u.day), '[]')
                       from usage_days u where u.profile_id = any (mine)),
    'observations', (select coalesce(jsonb_agg(to_jsonb(o) - 'utterance_sealed' - 'note_sealed' - 'context_sealed' - 'partner_sealed' - 'result_sealed'
                                               || jsonb_build_object('utterance', private.unseal(o.utterance_sealed), 'note', private.unseal(o.note_sealed),
                                                                     'context', private.unseal(o.context_sealed), 'partner', private.unseal(o.partner_sealed),
                                                                     'result', private.unseal(o.result_sealed))
                                               order by o.at), '[]')
                       from observations o where o.profile_id = any (mine) or (o.created_by = me and can_view_data(o.profile_id))),
    'featureCounts', (select coalesce(jsonb_agg(to_jsonb(f) order by f.day), '[]') from feature_days f where f.profile_id = any (mine)),
    'boardCopies', (select coalesce(jsonb_agg(jsonb_build_object('profileId', s.profile_id, 'createdAt', s.created_at, 'reason', s.reason,
                                                                 'board', case when pro then no_code(s.data) else s.data end) order by s.created_at), '[]')
                      from profile_snapshots s where s.profile_id = any (mine)),
    'notices', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]') from notices n where n.user_id = me),
    'verification', (select to_jsonb(v) from verifications v where v.user_id = me),
    'materials', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') from resources r where r.owner_id = me),
    'messagesToTheTeam', (select coalesce(jsonb_agg(to_jsonb(f) - 'user_id' order by f.created_at), '[]') from feedback f where f.user_id = me),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('idea', r.title, 'at', v.created_at)), '[]')
                from roadmap_votes v join roadmap r on r.id = v.item_id where v.user_id = me),
    'notificationDevices', (select coalesce(jsonb_agg(jsonb_build_object('since', s.created_at, 'lastOpened', s.seen_at, 'language', s.lang, 'timeZone', s.tz,
                                                                         'service', substring(s.endpoint from '^https://([^/]+)/'),
                                                                         'lastReminder', s.reminded_on, 'lastPaymentReminder', s.billing_reminded_on)
                                                      order by s.created_at), '[]')
                              from push_subs s where s.user_id = me),
    'boardLastOpened', (select coalesce(jsonb_agg(jsonb_build_object('profileId', v.profile_id, 'at', v.seen_at)), '[]')
                          from profile_seen v where v.profile_id = any (mine)),
    'purchases', (select coalesce(jsonb_agg(jsonb_build_object('what', e.entitlement, 'until', e.expires_at, 'renews', e.renews,
                                                               'store', e.store, 'product', e.product_id, 'updatedAt', e.updated_at)
                                            order by e.entitlement), '[]')
                    from billing_entitlements e where e.user_id = me),
    'notIncluded', 'Photos and recordings: they are files, kept in the app (each device, and the private storage of the child''s profile). Sign-in records kept by the sign-in service are given on request. Payment details (card, receipts) are kept by Apple or Google and by RevenueCat, not by us.');
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
