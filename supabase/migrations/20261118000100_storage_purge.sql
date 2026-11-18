-- Files are not rows. When an account, a child's profile or a professional's document is erased,
-- its files in storage must go too, whatever happened on the device that asked for it (closed app,
-- no internet). Until now the app deleted them itself, "best effort". Now the database writes the
-- folder or file to erase in a queue, and the server function "caa-purge" deletes it with the
-- server's own key, then says it is done (supabase/functions/caa-purge).
--
-- Same postman pattern as the team's e-mails (20261116000000_team_mail.sql): the database calls the
-- function with the key it made itself (team_mail_config) and checks that key when the function
-- asks for work; the app can neither read the queue nor call these functions.
-- Needs: the function caa-purge deployed with "Verify JWT" off, and team_mail_connect() run once.

create table public.storage_purge (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('verification-docs', 'profile-media')),
  -- One person's or one child's folder ("<uuid>/"), or one file in it ("<uuid>/<name>").
  path text not null check (path ~ '^[0-9a-f-]{36}/([^/]{1,255})?$'),
  reason text not null check (reason in ('account', 'profile', 'document', 'media')),
  created_at timestamptz not null default now(),
  tries int not null default 0,
  last_try_at timestamptz,
  done_at timestamptz,
  error text
);
create index on public.storage_purge (created_at) where done_at is null;
alter table public.storage_purge enable row level security;
revoke all on public.storage_purge from public, anon, authenticated;

create function public.storage_purge_add(p_bucket text, p_path text, p_reason text) returns void
language sql security definer set search_path = public as $$
  insert into storage_purge (bucket, path, reason)
  select p_bucket, p_path, p_reason
   where p_path ~ '^[0-9a-f-]{36}/([^/]{1,255})?$'
     and not exists (select 1 from storage_purge where bucket = p_bucket and path = p_path and done_at is null)
$$;
revoke execute on function public.storage_purge_add(text, text, text) from public, anon, authenticated;

-- An account erased: its verification documents (diploma, identity).
create function public.purge_account_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform storage_purge_add('verification-docs', old.id::text || '/', 'account');
  return old;
end $$;
create trigger purge_account_files after delete on auth.users
for each row execute function public.purge_account_files();

-- A child's profile erased: its photos and recordings.
create function public.purge_profile_files() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform storage_purge_add('profile-media', old.id::text || '/', 'profile');
  return old;
end $$;
create trigger purge_profile_files after delete on public.profiles
for each row execute function public.purge_profile_files();

-- A document taken off a professional's list (removed by them, or the identity document at the
-- team's decision): its file.
create function public.purge_removed_documents() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ref text;
begin
  for ref in
    select d ->> 'ref' from jsonb_array_elements(case when jsonb_typeof(old.documents) = 'array' then old.documents else '[]'::jsonb end) d
    except
    select d ->> 'ref' from jsonb_array_elements(case when jsonb_typeof(new.documents) = 'array' then new.documents else '[]'::jsonb end) d
  loop
    -- Only files of this person's own folder.
    if ref like old.user_id::text || '/%' then perform storage_purge_add('verification-docs', ref, 'document'); end if;
  end loop;
  return new;
end $$;
create trigger purge_removed_documents after update of documents on public.verifications
for each row execute function public.purge_removed_documents();
revoke execute on function public.purge_account_files() from public, anon, authenticated;
revoke execute on function public.purge_profile_files() from public, anon, authenticated;
revoke execute on function public.purge_removed_documents() from public, anon, authenticated;

-- ───────────────────────── Waking the server function ─────────────────────────

-- The function's address is the e-mail function's, with its own name. Without a connection (or
-- without pg_net) the work waits; nothing fails.
create function public.storage_purge_poke() returns void
language plpgsql security definer set search_path = public as $$
declare
  cfg team_mail_config;
begin
  select * into cfg from team_mail_config;
  if not found then return; end if;
  perform net.http_post(
    url := regexp_replace(cfg.function_url, '/caa-mail$', '/caa-purge'),
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mail-key', cfg.key),
    timeout_milliseconds := 60000);
exception when others then
  null; -- tried again within the hour
end $$;
revoke execute on function public.storage_purge_poke() from public, anon, authenticated, service_role;

create function public.storage_purge_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform storage_purge_poke();
  return null;
end $$;
create trigger storage_purge_added after insert on public.storage_purge
for each statement execute function public.storage_purge_added();
revoke execute on function public.storage_purge_added() from public, anon, authenticated;

-- ───────────────────────── What the server function may do ─────────────────────────

-- The waiting work, 20 at most, each tried 10 times at most. The key is checked here.
create function public.storage_purge_take(p_key text) returns table (id uuid, bucket text, path text)
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  return query
    update storage_purge s set tries = s.tries + 1, last_try_at = now()
     where s.id in (select w.id from storage_purge w
                     where w.done_at is null and w.tries < 10
                       and (w.last_try_at is null or w.last_try_at < now() - interval '5 minutes')
                     order by w.created_at limit 20 for update skip locked)
    returning s.id, s.bucket, s.path;
end $$;

create function public.storage_purge_done(p_key text, p_id uuid, p_error text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  update storage_purge
     set done_at = case when p_error is null then now() end,
         error = left(p_error, 300)
   where id = p_id;
end $$;
revoke execute on function public.storage_purge_take(text) from public, anon, authenticated;
revoke execute on function public.storage_purge_done(text, uuid, text) from public, anon, authenticated;
grant execute on function public.storage_purge_take(text) to service_role;
grant execute on function public.storage_purge_done(text, uuid, text) to service_role;

-- For the back office's Security page: what is waiting (counts only).
create function public.storage_purge_waiting() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from storage_purge where done_at is null
$$;
revoke execute on function public.storage_purge_waiting() from public, anon, authenticated;

-- Every hour, a new try for what could not be deleted (pg_cron).
create function public.storage_purge_plan() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'pg_cron is not turned on (Database → Extensions): files are deleted when the work is added only.';
  end if;
  perform cron.schedule('storage-purge-retry', '41 * * * *',
    'select public.storage_purge_poke() where exists (select 1 from public.storage_purge where done_at is null and tries < 10)');
  return 'Planned: a new try every hour.';
exception when others then
  return 'The job could not be planned: ' || sqlerrm;
end $$;
revoke execute on function public.storage_purge_plan() from public, anon, authenticated, service_role;

select public.storage_purge_plan();
