-- Notifications outside the app (browser notifications, "Web Push").
--
-- Until now a notice was only a line inside the app. A person who has not opened the app sees
-- nothing: this file lets the server reach the devices on which that person said yes.
--
--   1. The devices: one line per browser that accepted notifications (push_subs). The address and
--      the two keys come from the browser itself; only the notification services of the browsers
--      are accepted as addresses (the server function posts there).
--   2. The sending: the database writes each notification in a queue (push_out), already worded in
--      the device's language, then wakes the server function "caa-push", which only delivers
--      (same postman pattern and same caller key as caa-mail and caa-purge). The pair of keys that
--      signs the notifications is made by the function the first time it runs; the private half is
--      sealed (private.seal) and never reaches the app.
--   3. The 12:00 reminder for parents whose child's board was not opened today (profile_seen says
--      when a board was last opened by the family: one moment per child, nothing else).
--   4. Ideas put to the vote get an audience (parents, professionals, or both); a new idea is
--      announced to that audience, in the app and by notification.
--
-- A notification never carries a child's name, a word or a sentence.
-- Needs: the function caa-push deployed with "Verify JWT" off, team_mail_connect() already run,
-- pg_net and pg_cron. Without them the app works as before and simply does not offer notifications.

-- ───────────────────────── 1. The signing keys ─────────────────────────

create table public.push_config (
  one boolean primary key default true check (one),
  -- 65 bytes, base64url: what a browser needs to accept notifications from this server.
  public_key text not null check (public_key ~ '^[A-Za-z0-9_-]{87}$'),
  private_sealed bytea not null,
  created_at timestamptz not null default now()
);
alter table public.push_config enable row level security;
revoke all on public.push_config from public, anon, authenticated;

-- The public half, for a signed-in person's browser. Null until the server function made the keys:
-- the app then offers nothing.
create function public.push_key() returns text
language sql stable security definer set search_path = public as $$
  select public_key from push_config where auth.uid() is not null and not is_tablet()
$$;
revoke execute on function public.push_key() from public, anon;
grant execute on function public.push_key() to authenticated;

-- For the server function only (the caller's key is checked): both halves.
create function public.push_keys(p_key text) returns table (public_key text, private_key text)
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  return query select c.public_key, private.unseal(c.private_sealed) from push_config c;
end $$;

-- Written once, by the server function, the first time it runs. Never replaced: every device that
-- accepted notifications is tied to this pair.
create function public.push_keys_set(p_key text, p_public text, p_private text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  if p_public !~ '^[A-Za-z0-9_-]{87}$' or p_private !~ '^[A-Za-z0-9_-]{43}$' then raise exception 'invalid'; end if;
  insert into push_config (public_key, private_sealed) values (p_public, private.seal(p_private)) on conflict do nothing;
end $$;
revoke execute on function public.push_keys(text) from public, anon, authenticated;
revoke execute on function public.push_keys_set(text, text, text) from public, anon, authenticated;
grant execute on function public.push_keys(text) to service_role;
grant execute on function public.push_keys_set(text, text, text) to service_role;

-- ───────────────────────── 2. The devices that said yes ─────────────────────────

create table public.push_subs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  -- The language of the menus on that device, and its time zone (for "12:00").
  lang text not null default 'fr' check (lang in ('fr', 'en', 'ar')),
  tz text not null default 'UTC',
  created_at timestamptz not null default now(),
  -- The app says "still here" when it opens.
  seen_at timestamptz not null default now(),
  -- The day (of that device) the reminder was last sent: once a day at most.
  reminded_on date
);
create index on public.push_subs (user_id);
alter table public.push_subs enable row level security;
revoke all on public.push_subs from public, anon, authenticated;

-- Only the notification services of the browsers (Chrome and the browsers built on it, Firefox,
-- Safari, Edge): the server function posts to this address, it must never be any address.
create function public.push_endpoint_ok(p text) returns boolean
language sql immutable as $$
  select p is not null and length(p) <= 1000 and
         p ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9-]+\.push\.apple\.com|[a-z0-9-]+\.notify\.windows\.com)/[^[:space:]]+$'
