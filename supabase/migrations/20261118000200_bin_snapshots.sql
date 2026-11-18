-- A child's board is months of work: nothing about it should disappear by one mistake.
--
--  1. The bin: a deleted child's profile is kept 30 days, hidden from everybody, and the family can
--     put it back. Then it is erased for good (its files too: storage_purge). Deleting goes through
--     delete_profile(), which asks for a fresh proof (20261118000000_security_2.sql).
--  2. Snapshots: the board as it was, kept automatically once a week and before a big change
--     (many words gone at once), 10 per child; the family puts one back in one touch. A copy of
--     the board as it is now is kept first, so putting back can itself be undone.
-- Run once, after the earlier files.

-- ───────────────────────── 1. The bin ─────────────────────────

alter table public.profiles add column deleted_at timestamptz;
create index on public.profiles (deleted_at) where deleted_at is not null;

-- Nobody reads, saves or shares a profile in the bin (the family reads its name in list_bin).
create or replace function public.access_of(p_profile uuid)
returns table (owner boolean, role text, level int, perms jsonb)
language sql stable security definer set search_path = public as $$
  select true, 'owner', 3,
         '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
    from profiles where id = p_profile and owner_id = auth.uid() and deleted_at is null and pro_cleared(auth.uid()) and mfa_ok()
  union all
  select false, m.role, m.level, m.perms
    from members m join profiles p on p.id = m.profile_id and p.deleted_at is null
   where m.profile_id = p_profile and m.user_id = auth.uid() and m.status = 'active'
     and (m.expires_at is null or m.expires_at > now())
     and p.owner_id <> auth.uid()
     and pro_cleared(m.user_id) and mfa_ok()
  limit 1
$$;

