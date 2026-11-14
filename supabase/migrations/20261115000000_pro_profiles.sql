-- A professional can prepare a child's profile before the family has an account.
-- The family then connects with a code and becomes the owner; the professional stays on the
-- team. Run once, after the eight earlier files.
--
-- What protects the child meanwhile:
--  - only a professional whose certificate was accepted can create a profile;
--  - while a professional owns it, nothing about the child's use is recorded or shared
--    (these two choices are the family's, made after the hand-over);
--  - the hand-over only happens with the code the professional created for the parents.

-- ───────────────────────── 1. Creating ─────────────────────────

-- True when the account is a professional's.
create function public.is_pro(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts where id = p_user and role = 'pro')
$$;

create function public.pro_profile_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_pro(new.owner_id) then return new; end if;
  if not pro_cleared(new.owner_id) then raise exception 'pro_not_verified'; end if;
  -- Recording and sharing stay off until the family decides.
  if jsonb_typeof(new.data -> 'settings') = 'object' then
    new.data := jsonb_set(jsonb_set(new.data, '{settings,dataCollection}', '"off"'), '{settings,shareStats}', '"none"');
  end if;
  return new;
end $$;
create trigger pro_profile_rules before insert on public.profiles
for each row execute function public.pro_profile_rules();

-- ───────────────────────── 2. Access ─────────────────────────

-- A professional who is no longer accepted loses access to the profiles they created too
-- (suspended, not erased: the family can still take the profile with its code).
create or replace function public.access_of(p_profile uuid)
returns table (owner boolean, role text, level int, perms jsonb)
language sql stable security definer set search_path = public as $$
  select true, 'owner', 3,
         '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
    from profiles where id = p_profile and owner_id = auth.uid() and pro_cleared(auth.uid())
  union all
  select false, m.role, m.level, m.perms
    from members m
   where m.profile_id = p_profile and m.user_id = auth.uid() and m.status = 'active'
     and (m.expires_at is null or m.expires_at > now())
     and not exists (select 1 from profiles where id = p_profile and owner_id = auth.uid())
     and pro_cleared(m.user_id)
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
   where (p.owner_id = auth.uid() and pro_cleared(auth.uid())) or m.user_id is not null
   order by p.name
$$;

-- The direct door to the table follows the same rule: a professional reads, renames or deletes a
-- profile they created only while their certificate is accepted. (A rule on a table cannot call
-- pro_cleared itself: this small function asks for the caller only.)
create function public.owns_profile(p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select p_owner = auth.uid() and pro_cleared(auth.uid())
$$;
revoke execute on function public.owns_profile(uuid) from public, anon;
grant execute on function public.owns_profile(uuid) to authenticated;

drop policy "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (owns_profile(owner_id) or can_read(id));
drop policy "rename own profiles" on public.profiles;
create policy "rename own profiles" on public.profiles for update to authenticated
  using (owns_profile(owner_id)) with check (owns_profile(owner_id));
drop policy "delete own profiles" on public.profiles;
create policy "delete own profiles" on public.profiles for delete to authenticated
  using (owns_profile(owner_id));

-- Saving: a professional who owns a profile edits everything except what is recorded and what
-- is shared (the family's decisions).
create or replace function public.save_profile(p_id uuid, p_data jsonb, p_base int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a record;
  cur profiles;
  k text;
  boss boolean;
begin
  select * into a from access_of(p_id);
  if not found then raise exception 'forbidden'; end if;
  select * into cur from profiles where id = p_id for update;
  boss := a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false);
  if not boss and a.level < 3 then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'invalid'; end if;
  if cur.version <> p_base then
    return jsonb_build_object('ok', false, 'conflict', to_jsonb(cur) - 'connection_code');
  end if;
  if not boss and (p_data -> 'boards' -> 'core') is distinct from (cur.data -> 'boards' -> 'core') then
    raise exception 'core_protected';
  end if;
  -- (a value that is missing counts as its default)
  foreach k in array array['dataCollection:off', 'shareStats:none', 'pin:1234'] loop
    if coalesce(p_data -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2))
       is distinct from coalesce(cur.data -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2)) then
      -- editors: none of the three; a professional who owns the profile: the code only
      if not boss or (a.owner and is_pro(auth.uid()) and split_part(k, ':', 1) <> 'pin') then
        raise exception 'consent_protected' using detail = split_part(k, ':', 1);
      end if;
    end if;
  end loop;
  update profiles set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid() where id = p_id;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

-- ───────────────────────── 3. The family takes the profile ─────────────────────────

-- Joining with an invitation. One case is special: a parent accepts the "parent" invitation
-- that the professional who created the profile made for them. The parent then becomes the
-- owner, and the professional becomes a member of the team (direct editing, no access to the
-- progress data unless the family gives it). The caregiver code is the family's to choose.
create or replace function public.join_profile(inv invitations, p_user uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  was uuid;
  parent_name text;
begin
  select owner_id into was from profiles where id = inv.profile_id for update;
  if inv.direction = 'invite' and inv.role = 'parent' and inv.from_user_id = was and is_pro(was) and p_user <> was
     and exists (select 1 from accounts a join auth.users u on u.id = a.id
                  where a.id = p_user and a.role = 'parent' and not coalesce(u.is_anonymous, false)) then
    -- The caregiver code becomes "not chosen yet": the family chooses its own at the first unlock.
    update profiles
       set owner_id = p_user,
           data = case when jsonb_typeof(data -> 'settings') = 'object' then jsonb_set(data, '{settings,pin}', '"1234"') else data end,
           version = version + 1, updated_at = now()
     where id = inv.profile_id;
    delete from members where profile_id = inv.profile_id and user_id = p_user;
    if pro_cleared(was) then
      insert into members (profile_id, user_id, display_name, email, role, level, perms)
      select inv.profile_id, was, coalesce(nullif(a.display_name, ''), u.email, '—'), u.email, 'therapist', 3,
             '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":false,"invite":false,"manageDevices":false,"manager":false,"viewData":false}'::jsonb
        from auth.users u left join accounts a on a.id = u.id where u.id = was
      on conflict (profile_id, user_id) do update set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms, expires_at = null;
    end if;
    -- Other invitations the professional had prepared as owner stop here: the family decides now.
    update invitations set status = 'cancelled' where profile_id = inv.profile_id and from_user_id = was and status = 'pending' and id <> inv.id;
    update invitations set status = 'accepted', to_user_id = p_user where id = inv.id;
    select coalesce(nullif(a.display_name, ''), u.email, '—') into parent_name from auth.users u left join accounts a on a.id = u.id where u.id = p_user;
    perform notify(was, 'access', in_lang(was,
      parent_name || ' est maintenant le parent responsable du profil de ' || inv.child_name || '. Vous restez dans son équipe.',
      parent_name || ' is now the parent in charge of ' || inv.child_name || '''s profile. You stay on the team.',
      parent_name || ' هو الآن ولي الأمر المسؤول عن ملف ' || inv.child_name || '. تبقى ضمن الفريق.'), inv.profile_id);
    return;
  end if;
  insert into members (profile_id, user_id, display_name, email, role, level, perms)
  select inv.profile_id, p_user,
         case when inv.direction = 'invite' then coalesce(inv.name, coalesce(nullif(a.display_name, ''), u.email, '—')) else coalesce(nullif(a.display_name, ''), u.email, '—') end,
         u.email, inv.role, greatest(1, least(3, coalesce(p_level, 1))), clean_perms(p_perms)
    from auth.users u left join accounts a on a.id = u.id where u.id = p_user
  on conflict (profile_id, user_id) do update set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms, expires_at = null;
  update invitations set status = 'accepted', to_user_id = case when direction = 'invite' then p_user else to_user_id end where id = inv.id;
end $$;

-- Tools of the functions above, not of the app.
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;
revoke execute on function public.pro_profile_rules() from public, anon, authenticated;
revoke execute on function public.join_profile(invitations, uuid, int, jsonb) from public, anon, authenticated;