$$;

create function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text, p_lang text default 'fr', p_tz text default 'UTC')
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
begin
  -- A child's tablet (linked with a code) receives no notification.
  if me is null or is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not push_endpoint_ok(p_endpoint) then raise exception 'invalid' using detail = 'endpoint'; end if;
  if coalesce(p_p256dh, '') !~ '^[A-Za-z0-9_-]{87}$' or coalesce(p_auth, '') !~ '^[A-Za-z0-9_-]{22}$' then
    raise exception 'invalid' using detail = 'keys';
  end if;
  perform rate_limit('push', 40, interval '1 day');
  insert into push_subs (user_id, endpoint, p256dh, auth, lang, tz)
  values (me, p_endpoint, p_p256dh, p_auth,
          case when p_lang in ('fr', 'en', 'ar') then p_lang else 'fr' end,
          coalesce((select name from pg_timezone_names where name = p_tz), 'UTC'))
  on conflict (endpoint) do update
    -- The same browser, another person signed in: the notifications follow the person who is there now.
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        lang = excluded.lang, tz = excluded.tz, seen_at = now(),
        reminded_on = case when push_subs.user_id = excluded.user_id then push_subs.reminded_on end;
  -- Ten devices per person at most: the oldest leave.
  delete from push_subs s where s.user_id = me
     and s.id not in (select k.id from push_subs k where k.user_id = me order by k.seen_at desc limit 10);
end $$;

