-- Security, second round (November 2026): the gaps listed in docs/SECURITY.md §5.
-- Run once, after the earlier files. It only tightens rules: no data is removed.
--
--  1. Two-step sign-in (a code from an authenticator app): required for the app's team, offered
--     to everybody. Once a person turned it on, the database refuses that account's children's
--     data until the code was typed in this session ("aal2" in the sign-in token).
--  2. A fresh proof before what cannot be undone or opens the door wide: deleting the account,
--     linking a device with full access. "Fresh" = signed in, or the password / an e-mailed code /
--     the authenticator code typed, in the last 10 minutes.
--  3. Team members no longer read each other's e-mail address, nor the family's connection code:
--     only the family and the team's managers do (and each person their own address).

-- ───────────────────────── 1. Two-step sign-in ─────────────────────────

-- Has this account turned two-step sign-in on (a verified authenticator)?
create function public.mfa_enrolled(p_user uuid) returns boolean
language sql stable security definer set search_path = public, auth as $$
  select exists (select 1 from auth.mfa_factors f where f.user_id = p_user and f.status = 'verified')
$$;
revoke execute on function public.mfa_enrolled(uuid) from public, anon, authenticated;

-- True when the session may read: either the account has no two-step sign-in, or its code was
-- typed in this session.
create function public.mfa_ok() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2' or not public.mfa_enrolled(auth.uid())
$$;
revoke execute on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated;

-- The app's team: listed in "admins". Being on the list shows the way to the back office;
-- reading it also needs the authenticator code typed in this session (is_admin below).
create function public.is_team() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
     and exists (select 1 from admins where user_id = auth.uid())
$$;
revoke execute on function public.is_team() from public, anon;
grant execute on function public.is_team() to authenticated;

-- Every back-office function and file rule calls is_admin(): two-step sign-in is now required.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_team() and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
$$;

-- Where this account stands, for the app: team or not, two-step on or not, code typed or not.
create function public.my_security() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'team', public.is_team(),
    'twoStep', public.mfa_enrolled(auth.uid()),
    'level', coalesce(auth.jwt() ->> 'aal', 'aal1'))
$$;
revoke execute on function public.my_security() from public, anon;
grant execute on function public.my_security() to authenticated;

-- Children's profiles: every rule goes through access_of / owns_profile / list_profiles.
create or replace function public.access_of(p_profile uuid)
returns table (owner boolean, role text, level int, perms jsonb)
language sql stable security definer set search_path = public as $$
  select true, 'owner', 3,
         '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
    from profiles where id = p_profile and owner_id = auth.uid() and pro_cleared(auth.uid()) and mfa_ok()
  union all
  select false, m.role, m.level, m.perms
    from members m
   where m.profile_id = p_profile and m.user_id = auth.uid() and m.status = 'active'
     and (m.expires_at is null or m.expires_at > now())
     and not exists (select 1 from profiles where id = p_profile and owner_id = auth.uid())
     and pro_cleared(m.user_id) and mfa_ok()
  limit 1
$$;

create or replace function public.owns_profile(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid() and pro_cleared(auth.uid()) and mfa_ok()
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
   where ((p.owner_id = auth.uid() and pro_cleared(auth.uid())) or m.user_id is not null) and mfa_ok()
   order by p.name
$$;

-- Every other table with row rules gets one more rule that must also hold (a "restrictive" rule):
-- nothing is read or written by a session that still owes its two-step code. The account's own
-- row stays readable (the app needs its type and language to ask for the code).
do $$
declare
  t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity and c.relname <> 'accounts'
  loop
    execute format(
      'create policy "two-step sign-in" on public.%I as restrictive for all to authenticated using ((select public.mfa_ok())) with check ((select public.mfa_ok()))',
      t);
  end loop;
end $$;

-- ───────────────────────── 2. A fresh proof before what cannot be undone ─────────────────────────

-- In the last 10 minutes: signed in, or proved again (password, e-mailed code, authenticator code).
-- Three traces, because Supabase writes them differently across versions: the times in the token's
-- "amr" list, the start of this sign-in session, an authenticator code checked recently.
create function public.fresh_proof() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select auth.uid() is not null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
     and (
       exists (select 1
                 from jsonb_array_elements(case when jsonb_typeof(auth.jwt() -> 'amr') = 'array' then auth.jwt() -> 'amr' else '[]'::jsonb end) e
                where jsonb_typeof(e) = 'object' and coalesce(e ->> 'timestamp', '') ~ '^[0-9]{1,12}$'
                  and to_timestamp((e ->> 'timestamp')::bigint) > now() - interval '10 minutes')
       or exists (select 1 from auth.sessions s
                   where s.id = public.try_uuid(auth.jwt() ->> 'session_id') and s.user_id = auth.uid()
                     and s.created_at > now() - interval '10 minutes')
       or exists (select 1 from auth.mfa_challenges c join auth.mfa_factors f on f.id = c.factor_id
                   where f.user_id = auth.uid() and c.verified_at > now() - interval '10 minutes'))
$$;
revoke execute on function public.fresh_proof() from public, anon;
grant execute on function public.fresh_proof() to authenticated;

create or replace function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  delete from auth.users where id = auth.uid();
end $$;

-- A code that links a device with full access needs a fresh proof; a use-only code does not.
create or replace function public.create_pairing_code(p_id uuid, p_access text)
returns table (code text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare
  c text := strong_code(8);
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  if p_access not in ('full', 'use') then raise exception 'invalid'; end if;
  if p_access = 'full' and not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('pairing_code', 20, interval '1 hour');
  delete from pairing_codes
   where pairing_codes.expires_at < now() or (pairing_codes.profile_id = p_id and pairing_codes.created_by = auth.uid());
  insert into pairing_codes (code, profile_id, access, expires_at, created_by)
  values (c, p_id, p_access, now() + interval '10 minutes', auth.uid());
  return query select c, now() + interval '10 minutes';
end $$;

-- ───────────────────────── 3. What team members read about each other ─────────────────────────

-- The e-mail column of the team list and the family's connection code are no longer readable
-- directly. The team list is read through list_members(): the address only for the family, the
-- team's managers and the person themself.
revoke select on public.members from authenticated, anon;
grant select (profile_id, user_id, display_name, role, level, perms, status, expires_at, created_at)
  on public.members to authenticated;

revoke select on public.profiles from authenticated, anon;
grant select (id, owner_id, name, age, intake, data, version, updated_at, updated_by)
  on public.profiles to authenticated;

create function public.list_members(p_id uuid)
returns table (profile_id uuid, user_id uuid, display_name text, email text, role text, level int, perms jsonb,
               status text, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.profile_id, m.user_id, m.display_name,
         case when public.is_manager(p_id) or m.user_id = auth.uid() then m.email end,
         m.role, m.level, m.perms, m.status, m.expires_at, m.created_at
    from members m
   where m.profile_id = p_id and public.can_read(p_id)
   order by m.created_at
$$;
revoke execute on function public.list_members(uuid) from public, anon;
grant execute on function public.list_members(uuid) to authenticated;
