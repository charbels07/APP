-- A child's photos and recordings are copied through the account (private bucket
-- `profile-media/<profile id>/<file name>`): a lost tablet loses nothing, and a photo added on a
-- parent's phone reaches the child's tablet (src/state/mediaSync.ts). Run once, after the earlier files.
--
-- Who:       reading stays the child's team (can_read). Sending: the people who may change the
--            board (the rule of save_profile: the owner, a manager, or level 3) — never a use-only
--            tablet, a stranger, someone removed from the team, or a professional who is not
--            verified (access_of already leaves them out). Removing stays with the managers.
-- What:      a name the app gives (`1762000000000_ab12cd.jpg`, a recording's `….t120-980.m4a`);
--            pictures (JPEG, PNG, WebP) up to 2 MB, sounds (M4A/AAC/MP4, WAV, WebM, MP3) up to 3 MB.
-- How much:  1500 files and 150 MB per child (a picture taken from the offline library for a new
--            activity board is a small file of its own); 1000 files sent per person per day.
--
-- How the storage server writes a file: it first tries the row as the person (the rules below
-- decide, then the try is taken back), stores the file, then writes the row itself with the
-- file's size and kind in `metadata` (no person then: the size, kind and space rules still apply).
--
-- Not here: files of a deleted account or profile are not removed by the database (a separate
-- clean-up queue does it).

-- ───────────────────────── 1. Who may send ─────────────────────────

-- The people who may change the board (the same rule as save_profile).
create function public.can_edit_board(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false) or a.level >= 3
                     from public.access_of(p_profile) a), false)
$$;

-- The only names the app gives a child's file (never a path, never another kind of file).
create function public.media_name_ok(p_name text) returns boolean
language sql immutable set search_path = public as $$
  select coalesce(p_name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{13}_[a-z0-9]{6}(\.t[0-9]{1,7}-[0-9]{1,7})?\.(jpg|jpeg|png|webp|m4a|aac|mp4|wav|webm|mp3)$', false)
$$;

-- Picture or sound, from the name.
create function public.media_kind(p_name text) returns text
language sql immutable set search_path = public as $$
  select case when p_name ~ '\.(jpg|jpeg|png|webp)$' then 'image'
              when p_name ~ '\.(m4a|aac|mp4|wav|webm|mp3)$' then 'audio' end
$$;

drop policy "profile media: upload" on storage.objects;
create policy "profile media: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-media' and public.media_name_ok(name)
              and public.can_edit_board(public.try_uuid((storage.foldername(name))[1])));

-- ───────────────────────── 2. What, and how much ─────────────────────────

-- The storage server checks these two before taking a file.
update storage.buckets set file_size_limit = 3145728,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp',
                                  'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/mpeg']
 where id = 'profile-media';

-- The database checks them again, by kind, with the child's space and the person's day.
create function public.media_rules() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  child uuid := public.try_uuid((storage.foldername(new.name))[1]);
  sort text := public.media_kind(new.name);
  mime text := new.metadata ->> 'mimetype';
  fsize bigint := case when jsonb_typeof(new.metadata -> 'size') = 'number' then (new.metadata ->> 'size')::numeric::bigint end;
  who uuid := coalesce(auth.uid(), new.owner);
  n_files int;
  n_bytes bigint;
begin
  if new.bucket_id is distinct from 'profile-media' then return new; end if;
  -- Someone outside the child's team: the bucket's rule refuses them (nothing to tell them here).
  if auth.uid() is not null and not public.can_read(child) then return new; end if;
  if child is null or sort is null or not public.media_name_ok(new.name) then
    raise exception 'invalid' using detail = 'media name';
  end if;
  if mime is not null and (split_part(mime, '/', 1) <> sort
     or mime <> all (array['image/jpeg', 'image/png', 'image/webp',
                           'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/mpeg'])) then
    raise exception 'media_type';
  end if;
  if fsize is not null and fsize > (case sort when 'image' then 2097152 else 3145728 end) then
    raise exception 'too_large';
  end if;
  -- One file at a time per child, so that two devices sending together cannot both pass the limit.
  perform pg_advisory_xact_lock(hashtext('profile-media/' || child::text));
  select count(*),
         coalesce(sum(case when jsonb_typeof(o.metadata -> 'size') = 'number' then (o.metadata ->> 'size')::numeric::bigint else 0 end), 0)
    into n_files, n_bytes
    from storage.objects o
   where o.bucket_id = 'profile-media' and o.name like child::text || '/%'
     and o.name <> new.name and o.id is distinct from new.id;
  if n_files >= 1500 or n_bytes + coalesce(fsize, 0) > 157286400 then
    raise exception 'media_quota';
  end if;
  -- Sending and removing again and again is limited too.
  if tg_op = 'INSERT' and who is not null then
    if (select count(*) from rate_log where user_id = who and kind = 'media' and at > now() - interval '1 day') >= 1000 then
      raise exception 'too_many' using detail = 'media';
    end if;
    insert into rate_log (user_id, kind) values (who, 'media');
  end if;
  return new;
end $$;

create trigger media_rules before insert or update of name, bucket_id, metadata on storage.objects
for each row execute function public.media_rules();

-- ───────────────────────── 3. Who may call what ─────────────────────────

-- The rule of the bucket calls the first two as the person; the third is the trigger's.
revoke execute on function public.can_edit_board(uuid) from public, anon;
grant execute on function public.can_edit_board(uuid) to authenticated;
revoke execute on function public.media_name_ok(text) from public, anon;
grant execute on function public.media_name_ok(text) to authenticated;
revoke execute on function public.media_kind(text) from public, anon, authenticated;
revoke execute on function public.media_rules() from public, anon, authenticated;