create function public.push_unsubscribe(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subs where endpoint = p_endpoint and user_id = auth.uid()
$$;
revoke execute on function public.push_endpoint_ok(text) from public, anon;
revoke execute on function public.push_subscribe(text, text, text, text, text) from public, anon;
revoke execute on function public.push_unsubscribe(text) from public, anon;
grant execute on function public.push_subscribe(text, text, text, text, text) to authenticated;
grant execute on function public.push_unsubscribe(text) to authenticated;

-- ───────────────────────── 3. The queue and the server function ─────────────────────────

create table public.push_out (
  id uuid primary key default gen_random_uuid(),
  sub_id uuid not null references public.push_subs (id) on delete cascade,
  kind text not null check (kind in ('reminder', 'idea')),
  title text not null,
  body text not null,
  -- After this, the notification is not worth delivering any more (a 12:00 reminder at 21:00).
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  tries int not null default 0,
  last_try_at timestamptz,
  done_at timestamptz,
  error text
);
create index on public.push_out (created_at) where done_at is null;
alter table public.push_out enable row level security;
revoke all on public.push_out from public, anon, authenticated;

-- The function's address is the e-mail function's, with its own name. Without a connection (or
-- without pg_net) the work waits; nothing fails.
create function public.push_poke() returns void
language plpgsql security definer set search_path = public as $$
declare
  cfg team_mail_config;
begin
  select * into cfg from team_mail_config;
  if not found then return; end if;
  perform net.http_post(
    url := regexp_replace(cfg.function_url, '/caa-mail$', '/caa-push'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mail-key', cfg.key),
    timeout_milliseconds := 60000);
exception when others then
  null; -- tried again at the next quarter of an hour
end $$;
revoke execute on function public.push_poke() from public, anon, authenticated, service_role;

create function public.push_out_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from added) then perform push_poke(); end if;
  return null;
end $$;
create trigger push_out_added after insert on public.push_out
referencing new table as added
for each statement execute function public.push_out_added();
revoke execute on function public.push_out_added() from public, anon, authenticated;

-- The waiting notifications, 50 at most, each tried 5 times at most. The key is checked here.
create function public.push_take(p_key text)
returns table (id uuid, endpoint text, p256dh text, auth text, kind text, title text, body text, ttl int)
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  return query
    with taken as (
      update push_out o set tries = o.tries + 1, last_try_at = now()
       where o.id in (select w.id from push_out w
                       where w.done_at is null and w.tries < 5 and w.expires_at > now()
                         and (w.last_try_at is null or w.last_try_at < now() - interval '5 minutes')
                       order by w.created_at limit 50 for update skip locked)
      returning o.id, o.sub_id, o.kind, o.title, o.body, o.expires_at
    )
    select t.id, s.endpoint, s.p256dh, s.auth, t.kind, t.title, t.body,
           greatest(60, extract(epoch from t.expires_at - now())::int)
      from taken t join push_subs s on s.id = t.sub_id;
end $$;

-- What the notification service answered. "gone": the person removed the permission or the
-- browser; the device leaves the list (and its waiting notifications with it).
create function public.push_done(p_key text, p_id uuid, p_result text, p_error text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  if p_result = 'gone' then
    delete from push_subs where id = (select sub_id from push_out where id = p_id);
  elsif p_result = 'sent' then
    update push_out set done_at = now(), error = null where id = p_id;
  else
    update push_out set error = left(coalesce(p_error, 'failed'), 300) where id = p_id;
  end if;
end $$;
revoke execute on function public.push_take(text) from public, anon, authenticated;
revoke execute on function public.push_done(text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.push_take(text) to service_role;
grant execute on function public.push_done(text, uuid, text, text) to service_role;

-- ───────────────────────── 4. The 12:00 reminder ─────────────────────────

-- When a child's board was last opened by the family (a parent's device, the child's tablet).
-- One moment per child: no history of the days, no device, no person.
create table public.profile_seen (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.profile_seen enable row level security;
revoke all on public.profile_seen from public, anon, authenticated;

-- Said by an open board, a few times an hour at most. A professional looking at the board is not
-- the child using it: only the family's accounts and the child's tablets count.
create function public.board_seen(p_profile uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_read(p_profile) then raise exception 'forbidden'; end if;
  if is_pro(auth.uid()) then return; end if;
  insert into profile_seen (profile_id) values (p_profile)
  on conflict (profile_id) do update set seen_at = now()
    where profile_seen.seen_at < now() - interval '10 minutes';
end $$;
revoke execute on function public.board_seen(uuid) from public, anon;
grant execute on function public.board_seen(uuid) to authenticated;

-- The words of a notification, in the device's language. No name, no word of the child.
create function public.push_words(p_kind text, p_lang text) returns table (title text, body text)
language sql immutable as $$
  select case p_kind
           when 'reminder' then 'Empower'
           else case p_lang when 'en' then 'A new idea to vote on' when 'ar' then 'فكرة جديدة للتصويت' else 'Une nouvelle idée à voter' end
         end,
         case p_kind
           when 'reminder' then case p_lang
             when 'en' then 'The board has not been opened yet today. A few minutes together make a difference.'
             when 'ar' then 'لم يُفتح اللوح اليوم بعد. بضع دقائق معًا تُحدث فرقًا.'
             else 'Le tableau n’a pas encore été ouvert aujourd’hui. Quelques minutes ensemble font la différence.' end
           else ''
         end
$$;
revoke execute on function public.push_words(text, text) from public, anon, authenticated;

-- Every quarter of an hour: the parents' devices where it is between 12:00 and 13:00, not reminded
-- today, whose person did not switch the reminder off, and who have a child whose board was not
-- opened today (the day of that device). Returns how many reminders were written.
create function public.push_reminders() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  with due as (
    select s.id, s.lang, (now() at time zone s.tz)::date as today
      from push_subs s join accounts a on a.id = s.user_id
     where a.role = 'parent'
       and (a.prefs #>> '{notifications,reminder}') is distinct from 'false'
       and extract(hour from now() at time zone s.tz) = 12
       and s.reminded_on is distinct from (now() at time zone s.tz)::date
       and exists (
         select 1 from profiles p
          where p.deleted_at is null
            and (p.owner_id = s.user_id
                 or exists (select 1 from members m where m.profile_id = p.id and m.user_id = s.user_id
                                                      and m.role = 'parent' and m.status = 'active'))
            and not exists (select 1 from profile_seen v
                             where v.profile_id = p.id
                               and (v.seen_at at time zone s.tz)::date = (now() at time zone s.tz)::date))
  ), marked as (
    update push_subs s set reminded_on = d.today from due d where s.id = d.id returning s.id, d.lang
  )
  insert into push_out (sub_id, kind, title, body, expires_at)
  select m.id, 'reminder', w.title, w.body, now() + interval '3 hours'
    from marked m cross join lateral push_words('reminder', m.lang) w;
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.push_reminders() from public, anon, authenticated;

-- ───────────────────────── 5. Ideas put to the vote: who is asked ─────────────────────────

alter table public.roadmap add column audience text not null default 'all' check (audience in ('all', 'parent', 'pro'));

create or replace function public.roadmap_list()
returns table (id uuid, title jsonb, status text, votes int, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.status,
         (select count(*)::int from roadmap_votes v where v.item_id = r.id),
         exists (select 1 from roadmap_votes v where v.item_id = r.id and v.user_id = auth.uid())
    from roadmap r
   where r.status in ('open', 'planned') and auth.uid() is not null
     and (r.audience = 'all' or r.audience = (select a.role from accounts a where a.id = auth.uid()))
   order by r.created_at
$$;

-- An idea asked to the others does not exist for this person.
create or replace function public.roadmap_vote(p_item uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if not exists (select 1 from roadmap r where r.id = p_item and r.status in ('open', 'planned')
                    and (r.audience = 'all' or r.audience = (select a.role from accounts a where a.id = auth.uid()))) then
    raise exception 'not_found';
  end if;
  perform rate_limit('vote', 100, interval '1 day');
  if p_on then
    insert into roadmap_votes (item_id, user_id, role)
    values (p_item, auth.uid(), coalesce((select role from accounts where id = auth.uid()), ''))
    on conflict do nothing;
  else
    delete from roadmap_votes where item_id = p_item and user_id = auth.uid();
  end if;
end $$;

drop function public.admin_roadmap();
create function public.admin_roadmap()
returns table (id uuid, title jsonb, status text, votes int, parents int, pros int, created_at timestamptz, audience text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.id, r.title, r.status,
         (select count(*)::int from roadmap_votes v where v.item_id = r.id),
         (select count(*)::int from roadmap_votes v where v.item_id = r.id and v.role = 'parent'),
         (select count(*)::int from roadmap_votes v where v.item_id = r.id and v.role = 'pro'),
         r.created_at, r.audience
    from roadmap r
   order by (r.status = 'hidden'), (select count(*) from roadmap_votes v where v.item_id = r.id) desc, r.created_at;
end $$;
revoke execute on function public.admin_roadmap() from public, anon;
grant execute on function public.admin_roadmap() to authenticated;

-- A new idea: a line in the app for everyone it is asked to, and a notification on the devices
-- that accepted them (unless the person switched "New ideas to vote on" off). The title is the
-- team's own text, in the person's language when the team wrote it in that language.
create function public.roadmap_announce(p_id uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  r roadmap;
begin
  select * into r from roadmap where id = p_id;
  if not found then return; end if;
  insert into notices (user_id, kind, text, ref_id)
  select a.id, 'idea',
         'Nouvelle idée soumise au vote : ' || coalesce(nullif(r.title ->> (a.prefs ->> 'uiLang'), ''), nullif(r.title ->> 'fr', ''),
                                                         nullif(r.title ->> 'en', ''), r.title ->> 'ar'),
         r.id::text
    from accounts a join auth.users u on u.id = a.id
   where not coalesce(u.is_anonymous, false)
     and (r.audience = 'all' or a.role = r.audience);
  insert into push_out (sub_id, kind, title, body, expires_at)
  select s.id, 'idea', w.title,
         coalesce(nullif(r.title ->> s.lang, ''), nullif(r.title ->> 'en', ''), nullif(r.title ->> 'fr', ''), r.title ->> 'ar'),
         now() + interval '2 days'
    from push_subs s join accounts a on a.id = s.user_id
         cross join lateral push_words('idea', s.lang) w
   where (r.audience = 'all' or a.role = r.audience)
     and (a.prefs #>> '{notifications,ideas}') is distinct from 'false';
end $$;
revoke execute on function public.roadmap_announce(uuid) from public, anon, authenticated;

-- Adds an idea (p_id null) or changes its title, status or audience. `p_audience` null: unchanged
-- (everyone for a new idea). Only a new, open idea is announced.
create function public.admin_roadmap_save(p_id uuid, p_title jsonb, p_status text, p_audience text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t jsonb;
  id_ uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  t := jsonb_build_object('fr', left(trim(coalesce(p_title ->> 'fr', '')), 120),
                          'en', left(trim(coalesce(p_title ->> 'en', '')), 120),
                          'ar', left(trim(coalesce(p_title ->> 'ar', '')), 120));
  if t ->> 'fr' = '' and t ->> 'en' = '' and t ->> 'ar' = '' then raise exception 'invalid' using detail = 'title'; end if;
  if p_status not in ('open', 'planned', 'done', 'hidden') then raise exception 'invalid' using detail = 'status'; end if;
  if p_audience is not null and p_audience not in ('all', 'parent', 'pro') then raise exception 'invalid' using detail = 'audience'; end if;
  if p_id is null then
    insert into roadmap (title, status, audience) values (t, p_status, coalesce(p_audience, 'all')) returning id into id_;
    if p_status = 'open' then perform roadmap_announce(id_); end if;
  else
    update roadmap set title = t, status = p_status, audience = coalesce(p_audience, audience) where id = p_id returning id into id_;
    if id_ is null then raise exception 'not_found'; end if;
  end if;
  perform admin_note('roadmap', id_, left(coalesce(nullif(t ->> 'en', ''), nullif(t ->> 'fr', ''), t ->> 'ar'), 60), p_status);
  return id_;
end $$;
revoke execute on function public.admin_roadmap_save(uuid, jsonb, text, text) from public, anon;
grant execute on function public.admin_roadmap_save(uuid, jsonb, text, text) to authenticated;

-- An app that was not updated yet still calls the three-value form.
create or replace function public.admin_roadmap_save(p_id uuid, p_title jsonb, p_status text) returns uuid
language sql security definer set search_path = public as $$
  select admin_roadmap_save(p_id, p_title, p_status, null)
$$;

-- ───────────────────────── 6. "Download all my data" ─────────────────────────

-- The same as before, plus: the devices that accepted notifications (not their keys) and when
-- each child's board was last opened.
create or replace function public.export_my_data() returns jsonb
language plpgsql volatile security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
  mine uuid[];
begin
  if me is null or is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('export', 10, interval '1 day');
  select coalesce(array_agg(id), '{}') into mine from profiles where owner_id = me;
  return jsonb_build_object(
    'exportedAt', now(),
    'format', 'empower-communication/export-1',
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'phone', u.phone, 'createdAt', u.created_at,
                                          'lastSignInAt', u.last_sign_in_at, 'type', a.role, 'name', a.display_name, 'preferences', a.prefs)
                  from auth.users u left join accounts a on a.id = u.id where u.id = me),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) - 'user_id' order by c.accepted_at), '[]') from consents c where c.user_id = me),
    'children', (select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]') from profiles p where p.id = any (mine)),
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
    'observations', (select coalesce(jsonb_agg(to_jsonb(o) - 'utterance_sealed' - 'note_sealed'
                                               || jsonb_build_object('utterance', private.unseal(o.utterance_sealed), 'note', private.unseal(o.note_sealed))
                                               order by o.at), '[]')
                       from observations o where o.profile_id = any (mine) or o.created_by = me),
    'featureCounts', (select coalesce(jsonb_agg(to_jsonb(f) order by f.day), '[]') from feature_days f where f.profile_id = any (mine)),
    'boardCopies', (select coalesce(jsonb_agg(jsonb_build_object('profileId', s.profile_id, 'createdAt', s.created_at, 'reason', s.reason, 'board', s.data) order by s.created_at), '[]')
                      from profile_snapshots s where s.profile_id = any (mine)),
    'notices', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]') from notices n where n.user_id = me),
    'verification', (select to_jsonb(v) from verifications v where v.user_id = me),
    'materials', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') from resources r where r.owner_id = me),
    'messagesToTheTeam', (select coalesce(jsonb_agg(to_jsonb(f) - 'user_id' order by f.created_at), '[]') from feedback f where f.user_id = me),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('idea', r.title, 'at', v.created_at)), '[]')
                from roadmap_votes v join roadmap r on r.id = v.item_id where v.user_id = me),
    'notificationDevices', (select coalesce(jsonb_agg(jsonb_build_object('since', s.created_at, 'lastOpened', s.seen_at, 'language', s.lang, 'timeZone', s.tz,
                                                                         'service', substring(s.endpoint from '^https://([^/]+)/'),
                                                                         'lastReminder', s.reminded_on) order by s.created_at), '[]')
                              from push_subs s where s.user_id = me),
    'boardLastOpened', (select coalesce(jsonb_agg(jsonb_build_object('profileId', v.profile_id, 'at', v.seen_at)), '[]')
                          from profile_seen v where v.profile_id = any (mine)),
    'notIncluded', 'Photos and recordings: they are files, kept in the app (each device, and the private storage of the child''s profile). Sign-in records kept by the sign-in service are given on request.');
end $$;

-- ───────────────────────── 7. The clock ─────────────────────────

-- Every quarter of an hour: the reminders, then a wake-up of the server function when something
-- waits (or when the keys are not made yet).
create function public.push_tick() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform push_reminders();
  if not exists (select 1 from push_config)
     or exists (select 1 from push_out where done_at is null and tries < 5 and expires_at > now()) then
    perform push_poke();
  end if;
end $$;

-- Every night: delivered or expired notifications after 2 days; a device whose app has not been
-- opened for 12 months leaves the list.
create function public.push_tidy() returns void
language sql security definer set search_path = public as $$
  delete from push_out where created_at < now() - interval '2 days';
  delete from push_subs where seen_at < now() - interval '12 months';
$$;
revoke execute on function public.push_tick() from public, anon, authenticated;
revoke execute on function public.push_tidy() from public, anon, authenticated;

-- For the owner of the project, in the SQL Editor: select * from push_check();
create function public.push_check() returns table (what text, state text)
language plpgsql security definer set search_path = public as $$
begin
  return query select 'connection to the server functions (team_mail_connect)'::text,
    case when exists (select 1 from team_mail_config) then 'done' else 'TO DO' end;
  return query select 'signing keys (made by caa-push the first time it runs)'::text,
    case when exists (select 1 from push_config) then 'made' else 'not yet: deploy caa-push, then select public.push_start();' end;
  return query select 'devices that accepted notifications'::text, (select count(*)::text from push_subs);
  return query select 'notifications waiting'::text, (select count(*)::text from push_out where done_at is null and expires_at > now());
  return query select 'last error'::text, coalesce((select o.error from push_out o where o.error is not null order by o.last_try_at desc nulls last limit 1), 'none');
end $$;
revoke execute on function public.push_check() from public, anon, authenticated, service_role;

-- Plans the two jobs and wakes the function once (which makes the keys). Run again by hand after
-- deploying caa-push if the keys are "not yet" in push_check().
create function public.push_start() returns text
language plpgsql security definer set search_path = public as $$
begin
  perform push_poke();
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'pg_cron is not turned on (Database → Extensions): no reminder is sent until it is.';
  end if;
  perform cron.schedule('push-tick', '*/15 * * * *', 'select public.push_tick()');
  perform cron.schedule('push-tidy', '50 3 * * *', 'select public.push_tidy()');
  return 'Planned: reminders every quarter of an hour, tidying every night.';
exception when others then
  return 'The jobs could not be planned: ' || sqlerrm;
end $$;
revoke execute on function public.push_start() from public, anon, authenticated, service_role;

select public.push_start();