create or replace function public.list_profiles()
returns table (id uuid, name text, age int, owner_id uuid, access text, level int, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.age, p.owner_id,
         case when p.owner_id = auth.uid() then 'owner' else m.role end,
         case when p.owner_id = auth.uid() then 3 else m.level end,
         p.updated_at
    from profiles p
    left join members m on m.profile_id = p.id and m.user_id = auth.uid() and m.status = 'active'
                       and (m.expires_at is null or m.expires_at > now()) and pro_cleared(m.user_id)
   where p.deleted_at is null
     and ((p.owner_id = auth.uid() and pro_cleared(auth.uid())) or m.user_id is not null) and mfa_ok()
   order by p.name
$$;

-- The direct door to delete a row is closed: deleting goes through the bin.
drop policy "delete own profiles" on public.profiles;
-- Renaming a profile in the bin: no.
drop policy "rename own profiles" on public.profiles;
create policy "rename own profiles" on public.profiles for update to authenticated
  using (owns_profile(owner_id) and deleted_at is null) with check (owns_profile(owner_id));

create function public.delete_profile(p_id uuid) returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  m uuid;
begin
  select * into p from profiles where id = p_id and deleted_at is null for update;
  if not found or not owns_profile(p.owner_id) then raise exception 'forbidden'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  update profiles set deleted_at = now(), connection_code = null where id = p_id;
  delete from pairing_codes where profile_id = p_id;
  update invitations set status = 'cancelled' where profile_id = p_id and status = 'pending';
  -- The rest of the team is told the board is gone (it was theirs to use too).
  for m in select user_id from members where profile_id = p_id and status = 'active' and user_id <> auth.uid() loop
    perform notify(m, 'access', in_lang(m,
      'Le profil de ' || p.name || ' a été supprimé par la famille.',
      p.name || '''s profile was deleted by the family.',
      'حذفت العائلة ملف ' || p.name || '.'));
  end loop;
  return now() + interval '30 days';
end $$;
revoke execute on function public.delete_profile(uuid) from public, anon;
grant execute on function public.delete_profile(uuid) to authenticated;

-- The family's bin: what can still be put back, and until when.
create function public.list_bin()
returns table (id uuid, name text, deleted_at timestamptz, erase_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.deleted_at, p.deleted_at + interval '30 days'
    from profiles p
   where p.owner_id = auth.uid() and p.deleted_at is not null and pro_cleared(auth.uid()) and mfa_ok()
   order by p.deleted_at desc
$$;
revoke execute on function public.list_bin() from public, anon;
grant execute on function public.list_bin() to authenticated;

create function public.restore_profile(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update profiles set deleted_at = null
   where id = p_id and owner_id = auth.uid() and deleted_at is not null and pro_cleared(auth.uid()) and mfa_ok();
  if not found then raise exception 'forbidden'; end if;
  if (select count(*) from profiles where owner_id = auth.uid() and deleted_at is null) > 30 then
    raise exception 'too_many' using detail = 'profiles';
  end if;
end $$;
revoke execute on function public.restore_profile(uuid) from public, anon;
grant execute on function public.restore_profile(uuid) to authenticated;

-- After 30 days: erased for good (members, history, follow-up… go with it; files through storage_purge).
create function public.erase_old_bin() returns int
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  delete from profiles where deleted_at < now() - interval '30 days';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.erase_old_bin() from public, anon, authenticated;

-- ───────────────────────── 2. Snapshots ─────────────────────────

create table public.profile_snapshots (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  data jsonb not null,
  version int not null,
  reason text not null check (reason in ('weekly', 'big_change', 'before_restore', 'manual')),
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
create index on public.profile_snapshots (profile_id, created_at desc);
alter table public.profile_snapshots enable row level security;
revoke all on public.profile_snapshots from public, anon, authenticated;
-- Read and put back through the functions below only.

create function public.keep_snapshot(p_id uuid, p_data jsonb, p_version int, p_reason text) returns void
language sql security definer set search_path = public as $$
  insert into profile_snapshots (profile_id, data, version, reason, created_by) values (p_id, p_data, p_version, p_reason, auth.uid());
  delete from profile_snapshots
   where profile_id = p_id
     and id not in (select id from profile_snapshots where profile_id = p_id order by created_at desc limit 10);
$$;
revoke execute on function public.keep_snapshot(uuid, jsonb, int, text) from public, anon, authenticated;

-- How many words a board holds (cards with something on them), all boards together.
create function public.word_count(d jsonb) returns int
language sql immutable as $$
  select coalesce(sum((select count(*) from jsonb_array_elements(case when jsonb_typeof(b -> 'cells') = 'array' then b -> 'cells' else '[]'::jsonb end) c
                        where jsonb_typeof(c) = 'object')), 0)::int
    from jsonb_each(case when jsonb_typeof(d -> 'boards') = 'object' then d -> 'boards' else '{}'::jsonb end) e(k, b)
$$;

-- Before each save of the board: the board as it was is kept once a week, and before a big
-- change (a tenth of the words or more gone at once, or an activity board removed), at most one
-- such copy an hour.
create function public.snapshot_before_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  last timestamptz;
  before_n int;
  after_n int;
begin
  if new.data is not distinct from old.data then return new; end if;
  -- Putting a snapshot back keeps its own copy first (restore_snapshot).
  if current_setting('caa.restoring', true) = 'on' then return new; end if;
  select max(created_at) into last from profile_snapshots where profile_id = old.id;
  if last is null or last < now() - interval '7 days' then
    perform keep_snapshot(old.id, old.data, old.version, 'weekly');
    return new;
  end if;
  before_n := word_count(old.data);
  after_n := word_count(new.data);
  if (before_n > 0 and after_n < before_n * 0.9)
     or (select count(*) from jsonb_object_keys(coalesce(new.data -> 'boards', '{}'::jsonb))) <
        (select count(*) from jsonb_object_keys(coalesce(old.data -> 'boards', '{}'::jsonb))) then
    if not exists (select 1 from profile_snapshots where profile_id = old.id and reason = 'big_change' and created_at > now() - interval '1 hour') then
      perform keep_snapshot(old.id, old.data, old.version, 'big_change');
    end if;
  end if;
  return new;
end $$;
create trigger snapshot_before_change before update of data on public.profiles
for each row execute function public.snapshot_before_change();
revoke execute on function public.snapshot_before_change() from public, anon, authenticated;

-- The list, for the family and the team's managers: when, why, how many words. Never the content.
create function public.list_snapshots(p_id uuid)
returns table (id uuid, created_at timestamptz, reason text, version int, words int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  return query select s.id, s.created_at, s.reason, s.version, word_count(s.data)
                 from profile_snapshots s where s.profile_id = p_id order by s.created_at desc;
end $$;
revoke execute on function public.list_snapshots(uuid) from public, anon;
grant execute on function public.list_snapshots(uuid) to authenticated;

-- "Keep a copy now" (before trying something big).
create function public.take_snapshot(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  perform rate_limit('snapshot', 20, interval '1 day');
  select * into p from profiles where id = p_id;
  perform keep_snapshot(p.id, p.data, p.version, 'manual');
end $$;
revoke execute on function public.take_snapshot(uuid) from public, anon;
grant execute on function public.take_snapshot(uuid) to authenticated;

-- Putting a snapshot back: the board as it is now is kept first; then the snapshot becomes the
-- board, as a new version (every device takes it at its next check). The family's own choices
-- (what is recorded, what is shared, the caregiver code) stay as they are now.
create function public.restore_snapshot(p_snap uuid) returns int
language plpgsql security definer set search_path = public as $$
declare
  s profile_snapshots;
  p profiles;
  d jsonb;
  k text;
begin
  select * into s from profile_snapshots where id = p_snap;
  if not found or not is_manager(s.profile_id) then raise exception 'forbidden'; end if;
  perform rate_limit('restore_snapshot', 20, interval '1 day');
  select * into p from profiles where id = s.profile_id for update;
  perform keep_snapshot(p.id, p.data, p.version, 'before_restore');
  d := s.data;
  foreach k in array array['dataCollection', 'shareStats', 'shareTerms', 'pin'] loop
    if p.data -> 'settings' ? k then d := jsonb_set(d, array['settings', k], p.data -> 'settings' -> k, true);
    elsif jsonb_typeof(d -> 'settings') = 'object' then d := d #- array['settings', k];
    end if;
  end loop;
  -- The trigger above must not keep the board a second time (for this transaction only).
  perform set_config('caa.restoring', 'on', true);
  update profiles set data = d, version = version + 1, updated_at = now(), updated_by = auth.uid() where id = p.id;
  perform set_config('caa.restoring', 'off', true);
  insert into history (profile_id, actor_id, actor_name, summary, ops, inverse)
  values (p.id, auth.uid(), my_name(), 'restore:' || to_char(s.created_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), '[]'::jsonb, '[]'::jsonb);
  return p.version + 1;
end $$;
revoke execute on function public.restore_snapshot(uuid) from public, anon;
grant execute on function public.restore_snapshot(uuid) to authenticated;

-- ───────────────────────── The daily job ─────────────────────────

create function public.bin_plan() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'pg_cron is not turned on (Database → Extensions): profiles stay in the bin until it is.';
  end if;
  perform cron.schedule('profile-bin-erase', '10 3 * * *', 'select public.erase_old_bin()');
  return 'Planned: profiles deleted more than 30 days ago are erased every night at 03:10 UTC.';
exception when others then
  return 'The job could not be planned: ' || sqlerrm;
end $$;
revoke execute on function public.bin_plan() from public, anon, authenticated, service_role;

select public.bin_plan();
