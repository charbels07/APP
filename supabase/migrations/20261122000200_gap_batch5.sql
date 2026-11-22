-- Gap review, batch 5: a child's photos and recordings (docs/GAP-REVIEW-2026-11.md).
-- Run once, after 20261122000100_gap_batch4.sql, AFTER the app version that comes with it is published
-- (the app works before it runs: it then removes nothing from the account and a professional's
-- pictures wait on her device).
--
-- 1. A file no board uses any more stays 30 days, and never leaves while something still points to it:
--    the profile, its earlier versions (snapshots), the last 30 days of its history ("Undo"), the
--    proposals waiting, and the names a save stopped using in the last 30 days (`media_dropped`,
--    written by the database itself). The app asks `media_in_use` before its sweep; the storage rule
--    refuses the rest anyway (an older app removed a replaced file two seconds later).
-- 2. A professional who may propose words or materials sends the pictures and recordings of her
--    proposal (otherwise the family accepted a word whose picture never arrived), 100 files and 20 MB
--    per child in 30 days at most. Still never a use-only tablet, someone removed from the team, or a
--    professional who is not checked.

-- ───────────────────────── 1. What still points to a file ─────────────────────────

-- The names the app gives a file (the same pattern as `mediaNamesIn` in src/lib/mediaPlan.ts).
create function public.media_names(p_text text) returns setof text
language sql immutable set search_path = public as $$
  select distinct m[1] from regexp_matches(coalesce(p_text, ''), '([0-9]{13}_[a-z0-9]{6}(?:\.t[0-9]+-[0-9]+)?\.[a-z0-9]{2,4})', 'g') as m
$$;

-- The names a save stopped using, with when: written by the database itself on every change of a
-- profile (the app's own history row is best effort), so that a file replaced today stays 30 days
-- whatever the app does. Random file names only (`1762000000000_ab12cd.jpg`), nothing about the
-- child; gone with the profile, and kept 60 days at most.
create table public.media_dropped (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  at timestamptz not null default now(),
  primary key (profile_id, name)
);
alter table public.media_dropped enable row level security;
revoke all on public.media_dropped from public, anon, authenticated;

create function public.note_media_dropped() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.data is not distinct from old.data then return new; end if;
  insert into media_dropped (profile_id, name)
  select new.id, n from public.media_names(old.data::text) n
   where n not in (select public.media_names(new.data::text))
  on conflict (profile_id, name) do update set at = now();
  delete from media_dropped where profile_id = new.id and at < now() - interval '60 days';
  return new;
end $$;
revoke execute on function public.note_media_dropped() from public, anon, authenticated;
create trigger note_media_dropped after update of data on public.profiles
for each row execute function public.note_media_dropped();

-- Every file name the child's board, its earlier versions, its recent history, the names it stopped
-- using in the last 30 days and the waiting proposals use. Names only (never a file's content), for
-- the child's team only.
create function public.media_in_use(p_profile uuid) returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct n), '{}'::text[]) from (
  select n
    from (
      select data::text t from profiles where id = p_profile
      union all select data::text from profile_snapshots where profile_id = p_profile
      union all select ops::text || inverse::text from history
                 where profile_id = p_profile and created_at > now() - interval '30 days'
      union all select ops::text from proposals where profile_id = p_profile and status in ('pending', 'revision')
    ) src, lateral public.media_names(src.t) n
   where public.can_read(p_profile)
  union
  select name from media_dropped
   where profile_id = p_profile and at > now() - interval '30 days' and public.can_read(p_profile)
  ) u
$$;

-- May this file leave the account? Sent more than 30 days ago, and nothing points to it.
create function public.media_may_go(p_name text, p_created timestamptz) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_created < now() - interval '30 days', false)
     and not exists (select 1 from unnest(public.media_in_use(public.try_uuid((storage.foldername(p_name))[1]))) u
                      where u = (string_to_array(p_name, '/'))[2])
$$;

drop policy "profile media: delete" on storage.objects;
create policy "profile media: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-media'
         and public.is_manager(public.try_uuid((storage.foldername(name))[1]))
         and public.media_may_go(name, created_at));

-- ───────────────────────── 2. Who may send ─────────────────────────

-- Those who may change the board (save_profile's rule), and those who may propose words or
-- materials (level 2 with one of these rights): the pictures of a proposal are there when it is accepted.
-- Someone who may only propose sends at most 100 files and 20 MB in 30 days for one child: she can
-- never fill the child's space (the family's own photos would be refused while they wait 30 days).
create function public.can_send_media(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false) or a.level >= 3
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

drop policy "profile media: upload" on storage.objects;
create policy "profile media: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-media' and public.media_name_ok(name)
              and public.can_send_media(public.try_uuid((storage.foldername(name))[1])));

-- ───────────────────────── 3. Who may call what ─────────────────────────

revoke execute on function public.media_names(text) from public, anon;
revoke execute on function public.media_in_use(uuid) from public, anon;
revoke execute on function public.media_may_go(text, timestamptz) from public, anon;
revoke execute on function public.can_send_media(uuid) from public, anon;
grant execute on function public.media_names(text) to authenticated;
grant execute on function public.media_in_use(uuid) to authenticated;
grant execute on function public.media_may_go(text, timestamptz) to authenticated;
grant execute on function public.can_send_media(uuid) to authenticated;
