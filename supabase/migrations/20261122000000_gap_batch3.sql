-- Gap review of November 2026, batch 3: holes in the database's rules.
--
-- Nothing new for the families to see: each part below closes a way round a rule that the app's
-- screens already follow. In short:
--
--   1. While a professional owns a child's profile, nobody turns recording or sharing on, and
--      nothing is stored (the parents have not agreed yet), whoever asks: a linked tablet too.
--   2. When the parents take a profile over, they start with a team they know: linked tablets and
--      waiting codes and invitations end, nobody keeps the family's rights, and they are told who
--      is on the team.
--   3. Someone removed from a team cannot come back with an invitation or a code left behind.
--   4. A tablet linked with full access does what its screens show (the board, its settings, the
--      devices, "use only" codes) and nothing about the team, the follow-up or the family's code.
--   5. The family's caregiver code is no longer sent to professionals.
--   6. A professional whose acceptance was withdrawn no longer downloads the profiles she created;
--      a removed team member no longer downloads what the child said.
--   7. Two-step sign-in also covers a professional's own documents.
--   8. Figures for the app's team: totals stay; everything about use is counted among the
--      families who share figures only, and shown from 5 children of 5 families (never 1 to 4).
--   9. Follow-up: a day is saved by the device it belongs to; reading without the right says
--      "forbidden" instead of nothing; an observation's free texts are all sealed.
--  10. Smaller ones: names never fall back to an e-mail address, limits and ceilings that were
--      missing, the nightly clean-up of the counters.
--
-- The app keeps working before this file is run (it then reads a profile the old way).

-- ───────────────────────── 0. Three questions asked in many places ─────────────────────────

-- Who runs the child's team: the family (the owner, a co-parent who manages), signed in as
-- themselves. Never a tablet linked with a code, even with full access.
create function public.manages_team(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.owner or (coalesce(a.perms -> 'manager' = 'true'::jsonb, false) and a.role <> 'device')
                     from public.access_of(p_profile) a), false)
     and not public.is_tablet()
$$;
revoke execute on function public.manages_team(uuid) from public, anon;
grant execute on function public.manages_team(uuid) to authenticated;

-- Who receives the family's caregiver code with the profile: the parents, the family's members and
-- the child's tablets. Not a professional (a "pro" account, or a therapist or teacher on the team):
-- she has her own code, kept with her account.
create function public.sees_code(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and not public.is_pro(auth.uid())
     and (exists (select 1 from profiles p where p.id = p_profile and p.owner_id = auth.uid())
          or coalesce((select a.role not in ('therapist', 'teacher') from public.access_of(p_profile) a), false))
$$;
revoke execute on function public.sees_code(uuid) from public, anon, authenticated;

-- A profile's content without the family's code.
create function public.no_code(d jsonb) returns jsonb
language sql immutable as $$
  select case when jsonb_typeof(d -> 'settings') = 'object' then d #- '{settings,pin}' else d end
$$;
revoke execute on function public.no_code(jsonb) from public, anon, authenticated;

-- A figure about use is shown from 5 children of 5 families. A child has one family, so 5
-- families are always at least 5 children: null means "between 1 and 4" (never a number).
create function public.shown_n(n bigint, families bigint) returns bigint
language sql immutable as $$
  select case when n = 0 or families >= 5 then n end
$$;
revoke execute on function public.shown_n(bigint, bigint) from public, anon, authenticated;

-- ───────────────────────── 1. Names ─────────────────────────

-- A person without a name was shown to the others by their e-mail address or phone number.
create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(btrim(a.display_name), '') from accounts a where a.id = auth.uid()), '—')
$$;

-- ───────────────────────── 2. While a professional owns the profile ─────────────────────────

-- The parents have not agreed to anything yet: recording and sharing stay off, at creation and
-- at every later change, whatever is sent and whoever sends it.
create or replace function public.pro_profile_rules() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not is_pro(new.owner_id) then return new; end if;
  if tg_op = 'INSERT' and not pro_cleared(new.owner_id) then raise exception 'pro_not_verified'; end if;
  if jsonb_typeof(new.data -> 'settings') = 'object' then
    new.data := jsonb_set(jsonb_set(new.data #- '{settings,shareTerms}', '{settings,dataCollection}', '"off"'), '{settings,shareStats}', '"none"');
  end if;
  return new;
end $$;
drop trigger pro_profile_rules on public.profiles;
create trigger pro_profile_rules before insert or update of data, owner_id on public.profiles
  for each row execute function public.pro_profile_rules();

-- "Agreed to share figures" is never true for such a profile.
create or replace function public.shares_product(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.data -> 'settings' ->> 'shareStats' = 'anonymous'
                          and public.num(p.data -> 'settings' -> 'shareTerms', 100) >= public.product_terms()
                          and not public.is_pro(p.owner_id)
                     from profiles p where p.id = p_profile), false)
$$;

-- The agreement to the list of what is shared: the family only, signed in as itself.
create or replace function public.guard_share_terms() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a record;
begin
  if auth.uid() is null then return new; end if;
  if coalesce(new.data -> 'settings' ->> 'shareTerms', '0') is not distinct from coalesce(old.data -> 'settings' ->> 'shareTerms', '0') then return new; end if;
  select * into a from access_of(new.id);
  if not found or not (a.owner or coalesce((a.perms ->> 'manager')::boolean, false))
     or is_pro(old.owner_id) or a.role = 'device' or is_tablet() then
    raise exception 'consent_protected' using detail = 'shareTerms';
  end if;
  return new;
end $$;

-- What was recorded or counted for such a profile before this file: erased, and the switches off.
delete from public.usage_days u using public.profiles p where p.id = u.profile_id and public.is_pro(p.owner_id);
delete from public.feature_days f using public.profiles p where p.id = f.profile_id and public.is_pro(p.owner_id);
update public.profiles p
   set data = jsonb_set(jsonb_set(p.data #- '{settings,shareTerms}', '{settings,dataCollection}', '"off"'), '{settings,shareStats}', '"none"'),
       version = p.version + 1, updated_at = now()
 where public.is_pro(p.owner_id) and jsonb_typeof(p.data -> 'settings') = 'object'
   and (coalesce(p.data -> 'settings' ->> 'dataCollection', 'off') <> 'off'
        or coalesce(p.data -> 'settings' ->> 'shareStats', 'none') <> 'none'
        or p.data -> 'settings' ? 'shareTerms');

-- ───────────────────────── 3. The profile and the family's code ─────────────────────────

-- The profile as the app reads it. The family's caregiver code is left out for a professional.
create function public.read_profile(p_id uuid)
returns table (id uuid, owner_id uuid, name text, age int, intake jsonb, data jsonb, version int, updated_at timestamptz, updated_by uuid)
language sql stable security definer set search_path = public as $$
  select p.id, p.owner_id, p.name, p.age, p.intake,
         case when public.sees_code(p.id) then p.data else public.no_code(p.data) end,
         p.version, p.updated_at, p.updated_by
    from profiles p
   where p.id = p_id and (public.owns_profile(p.owner_id) or public.can_read(p.id))
$$;
revoke execute on function public.read_profile(uuid) from public, anon;
grant execute on function public.read_profile(uuid) to authenticated;

-- The profile's content is read through that function only (the other columns stay readable:
-- the app asks the version number every 30 seconds).
revoke select (data) on public.profiles from authenticated, anon;

create or replace function public.save_profile(p_id uuid, p_data jsonb, p_base int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a record;
  cur profiles;
  d jsonb := p_data;
  k text;
  boss boolean;
  blind boolean;
begin
  select * into a from access_of(p_id);
  if not found then raise exception 'forbidden'; end if;
  select * into cur from profiles where id = p_id for update;
  boss := a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false);
  if not boss and a.level < 3 then raise exception 'forbidden'; end if;
  if jsonb_typeof(d) is distinct from 'object' or (d ? 'settings' and jsonb_typeof(d -> 'settings') <> 'object') then raise exception 'invalid'; end if;
  blind := not sees_code(p_id);
  -- (her save must carry the settings: the family's code is put back inside them)
  if blind and not d ? 'settings' then raise exception 'invalid'; end if;
  if cur.version <> p_base then
    return jsonb_build_object('ok', false, 'conflict',
      to_jsonb(cur) - 'connection_code' || case when blind then jsonb_build_object('data', no_code(cur.data)) else '{}'::jsonb end);
  end if;
  -- A professional does not hold the family's code: whatever she sends, the family's stays.
  if blind then
    d := case when jsonb_typeof(cur.data -> 'settings') = 'object' and cur.data -> 'settings' ? 'pin' then jsonb_set(d, '{settings,pin}', cur.data -> 'settings' -> 'pin')
              else d #- '{settings,pin}' end;
  end if;
  if not boss and (d -> 'boards' -> 'core') is distinct from (cur.data -> 'boards' -> 'core') then
    raise exception 'core_protected';
  end if;
  -- What is recorded, what is shared, the caregiver code (a value that is missing counts as its default).
  foreach k in array array['dataCollection:off', 'shareStats:none', 'pin:1234'] loop
    if coalesce(d -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2))
       is distinct from coalesce(cur.data -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2)) then
      -- Editors: none of the three.
      if not boss then raise exception 'consent_protected' using detail = split_part(k, ':', 1); end if;
      -- Recording and sharing: the family, signed in as itself. Not while a professional owns the
      -- profile (whoever asks), and not from a linked tablet (its screens do not offer them).
      if split_part(k, ':', 1) <> 'pin' and (is_pro(cur.owner_id) or a.role = 'device' or is_tablet()) then
        raise exception 'consent_protected' using detail = split_part(k, ':', 1);
      end if;
    end if;
  end loop;
  update profiles set data = d, version = version + 1, updated_at = now(), updated_by = auth.uid() where id = p_id;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

-- ───────────────────────── 4. Leaving a team, for good ─────────────────────────

-- One way out for everybody: the access ends, and so does everything the person could use to
-- come back (invitations written by or for them that still wait, codes they made for a tablet).
create function public.remove_from_team(p_profile uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  mail text;
begin
  select lower(u.email) into mail from auth.users u where u.id = p_user;
  update members set status = 'revoked' where profile_id = p_profile and user_id = p_user;
  update invitations set status = 'cancelled'
   where profile_id = p_profile and status = 'pending'
     and (from_user_id = p_user or to_user_id = p_user or (direction = 'invite' and mail is not null and email = mail));
  delete from pairing_codes where profile_id = p_profile and created_by = p_user;
end $$;
revoke execute on function public.remove_from_team(uuid, uuid) from public, anon, authenticated;

create or replace function public.revoke_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not manages_team(p_id) then raise exception 'forbidden'; end if;
  if not exists (select 1 from members where profile_id = p_id and user_id = p_user) then raise exception 'not_found'; end if;
  perform remove_from_team(p_id, p_user);
  perform notify(p_user, 'access', 'Votre accès au profil de ' || (select name from profiles where id = p_id) || ' a été retiré.', p_id);
end $$;

create or replace function public.cancel_invitation(p_inv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
  boss boolean;
  joined uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if is_tablet() then raise exception 'forbidden'; end if;
  select * into inv from invitations where id = p_inv;
  if not found then raise exception 'not_found'; end if;
  boss := manages_team(inv.profile_id);
  if not boss and not (inv.from_user_id is not distinct from auth.uid() and inv.status = 'pending') then
    raise exception 'forbidden';
  end if;
  if inv.status = 'accepted' then
    joined := case when inv.direction = 'request' then inv.from_user_id else inv.to_user_id end;
    -- The invitation by which the parents took the profile over is not a way to remove them.
    if exists (select 1 from profiles where id = inv.profile_id and owner_id = joined) then raise exception 'forbidden'; end if;
    if exists (select 1 from members where profile_id = inv.profile_id and user_id = joined and status = 'active') then
      perform remove_from_team(inv.profile_id, joined);
      perform notify(joined, 'access', 'Votre accès au profil de ' || inv.child_name || ' a été retiré.', inv.profile_id);
    end if;
  end if;
  update invitations set status = 'cancelled' where id = p_inv;
end $$;

-- A removed tablet: the codes it made for other tablets end with it. And a linked tablet only
-- removes other tablets, never a person's own phone or computer.
create or replace function public.revoke_device(p_id uuid, p_dev text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d devices;
  tablet boolean;
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = p_dev;
  if not found then raise exception 'not_found'; end if;
  tablet := exists (select 1 from members where profile_id = p_id and user_id = d.user_id and role = 'device');
  if not manages_team(p_id) and not tablet then raise exception 'forbidden'; end if;
  update devices set revoked = true where profile_id = p_id and id = p_dev;
  -- a device linked with a pairing code has its own access: it ends too
  if tablet then perform remove_from_team(p_id, d.user_id); end if;
end $$;

-- ───────────────────────── 5. Joining a team ─────────────────────────

create or replace function public.join_profile(inv invitations, p_user uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  was uuid;
  parent_name text;
  team text;
begin
  select owner_id into was from profiles where id = inv.profile_id for update;
  -- A tablet joins with a code made for it, never with an invitation.
  if inv.role = 'device' then raise exception 'forbidden'; end if;
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
      select inv.profile_id, was, coalesce(nullif(btrim(a.display_name), ''), '—'), u.email, 'therapist', 3,
             '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":false,"invite":false,"manageDevices":false,"manager":false,"viewData":false}'::jsonb
        from auth.users u left join accounts a on a.id = u.id where u.id = was
      on conflict (profile_id, user_id) do update set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms, expires_at = null;
    end if;
    -- The family starts with a team it knows. What the professional had set up as owner stops
    -- here: codes to link a tablet, invitations and requests still waiting, the tablets she
    -- linked (the family links its own), and any right that is the family's.
    delete from pairing_codes where profile_id = inv.profile_id;
    update invitations set status = 'cancelled' where profile_id = inv.profile_id and status = 'pending' and id <> inv.id;
    update devices set revoked = true
     where profile_id = inv.profile_id
       and user_id in (select m.user_id from members m where m.profile_id = inv.profile_id and m.role = 'device');
    update members set status = 'revoked' where profile_id = inv.profile_id and role = 'device';
    update members
       set perms = perms || '{"manager":false,"changeAccess":false,"invite":false,"manageDevices":false,"viewData":false}'::jsonb
     where profile_id = inv.profile_id;
    update invitations set status = 'accepted', to_user_id = p_user where id = inv.id;
    select coalesce(nullif(btrim(a.display_name), ''), '—') into parent_name from accounts a where a.id = p_user;
    perform notify(was, 'access', in_lang(was,
      coalesce(parent_name, '—') || ' est maintenant le parent responsable du profil de ' || inv.child_name || '. Vous restez dans son équipe.',
      coalesce(parent_name, '—') || ' is now the parent in charge of ' || inv.child_name || '''s profile. You stay on the team.',
      coalesce(parent_name, '—') || ' هو الآن ولي الأمر المسؤول عن ملف ' || inv.child_name || '. تبقى ضمن الفريق.'), inv.profile_id);
    -- The parents are told who is on the team they now run.
    select string_agg(m.display_name, ', ' order by m.created_at) into team
      from members m where m.profile_id = inv.profile_id and m.status = 'active';
    perform notify(p_user, 'access', case when team is null then in_lang(p_user,
        'Vous êtes maintenant le parent responsable du profil de ' || inv.child_name || '. Personne d''autre n''est dans son équipe.',
        'You are now the parent in charge of ' || inv.child_name || '''s profile. Nobody else is on the team.',
        'أنت الآن ولي الأمر المسؤول عن ملف ' || inv.child_name || '. لا أحد غيرك في الفريق.')
      else in_lang(p_user,
        'Vous êtes maintenant le parent responsable du profil de ' || inv.child_name || '. Dans son équipe : ' || team || '. Vous décidez de leurs droits dans Réglages → Équipe.',
        'You are now the parent in charge of ' || inv.child_name || '''s profile. On the team: ' || team || '. You decide their rights in Settings → Team.',
        'أنت الآن ولي الأمر المسؤول عن ملف ' || inv.child_name || '. في الفريق: ' || team || '. تحدّد صلاحياتهم من الإعدادات ← الفريق.') end,
      inv.profile_id);
    return;
  end if;
  insert into members (profile_id, user_id, display_name, email, role, level, perms)
  select inv.profile_id, p_user,
         case when inv.direction = 'invite' then coalesce(inv.name, nullif(btrim(a.display_name), ''), '—') else coalesce(nullif(btrim(a.display_name), ''), '—') end,
         u.email, inv.role, greatest(1, least(3, coalesce(p_level, 1))), clean_perms(p_perms)
    from auth.users u left join accounts a on a.id = u.id where u.id = p_user
  on conflict (profile_id, user_id) do update
    set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms,
        -- An access with an end date keeps it: answering an invitation that was already waiting
        -- is not a way to stay longer. An invitation written after the access ended is a new one.
        expires_at = case when members.status = 'active' and (members.expires_at is null or members.expires_at > inv.created_at)
                          then members.expires_at end;
  update invitations set status = 'accepted', to_user_id = case when direction = 'invite' then p_user else to_user_id end where id = inv.id;
end $$;

create or replace function public.invite(p_id uuid, p_email text, p_name text, p_role text, p_level int, p_perms jsonb)
returns invitations
language plpgsql security definer set search_path = public as $$
declare
  a record;
  inv invitations;
  target uuid;
  boss boolean;
  lvl int := greatest(1, least(3, coalesce(p_level, 1)));
  perms jsonb := clean_perms(p_perms);
begin
  select * into a from access_of(p_id);
  if not found or a.role = 'device' or is_tablet() then raise exception 'forbidden'; end if;
  boss := a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false);
  if not (boss or coalesce(a.perms -> 'invite' = 'true'::jsonb, false)) then raise exception 'forbidden'; end if;
  -- The role is one of the team's; "parent" is written by the owner only (it is how a
  -- professional hands a profile to the parents), "device" never.
  if p_role is null or p_role not in ('parent', 'therapist', 'teacher', 'caregiver', 'family', 'other') then
    raise exception 'invalid' using detail = 'role';
  end if;
  if p_role = 'parent' and not a.owner then raise exception 'forbidden'; end if;
  -- Someone who does not receive the family's code invites colleagues only: a "family member"
  -- invited by her would receive it.
  if not a.owner and not sees_code(p_id) and p_role not in ('therapist', 'teacher') then raise exception 'forbidden'; end if;
  perform rate_limit('invite', 30, interval '1 day');
  if not boss then
    -- Someone who may only invite gives at most what they hold, and never the family's own rights.
    lvl := least(lvl, a.level);
    perms := jsonb_build_object(
      'createMaterials', (perms -> 'createMaterials' = 'true'::jsonb) and coalesce(a.perms -> 'createMaterials' = 'true'::jsonb, false),
      'proposeVocabulary', (perms -> 'proposeVocabulary' = 'true'::jsonb) and coalesce(a.perms -> 'proposeVocabulary' = 'true'::jsonb, false),
      'viewData', (perms -> 'viewData' = 'true'::jsonb) and coalesce(a.perms -> 'viewData' = 'true'::jsonb, false),
      'changeAccess', false, 'invite', false, 'manageDevices', false, 'manager', false);
  end if;
  select id into target from auth.users where p_email is not null and lower(email) = lower(p_email) and email_confirmed_at is not null;
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, to_user_id, name, code, role, level, perms)
  values ('invite', p_id, (select name from profiles where id = p_id), auth.uid(), my_name(), lower(nullif(trim(p_email), '')), target,
          left(nullif(trim(p_name), ''), 80), friendly_code(), p_role, lvl, perms)
  returning * into inv;
  perform notify(target, 'invitation', inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

create or replace function public.request_connection(p_code text, p_role text, p_level int, p_perms jsonb, p_message text)
returns invitations
language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  inv invitations;
  m uuid;
  perms jsonb := clean_perms(p_perms);
begin
  if not code_tries_left() then raise exception 'too_many' using detail = 'wrong_code'; end if;
  if p_role is null or p_role not in ('therapist', 'teacher', 'caregiver', 'family', 'other') then
    raise exception 'invalid' using detail = 'role';
  end if;
  select * into p from profiles where connection_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if not found then
    insert into rate_log (user_id, kind) values (auth.uid(), 'wrong_code');
    return null;
  end if;
  if can_read(p.id) then raise exception 'already_member'; end if;
  select * into inv from invitations where direction = 'request' and profile_id = p.id and from_user_id = auth.uid() and status = 'pending';
  if found then return inv; end if;
  perform rate_limit('request', 10, interval '1 day');
  perms := perms || '{"changeAccess":false,"invite":false,"manageDevices":false,"manager":false}'::jsonb;
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, code, role, level, perms, message)
  values ('request', p.id, p.name, auth.uid(), my_name(), lower(auth.email()), friendly_code(), p_role,
          greatest(1, least(3, coalesce(p_level, 1))), perms, left(nullif(trim(p_message), ''), 1000))
  returning * into inv;
  for m in select managers_of(p.id) loop
    perform notify(m, 'request', inv.from_name || ' demande à rejoindre l''équipe de ' || p.name || '.', p.id, inv.id::text);
  end loop;
  return inv;
end $$;

create or replace function public.accept_invitation_code(p_code text) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  -- A person joins a team; a child's tablet is linked with its own kind of code.
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if not code_tries_left() then raise exception 'too_many' using detail = 'wrong_code'; end if;
  select * into inv from invitations
   where direction = 'invite' and status = 'pending' and created_at > now() - interval '30 days'
     and code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) for update;
  if not found then
    insert into rate_log (user_id, kind) values (auth.uid(), 'wrong_code');
    return null;
  end if;
  if inv.from_user_id = auth.uid() then raise exception 'forbidden'; end if;
  perform join_profile(inv, auth.uid(), inv.level, inv.perms);
  perform notify(inv.from_user_id, 'access', my_name() || ' a rejoint l''équipe de ' || inv.child_name || '.', inv.profile_id);
  select * into inv from invitations where id = inv.id;
  return inv;
end $$;

create or replace function public.respond_invitation(p_inv uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if is_tablet() then raise exception 'forbidden'; end if;
  select * into inv from invitations where id = p_inv and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if inv.direction = 'request' then
    if not manages_team(inv.profile_id) then raise exception 'forbidden'; end if;
    if p_accept then raise exception 'forbidden' using detail = 'use approve_request'; end if;
    update invitations set status = 'declined' where id = inv.id;
    perform notify(inv.from_user_id, 'access', 'Votre demande pour ' || inv.child_name || ' a été refusée.', inv.profile_id);
    return;
  end if;
  -- Nobody answers an invitation they wrote themselves.
  if inv.from_user_id = auth.uid() then raise exception 'forbidden'; end if;
  if not (inv.to_user_id is not distinct from auth.uid()
          or (inv.email is not null and inv.email = lower(auth.email())
              and exists (select 1 from auth.users where id = auth.uid() and email_confirmed_at is not null))) then
    raise exception 'forbidden';
  end if;
  if p_accept then
    if inv.created_at < now() - interval '30 days' then raise exception 'not_found' using detail = 'expired'; end if;
    perform join_profile(inv, auth.uid(), inv.level, inv.perms);
  else
    update invitations set status = 'declined' where id = inv.id;
  end if;
  perform notify(inv.from_user_id, 'access',
    my_name() || case when p_accept then ' a accepté' else ' a refusé' end || ' l''invitation pour ' || inv.child_name || '.', inv.profile_id);
end $$;

create or replace function public.approve_request(p_inv uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv and direction = 'request' and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if not manages_team(inv.profile_id) then raise exception 'forbidden'; end if;
  -- A request never makes a parent or a tablet, whatever it asked for.
  if inv.role not in ('therapist', 'teacher', 'caregiver', 'family', 'other') then inv.role := 'other'; end if;
  perform join_profile(inv, inv.from_user_id, p_level, clean_perms(p_perms) || '{"manager":false}'::jsonb);
  perform notify(inv.from_user_id, 'access', 'Votre demande pour ' || inv.child_name || ' a été acceptée.', inv.profile_id);
end $$;

create or replace function public.resend_invitation(p_inv uuid) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv and status = 'pending';
  if not found then raise exception 'not_found'; end if;
  if not manages_team(inv.profile_id) then raise exception 'forbidden'; end if;
  perform rate_limit('resend', 20, interval '1 day');
  update invitations set created_at = now() where id = p_inv returning * into inv;
  perform notify(inv.to_user_id, 'invitation', 'Rappel : ' || inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

create or replace function public.update_member(p_id uuid, p_user uuid, p_level int, p_perms jsonb, p_role text, p_expires timestamptz, p_set_expiry boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  was text;
begin
  if not manages_team(p_id) then raise exception 'forbidden'; end if;
  select role into was from members where profile_id = p_id and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  -- A person does not become a tablet, a tablet does not become a person; nobody changes their own role.
  if p_role is not null and p_role is distinct from was
     and (was = 'device' or p_user = auth.uid() or p_role not in ('parent', 'therapist', 'teacher', 'caregiver', 'family', 'other')) then
    raise exception 'invalid' using detail = 'role';
  end if;
  update members set
    level = coalesce(greatest(1, least(3, p_level)), level),
    perms = case when p_perms is null then perms else clean_perms(p_perms) end,
    role = coalesce(p_role, role),
    expires_at = case when p_set_expiry then p_expires else expires_at end
  where profile_id = p_id and user_id = p_user;
  perform notify(p_user, 'access', 'Vos droits sur le profil de ' || (select name from profiles where id = p_id) || ' ont changé.', p_id);
end $$;

-- ───────────────────────── 6. A tablet linked with full access ─────────────────────────

-- The family's connection code (by which professionals ask to join): the family only.
create or replace function public.connection_code(p_id uuid, p_renew boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if not manages_team(p_id) then raise exception 'forbidden'; end if;
  select connection_code into c from profiles where id = p_id;
  if c is null or p_renew then
    c := friendly_code();
    update profiles set connection_code = c where id = p_id;
  end if;
  return c;
end $$;

-- A full-access code is made by the family, signed in as itself; a tablet makes "use only" codes.
create or replace function public.create_pairing_code(p_id uuid, p_access text)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c text := strong_code(8);
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  if p_access not in ('full', 'use') then raise exception 'invalid'; end if;
  if p_access = 'full' and not manages_team(p_id) then raise exception 'forbidden'; end if;
  -- A tablet receives the family's code: a professional on the family's team links none.
  if not sees_code(p_id) and not exists (select 1 from profiles where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if p_access = 'full' and not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('pairing_code', 20, interval '1 hour');
  delete from pairing_codes
   where pairing_codes.expires_at < now() or (pairing_codes.profile_id = p_id and pairing_codes.created_by = auth.uid());
  insert into pairing_codes (code, profile_id, access, expires_at, created_by)
  values (c, p_id, p_access, now() + interval '10 minutes', auth.uid());
  return query select c, now() + interval '10 minutes';
end $$;

-- A tablet's code is typed on the tablet (its own sign-in, made for it), not from a person's
-- account: a team member who typed a full-access code became a manager and kept their role.
create or replace function public.redeem_pairing_code(p_code text, p_dev text, p_name text, p_platform text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pc pairing_codes;
  full_access boolean;
  m uuid;
begin
  if not code_tries_left() then raise exception 'too_many' using detail = 'wrong_code'; end if;
  if not is_tablet() then raise exception 'forbidden'; end if;
  select * into pc from pairing_codes
   where code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) and expires_at > now() for update;
  if not found then
    insert into rate_log (user_id, kind) values (auth.uid(), 'wrong_code');
    return null;
  end if;
  delete from pairing_codes where code = pc.code;
  full_access := pc.access = 'full';
  insert into members (profile_id, user_id, display_name, role, level, perms)
  values (pc.profile_id, auth.uid(), left(p_name, 60), 'device', case when full_access then 3 else 1 end,
          case when full_access
               then '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
               else '{"createMaterials":false,"proposeVocabulary":false,"changeAccess":false,"invite":false,"manageDevices":false,"manager":false}'::jsonb end)
  on conflict (profile_id, user_id) do update set status = 'active', role = 'device', level = excluded.level, perms = excluded.perms, expires_at = null;
  insert into devices (id, profile_id, user_id, name, kind, platform)
  values (left(p_dev, 80), pc.profile_id, auth.uid(), left(p_name, 60), case when full_access then 'primary' else 'secondary' end, left(p_platform, 40))
  on conflict (profile_id, id) do update set revoked = false, user_id = excluded.user_id;
  update accounts set display_name = left(p_name, 60), prefs = prefs || jsonb_build_object('activeProfileId', pc.profile_id) where id = auth.uid();
  for m in select managers_of(pc.profile_id) loop
    if m <> auth.uid() then
      perform notify(m, 'access', in_lang(m,
        'Un appareil vient d''être relié (' || left(p_name, 60) || case when full_access then ', accès complet' else '' end || '). Si ce n''est pas vous : Réglages → Compte → Appareils → Retirer.',
        'A device was just linked (' || left(p_name, 60) || case when full_access then ', full access' else '' end || '). If it was not you: Settings → Account → Devices → Remove.',
        'تم ربط جهاز الآن (' || left(p_name, 60) || case when full_access then '، وصول كامل' else '' end || '). إن لم تكن أنت: الإعدادات ← الحساب ← الأجهزة ← إزالة.'), pc.profile_id);
    end if;
  end loop;
  return pc.profile_id;
end $$;

-- The follow-up is read on the adults' own devices (a tablet has no "Follow-up" page).
create or replace function public.can_view_data(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (a.owner or coalesce((a.perms ->> 'manager')::boolean, false) or coalesce((a.perms ->> 'viewData')::boolean, false))
                          and a.role <> 'device'
                     from public.access_of(p_profile) a), false)
     and not public.is_tablet()
$$;

-- Erasing the follow-up, changing or deleting someone else's observation: the family only.
drop policy "erase usage" on public.usage_days;
create policy "erase usage" on public.usage_days for delete to authenticated using (public.manages_team(profile_id));
drop policy "edit observations" on public.observations;
create policy "edit observations" on public.observations for update to authenticated
  using (public.can_view_data(profile_id) and (created_by = auth.uid() or public.manages_team(profile_id)))
  with check (public.can_view_data(profile_id));
drop policy "delete observations" on public.observations;
create policy "delete observations" on public.observations for delete to authenticated
  using (public.can_view_data(profile_id) and (created_by = auth.uid() or public.manages_team(profile_id)));

-- Invitations (with their codes and addresses) and the team's addresses: the family only.
drop policy "read invitations" on public.invitations;
create policy "read invitations" on public.invitations for select to authenticated
  using (public.manages_team(profile_id)
         or (from_user_id = auth.uid() and (direction = 'request' or public.can_read(profile_id)))
         or to_user_id = auth.uid()
         or (email is not null and email = lower(auth.email())));

create or replace function public.list_members(p_id uuid)
returns table (profile_id uuid, user_id uuid, display_name text, email text, role text, level int, perms jsonb,
               status text, expires_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.profile_id, m.user_id, m.display_name,
         case when public.manages_team(p_id) or m.user_id = auth.uid() then m.email end,
         m.role, m.level, m.perms, m.status, m.expires_at, m.created_at
    from members m
   where m.profile_id = p_id and public.can_read(p_id)
   order by m.created_at
$$;

-- ───────────────────────── 7. Follow-up ─────────────────────────

-- The device's name inside the day is the server's, not what the app wrote (see save_usage_day).
create or replace function public.clean_usage(d jsonb) returns jsonb
language plpgsql immutable as $$
declare
  o jsonb := d;
  k text;
begin
  if jsonb_typeof(d) is distinct from 'object' then return '{}'::jsonb; end if;
  o := o - 'deviceId' - 'day';
  foreach k in array array['selections', 'utterances', 'searches', 'tlaCreated', 'errors', 'offlineMs'] loop
    if o ? k and jsonb_typeof(o -> k) <> 'number' then o := o - k; end if;
  end loop;
  if o ? 'stats' and jsonb_typeof(o -> 'stats') <> 'object' then o := o - 'stats'; end if;
  if o ? 'sessions' and jsonb_typeof(o -> 'sessions') <> 'array' then o := o - 'sessions'; end if;
  if o ? 'hours' and jsonb_typeof(o -> 'hours') <> 'array' then o := o - 'hours'; end if;
  if o ? 'modes' then
    o := jsonb_set(o, '{modes}', coalesce((
      select jsonb_object_agg(e.key, e.value)
        from jsonb_each(case when jsonb_typeof(o -> 'modes') = 'object' then o -> 'modes' else '{}'::jsonb end) e
       where e.key in ('core', 'folder', 'tla', 'quick', 'schedule', 'keyboard') and jsonb_typeof(e.value) = 'number'), '{}'::jsonb));
  end if;
  if o ? 'platform' then o := jsonb_set(o, '{platform}', to_jsonb(left(coalesce(o ->> 'platform', ''), 40))); end if;
  return o;
end $$;

-- A day belongs to one device: it is saved from that device (or by the family, when it takes
-- over a device another account used). A team member could overwrite the child's tablet's day.
create or replace function public.save_usage_day(p_id uuid, p_dev text, p_day date, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  lvl text;
  d jsonb;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  if exists (select 1 from profiles where id = p_id and is_pro(owner_id)) then raise exception 'forbidden' using detail = 'consent'; end if;
  if not exists (select 1 from devices where profile_id = p_id and id = p_dev and not revoked
                                           and (user_id = auth.uid() or manages_team(p_id))) then
    raise exception 'forbidden' using detail = 'device';
  end if;
  if p_day is null or p_day < current_date - 60 or p_day > current_date + 1 then raise exception 'invalid' using detail = 'day'; end if;
  if pg_column_size(p_data) > 400000 then raise exception 'too_large'; end if;
  select coalesce(data -> 'settings' ->> 'dataCollection', 'off') into lvl from profiles where id = p_id;
  if lvl is null or lvl not in ('usage', 'vocabulary', 'language') then raise exception 'forbidden'; end if;
  d := clean_usage(p_data);
  if lvl = 'usage' then d := d - 'concepts' - 'searched' - 'samples'; end if;
  if lvl = 'vocabulary' then d := d - 'samples'; end if;
  d := d || jsonb_build_object('level', lvl, 'deviceId', p_dev, 'day', to_char(p_day, 'YYYY-MM-DD'));
  insert into usage_days (profile_id, device_id, day, data, updated_at)
  values (p_id, p_dev, p_day, d, now())
  on conflict (profile_id, device_id, day) do update set data = excluded.data, updated_at = now();
end $$;

-- Reading without the right "see the progress data" answered nothing: the screen showed empty
-- charts, as if the child had not used the board.
create or replace function public.usage_of(p_id uuid, p_from date) returns setof jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not can_view_data(p_id) then raise exception 'forbidden'; end if;
  return query
    select u.data || jsonb_build_object('deviceId', u.device_id, 'day', to_char(u.day, 'YYYY-MM-DD'))
           || case when u.samples_sealed is null then '{}'::jsonb
                   else jsonb_build_object('samples', private.unseal(u.samples_sealed)::jsonb) end
      from usage_days u
     where u.profile_id = p_id and u.day >= p_from;
end $$;

-- Figures for the app's team: the same rule for the device, and the right test for "a member
-- of the app's team" (is_admin is only true once the two-step code is typed).
create or replace function public.save_feature_day(p_id uuid, p_dev text, p_day date, p_counts jsonb,
                                                   p_platform text default '', p_form text default '', p_version text default '')
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  -- Agreed to today's list: a family that agreed to a shorter one sends nothing more.
  if not shares_product(p_id) then raise exception 'forbidden' using detail = 'consent'; end if;
  -- The family's devices and the child's tablets only: a professional's own way of working is
  -- not measured here, and the team's test accounts would only blur the figures.
  if is_pro(auth.uid()) or is_team() then raise exception 'forbidden' using detail = 'role'; end if;
  if not exists (select 1 from devices where profile_id = p_id and id = p_dev and not revoked
                                           and (user_id = auth.uid() or manages_team(p_id))) then
    raise exception 'forbidden' using detail = 'device';
  end if;
  if p_day is null or p_day < current_date - 30 or p_day > current_date + 1 then raise exception 'invalid' using detail = 'day'; end if;
  if pg_column_size(p_counts) > 20000 then raise exception 'too_large'; end if;
  insert into feature_days (profile_id, device_id, day, counts, platform, form, app_version, updated_at)
  values (p_id, p_dev, p_day, clean_counts(p_counts),
          case when p_platform in ('ios', 'android', 'web') then p_platform else '?' end,
          case when p_form in ('phone', 'tablet', 'computer') then p_form else '?' end,
          clean_version(p_version), now())
  on conflict (profile_id, device_id, day) do update
    set counts = excluded.counts, platform = excluded.platform, form = excluded.form, app_version = excluded.app_version, updated_at = now();
  -- Nothing is kept longer than needed to see whether a feature is still used (the nightly job does the same).
  if random() < 0.02 then delete from feature_days where day < current_date - 180; end if;
end $$;

create or replace function public.report_problems(p_id uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  k text;
begin
  if not can_read(p_id) or not shares_product(p_id) then raise exception 'forbidden'; end if;
  if is_pro(auth.uid()) or is_team() then raise exception 'forbidden' using detail = 'role'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) > 40 then raise exception 'invalid'; end if;
  perform rate_limit('problems', 60, interval '1 day');
  for it in select * from jsonb_array_elements(p_items) loop
    k := it ->> 'kind';
    if k is null or not (k = any (array['crash', 'promise', 'sync', 'speech', 'audio', 'print', 'ai', 'mic', 'picto', 'photo'])) then continue; end if;
    insert into error_counts (day, kind, name, at, screen, platform, form, app_version, n)
    values (current_date, k,
            case when it ->> 'name' = any (array['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'NotAllowedError', 'NotFoundError',
                                                 'NotSupportedError', 'AbortError', 'NetworkError', 'QuotaExceededError', 'SecurityError', 'TimeoutError',
                                                 'DataError', 'InvalidStateError', 'BackendError'])
                 then it ->> 'name' else 'Error' end,
            case when it ->> 'at' ~ '^[0-9]{1,7}:[0-9]{1,7}$' then it ->> 'at' else '' end,
            case when it ->> 'screen' = any (array['board', 'folder', 'tla', 'schedule', 'search', 'keyboard', 'model', 'editor', 'picker', 'settings',
                                                   'guide', 'print', 'newTla', 'newSeq', 'timer', 'help', 'lock', 'data'])
                 then it ->> 'screen' else 'other' end,
            case when it ->> 'platform' in ('ios', 'android', 'web') then it ->> 'platform' else '?' end,
            case when it ->> 'form' in ('phone', 'tablet', 'computer') then it ->> 'form' else '?' end,
            clean_version(it ->> 'version'),
            greatest(1, least(50, public.num(it -> 'n', 50)))::int)
    on conflict (day, kind, name, at, screen, platform, form, app_version)
      do update set n = least(1000000, error_counts.n + excluded.n);
  end loop;
  if random() < 0.05 then delete from error_counts where day < current_date - 180; end if;
end $$;

-- ───────────────────────── 8. Observations ─────────────────────────

-- The situation, who was with the child and what happened next are free text about a child too:
-- sealed like what the child said and the adult's note.
alter table public.observations add column context_sealed bytea, add column partner_sealed bytea, add column result_sealed bytea;

create or replace function public.seal_observation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.utterance is not null then
    new.utterance_sealed := private.seal(new.utterance);
    new.utterance := null;
  elsif tg_op = 'INSERT' then
    new.utterance_sealed := null;
  end if;
  if new.note is not null then
    new.note_sealed := private.seal(new.note);
    new.note := null;
  elsif tg_op = 'INSERT' then
    new.note_sealed := null;
  end if;
  if new.context is not null then
    new.context_sealed := private.seal(new.context);
    new.context := null;
  elsif tg_op = 'INSERT' then
    new.context_sealed := null;
  end if;
  if new.partner is not null then
    new.partner_sealed := private.seal(new.partner);
    new.partner := null;
  elsif tg_op = 'INSERT' then
    new.partner_sealed := null;
  end if;
  if new.result is not null then
    new.result_sealed := private.seal(new.result);
    new.result := null;
  elsif tg_op = 'INSERT' then
    new.result_sealed := null;
  end if;
  return new;
end $$;
update public.observations set context = context, partner = partner, result = result
 where context is not null or partner is not null or result is not null;

-- An observation stays with its child: it could be moved to another profile.
revoke update (profile_id) on public.observations from authenticated;

create or replace function public.list_observations(p_id uuid)
returns table (id uuid, profile_id uuid, created_by uuid, author_name text, at timestamptz, sample_t bigint, utterance text,
               function text, context text, partner text, autonomy text, result text, note text, created_at timestamptz, updated_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not can_view_data(p_id) then raise exception 'forbidden'; end if;
  return query
    select o.id, o.profile_id, o.created_by, o.author_name, o.at, o.sample_t, private.unseal(o.utterance_sealed),
           o.function, private.unseal(o.context_sealed), private.unseal(o.partner_sealed), o.autonomy,
           private.unseal(o.result_sealed), private.unseal(o.note_sealed), o.created_at, o.updated_at
      from observations o
     where o.profile_id = p_id
     order by o.at desc;
end $$;

-- ───────────────────────── 9. Devices ─────────────────────────

-- A device that says "I am here" no longer renames itself (every linked tablet became "iPad")
-- nor changes its kind; removed devices do not count in the limit; and the call has a ceiling.
create or replace function public.register_device(p_id uuid, p_dev text, p_name text, p_kind text, p_platform text, p_version text default '')
returns devices
language plpgsql security definer set search_path = public as $$
declare
  d devices;
  known boolean;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = left(p_dev, 80);
  known := found;
  if known and d.revoked then raise exception 'device_revoked'; end if;
  perform rate_limit('device', 300, interval '1 day');
  -- A device another account used is taken over by the family, or by a person signing in on a
  -- phone or computer someone else used; a child's tablet is never taken over, and a tablet takes none.
  if known and d.user_id is distinct from auth.uid() and not manages_team(p_id)
     and (is_tablet()
          or exists (select 1 from members m where m.profile_id = p_id and m.role = 'device' and m.user_id in (d.user_id, auth.uid()))) then
    update devices set last_seen_at = now() where profile_id = p_id and id = d.id returning * into d;
    return d;
  end if;
  if not known and (select count(*) from devices where profile_id = p_id and not revoked) >= 40 then raise exception 'too_many' using detail = 'devices'; end if;
  insert into devices (id, profile_id, user_id, name, kind, platform, app_version, last_seen_at)
  values (left(p_dev, 80), p_id, auth.uid(), left(p_name, 60), case when p_kind in ('primary', 'secondary', 'companion') then p_kind else 'companion' end,
          left(coalesce(p_platform, ''), 40), left(coalesce(p_version, ''), 20), now())
  on conflict (profile_id, id) do update
    set platform = excluded.platform, app_version = excluded.app_version, last_seen_at = now(), user_id = excluded.user_id
  returning * into d;
  return d;
end $$;

-- ───────────────────────── 10. Ceilings ─────────────────────────

-- An account's name and preferences.
create function public.account_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.display_name := left(coalesce(new.display_name, ''), 80);
  if jsonb_typeof(new.prefs) is distinct from 'object' or pg_column_size(new.prefs) > 20000 then raise exception 'too_large' using detail = 'prefs'; end if;
  return new;
end $$;
revoke execute on function public.account_limits() from public, anon, authenticated;
create trigger account_limits before insert or update of display_name, prefs on public.accounts
  for each row execute function public.account_limits();

-- Materials: 500 per person; a material is tied to a child's profile only by someone on that
-- child's team (it could be tied to any profile, and was erased with it).
create or replace function public.sign_resource() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.owner_name := left(my_name(), 80);
    if (select count(*) from resources where owner_id = new.owner_id) >= 500 then raise exception 'too_many' using detail = 'resources'; end if;
  end if;
  if length(new.title) > 200 or pg_column_size(new.data) > 3000000 then raise exception 'too_large'; end if;
  if auth.uid() is not null and new.profile_id is not null
     and (tg_op = 'INSERT' or new.profile_id is distinct from old.profile_id) and not can_read(new.profile_id) then
    raise exception 'forbidden';
  end if;
  return new;
end $$;

create or replace function public.add_history(p_id uuid, p_summary text, p_ops jsonb, p_inverse jsonb, p_proposal uuid) returns history
language plpgsql security definer set search_path = public as $$
declare
  a record;
  h history;
begin
  select * into a from access_of(p_id);
  if not found or not (a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false) or a.level >= 3) then
    raise exception 'forbidden';
  end if;
  if p_proposal is not null and not exists (select 1 from proposals where id = p_proposal and profile_id = p_id) then
    raise exception 'forbidden';
  end if;
  if pg_column_size(p_ops) + pg_column_size(p_inverse) > 2000000 then raise exception 'too_large'; end if;
  perform rate_limit('history', 2000, interval '1 day');
  insert into history (profile_id, actor_id, actor_name, summary, ops, inverse, proposal_id)
  values (p_id, auth.uid(), my_name(), left(p_summary, 500), p_ops, p_inverse, p_proposal)
  returning * into h;
  return h;
end $$;

create or replace function public.update_proposal(p_prop uuid, p_title text, p_reason text, p_ops jsonb, p_base int) returns proposals
language plpgsql security definer set search_path = public as $$
declare
  prop proposals;
  a record;
  m uuid;
begin
  select * into prop from proposals where id = p_prop and author_id = auth.uid() and status in ('pending', 'revision') for update;
  if not found then raise exception 'forbidden'; end if;
  select * into a from access_of(prop.profile_id);
  if not found or (not a.owner and a.level < 2 and not coalesce(a.perms -> 'manager' = 'true'::jsonb, false)) then
    raise exception 'forbidden';
  end if;
  if pg_column_size(p_ops) > 1000000 then raise exception 'too_large'; end if;
  perform rate_limit('proposal', 60, interval '1 day');
  update proposals set
    title = coalesce(left(nullif(trim(p_title), ''), 200), title),
    reason = coalesce(left(nullif(trim(p_reason), ''), 2000), reason),
    ops = p_ops, base_version = p_base, status = 'pending', decision_note = null
  where id = p_prop
  returning * into prop;
  for m in select managers_of(prop.profile_id) loop
    perform notify(m, 'proposal', prop.author_name || ' a révisé : ' || prop.title, prop.profile_id, prop.id::text);
  end loop;
  return prop;
end $$;

-- ───────────────────────── 11. A professional's own documents ─────────────────────────

-- Once two-step sign-in is on, nothing is shown before the code is typed: the documents too.
drop policy "own verification docs: read" on storage.objects;
create policy "own verification docs: read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text and public.mfa_ok());
drop policy "own verification docs: delete" on storage.objects;
create policy "own verification docs: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text and public.mfa_ok());
drop policy "own verification docs: upload" on storage.objects;
create policy "own verification docs: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
              and not public.is_tablet() and public.mfa_ok() and name not like '%..%'
              and (select count(*) from storage.objects o
                    where o.bucket_id = 'verification-docs' and (storage.foldername(o.name))[1] = auth.uid()::text) < 20);

-- ───────────────────────── 12. "Download all my data" ─────────────────────────

-- The children's profiles a professional created are hers to download only while her
-- acceptance stands (as everything else about them). An observation is given with the child's
-- words only while the person may still read that child's follow-up. The family's code is never
-- in a professional's file.
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
    'format', 'empower-communication/export-1',
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
                                                                         'lastReminder', s.reminded_on) order by s.created_at), '[]')
                              from push_subs s where s.user_id = me),
    'boardLastOpened', (select coalesce(jsonb_agg(jsonb_build_object('profileId', v.profile_id, 'at', v.seen_at)), '[]')
                          from profile_seen v where v.profile_id = any (mine)),
    'notIncluded', 'Photos and recordings: they are files, kept in the app (each device, and the private storage of the child''s profile). Sign-in records kept by the sign-in service are given on request.');
end $$;

-- ───────────────────────── 13. The nightly clean-up ─────────────────────────

-- The counters were only cleaned "now and then", when somebody happened to write a new one.
-- An invitation nobody answered: valid 30 days, kept 30 more (it can be sent again), then erased.
create or replace function public.retention_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  out jsonb := '{}'::jsonb;
  n int;
begin
  delete from usage_days where day < current_date - interval '24 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('usageDays', n);
  -- The children's sentences (follow-up level "sentences", sealed) go after 12 months; the counts stay.
  update usage_days set samples_sealed = null where day < current_date - interval '12 months' and samples_sealed is not null;
  get diagnostics n = row_count; out := out || jsonb_build_object('sentences', n);
  delete from history where created_at < now() - interval '24 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('history', n);
  delete from notices where created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('notices', n);
  delete from feedback where created_at < now() - interval '3 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('feedback', n);
  delete from admin_log where created_at < now() - interval '5 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('adminLog', n);
  delete from invitations where status <> 'pending' and created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('invitations', n);
  delete from invitations where status = 'pending' and created_at < now() - interval '60 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('invitationsNotAnswered', n);
  delete from feature_days where day < current_date - 180;
  get diagnostics n = row_count; out := out || jsonb_build_object('featureDays', n);
  delete from error_counts where day < current_date - 180;
  get diagnostics n = row_count; out := out || jsonb_build_object('problems', n);
  delete from rate_log where at < now() - interval '2 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('recentActions', n);
  delete from ai_calls where day < current_date - 30;
  delete from ai_budget where day < current_date - 30;
  delete from storage_purge where done_at < now() - interval '30 days';
  return out;
end $$;

-- ───────────────────────── 14. Figures for the app's team ─────────────────────────

-- How many accounts, profiles, linked tablets and teams there are: plain totals, for all
-- families. Everything that says how the app is used (boards used or edited lately, devices
-- seen, changes made, every sub-group): among the families who share figures only, and from
-- 5 children of 5 families. A group of 1 to 4 is never given as a number.

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  o jsonb := '{}';
  part jsonb;
  sharing int;
  sharing_owners int;
  using_ int;
  owners_ int;
begin
  if not is_admin() then raise exception 'forbidden'; end if;

  select jsonb_build_object(
    'parents', count(*) filter (where role = 'parent'),
    'pros', count(*) filter (where role = 'pro'),
    'unconfirmed', count(*) filter (where not confirmed),
    'new7', count(*) filter (where created_at > now() - interval '7 days'),
    'new30', count(*) filter (where created_at > now() - interval '30 days'),
    'languages', (select coalesce(jsonb_object_agg(lang, n), '{}') from (select lang, count(*) n from bo_people group by 1) t),
    'weeks', (select jsonb_agg(jsonb_build_object(
                'week', w::date,
                'parents', (select count(*) from bo_people p where p.role = 'parent' and date_trunc('week', p.created_at) = w),
                'pros', (select count(*) from bo_people p where p.role = 'pro' and date_trunc('week', p.created_at) = w)) order by w)
                from generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '1 week') w))
    into part from bo_people;
  o := o || jsonb_build_object('accounts', part);

  select jsonb_build_object(
    'parents', (select count(*) from bo_people where role = 'parent'),
    'withChild', (select count(distinct owner_id) from profiles),
    'children', (select count(*) from profiles),
    'withTablet', (select count(*) from profiles p where exists (select 1 from devices d where d.profile_id = p.id and not d.revoked)),
    'withTeam', (select count(*) from profiles p where exists (
                   select 1 from members m where m.profile_id = p.id and m.status = 'active' and m.role <> 'device')),
    -- Everything about use: among the families who share figures only, and from 5 children of
    -- 5 families (null: between 1 and 4, never a number).
    'used7', (select shown_n(count(distinct d.profile_id), count(distinct p.owner_id)) from devices d join profiles p on p.id = d.profile_id
               where not d.revoked and d.last_seen_at > now() - interval '7 days' and p.data -> 'settings' ->> 'shareStats' = 'anonymous'),
    'used30', (select shown_n(count(distinct d.profile_id), count(distinct p.owner_id)) from devices d join profiles p on p.id = d.profile_id
                where not d.revoked and d.last_seen_at > now() - interval '30 days' and p.data -> 'settings' ->> 'shareStats' = 'anonymous'),
    'edited30', (select shown_n(count(*), count(distinct p.owner_id)) from profiles p
                  where p.updated_at > now() - interval '30 days' and p.data -> 'settings' ->> 'shareStats' = 'anonymous'),
    -- what these families chose to record
    'collection', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                     select coalesce(data -> 'settings' ->> 'dataCollection', 'off') k, count(*) n from profiles
                      where data -> 'settings' ->> 'shareStats' = 'anonymous' group by 1 having count(distinct owner_id) >= min_group) t),
    'sharing', (select shown_n(count(*), count(distinct owner_id)) from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous'))
    into part;
  o := o || jsonb_build_object('families', part);

  -- Devices: how many there are is a plain total. Which were seen lately, which wait to sync and
  -- what they run say how the families use the app: same rule as above.
  select jsonb_build_object(
    'total', (select count(*) from devices where not revoked),
    'seen7', shown_n(count(*) filter (where d.last_seen_at > now() - interval '7 days'),
                     count(distinct p.owner_id) filter (where d.last_seen_at > now() - interval '7 days')),
    'seen30', shown_n(count(*) filter (where d.last_seen_at > now() - interval '30 days'),
                      count(distinct p.owner_id) filter (where d.last_seen_at > now() - interval '30 days')),
    'waiting', shown_n(count(*) filter (where d.pending_changes > 0), count(distinct p.owner_id) filter (where d.pending_changes > 0)),
    'platforms', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                    select coalesce(nullif(left(d2.platform, 40), ''), '?') k, count(*) n
                      from devices d2 join profiles p2 on p2.id = d2.profile_id
                     where not d2.revoked and p2.data -> 'settings' ->> 'shareStats' = 'anonymous'
                     group by 1 having count(distinct p2.owner_id) >= min_group) t),
    'versions', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                   select coalesce(nullif(left(d2.app_version, 20), ''), '?') k, count(*) n
                     from devices d2 join profiles p2 on p2.id = d2.profile_id
                    where not d2.revoked and p2.data -> 'settings' ->> 'shareStats' = 'anonymous'
                    group by 1 having count(distinct p2.owner_id) >= min_group) t))
    into part from devices d join profiles p on p.id = d.profile_id
   where not d.revoked and p.data -> 'settings' ->> 'shareStats' = 'anonymous';
  o := o || jsonb_build_object('devices', part);

  select jsonb_build_object(
    'accounts', (select count(*) from bo_people where role = 'pro'),
    'status', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from verifications group by 1) t),
    'professions', (select coalesce(jsonb_object_agg(profession, n), '{}') from (
                      select profession, count(*) n from verifications where status <> 'draft' group by 1) t),
    'countries', (select coalesce(jsonb_object_agg(country, n), '{}') from (
                    select country, count(*) n from verifications where status <> 'draft' group by 1) t),
    'hoursToDecide', (select round(avg(extract(epoch from decided_at - submitted_at)) / 3600.0)
                        from verifications where decided_at is not null and submitted_at is not null and decided_at >= submitted_at),
    'oldestWaitingDays', (select floor(extract(epoch from now() - min(submitted_at)) / 86400.0) from verifications where status = 'pending'),
    'working', (select count(distinct m.user_id) from members m join accounts a on a.id = m.user_id
                 where a.role = 'pro' and m.status = 'active' and pro_cleared(m.user_id)),
    'childrenFollowed', (select count(distinct m.profile_id) from members m join accounts a on a.id = m.user_id
                          where a.role = 'pro' and m.status = 'active' and pro_cleared(m.user_id)))
    into part;
  o := o || jsonb_build_object('pros', part);

  select jsonb_build_object(
    'members', (select coalesce(jsonb_object_agg(role, n), '{}') from (
                  select role, count(*) n from members where status = 'active' and role <> 'device' group by 1) t),
    'invitations', (select coalesce(jsonb_object_agg(status, n), '{}') from (
                      select status, count(*) n from invitations where direction = 'invite' group by 1) t),
    'requests', (select coalesce(jsonb_object_agg(status, n), '{}') from (
                   select status, count(*) n from invitations where direction = 'request' group by 1) t),
    'proposals', (select coalesce(jsonb_object_agg(status, n), '{}') from (select status, count(*) n from proposals group by 1) t),
    'materials', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) n from resources group by 1) t),
    'shares', (select count(*) from resource_shares),
    'observations', (select count(*) from observations),
    'changes30', (select shown_n(count(*), count(distinct p.owner_id)) from history h join profiles p on p.id = h.profile_id
                   where h.created_at > now() - interval '30 days' and p.data -> 'settings' ->> 'shareStats' = 'anonymous'))
    into part;
  o := o || jsonb_build_object('teamwork', part);

  select jsonb_build_object(
    'calls30', coalesce(sum(n), 0),
    'users30', count(distinct user_id),
    'mostPerPersonDay', coalesce(max(n), 0),
    'days', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'calls', calls, 'users', users) order by day), '[]') from (
               select day, sum(n) calls, count(*) users from ai_calls where day > current_date - 30 group by day) t))
    into part from ai_calls where day > current_date - 30;
  o := o || jsonb_build_object('ai', part);

  select jsonb_build_object('new', count(*) filter (where status = 'new'), 'total', count(*),
                            'kinds', (select coalesce(jsonb_object_agg(kind, n), '{}') from (select kind, count(*) n from feedback group by 1) t))
    into part from feedback;
  o := o || jsonb_build_object('feedback', part);

  -- ── Only the families who share anonymous statistics ──
  select count(*), count(distinct owner_id) into sharing, sharing_owners from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous';
  select count(distinct child), count(distinct owner) into using_, owners_ from bo_child_days;

  part := jsonb_build_object('sharing', shown_n(sharing, sharing_owners), 'children', shown_n(using_, owners_), 'minimum', min_group, 'enough', using_ >= min_group and owners_ >= min_group, 'days', 90);
  -- at least 5 children, of at least 5 different families
  if using_ >= min_group and owners_ >= min_group then
    part := part || (
      select jsonb_build_object(
        'childDays', count(*),
        'daysPerWeek', round(count(*)::numeric / using_ / (90 / 7.0), 1),
        'minutes', round(avg(minutes), 1),
        'selections', round(avg(selections), 1),
        'utterances', round(avg(utterances), 1),
        'words', round(avg(words), 1),
        'searches', round(avg(searches), 2),
        'boardsMade', sum(boards_made),
        'errors', sum(errors),
        'offlineShare', round(sum(offline_min) / nullif(sum(minutes) + sum(offline_min), 0), 3),
        'lengths', jsonb_build_object('one', sum(len1), 'two', sum(len2), 'more', sum(len3)))
        from bo_child_days);
    part := part || jsonb_build_object(
      'places', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                   select e.key k, sum(e.value::numeric) n
                     from bo_child_days d, jsonb_array_elements(d.modes) m, jsonb_each_text(m) e
                    where e.value ~ '^[0-9]+(\.[0-9]+)?$' and e.key in ('core', 'folder', 'tla', 'quick', 'schedule', 'keyboard') group by 1) t),
      'hours', (select coalesce(jsonb_agg(n order by h), '[]') from (
                  select g.h, coalesce((select sum(x.v::numeric) from bo_child_days d, jsonb_array_elements(d.hours) arr,
                                               jsonb_array_elements_text(arr) with ordinality x(v, i)
                                         where x.i = g.h + 1 and x.v ~ '^[0-9]+(\.[0-9]+)?$'), 0) n
                    from generate_series(0, 23) g(h)) t),
      'platforms', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                      select coalesce(nullif(platform, ''), '?') k, count(distinct child) n from bo_child_days group by 1
                      having count(distinct owner) >= min_group) t),
      'weeks', (select jsonb_agg(jsonb_build_object(
                  'week', w::date,
                  'children', (select shown_n(count(distinct d.child), count(distinct d.owner)) from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'minutes', (select case when count(distinct d.owner) >= min_group then round(avg(d.minutes), 1) end
                                from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'selections', (select case when count(distinct d.owner) >= min_group then round(avg(d.selections), 1) end
                                   from bo_child_days d where date_trunc('week', d.day::timestamp) = w)) order by w)
                  from generate_series(date_trunc('week', current_date::timestamp) - interval '11 weeks',
                                       date_trunc('week', current_date::timestamp), interval '1 week') w),
      -- Age groups with fewer than 5 children of 5 families are left out.
      'ages', (select coalesce(jsonb_agg(jsonb_build_object('band', band, 'children', children, 'minutes', minutes, 'selections', selections,
                                                            'longer', longer) order by band), '[]') from (
                 select case when age is null then '?' when age <= 3 then '0-3' when age <= 6 then '4-6'
                             when age <= 10 then '7-10' when age <= 14 then '11-14' else '15+' end band,
                        count(distinct child) children, round(avg(minutes), 1) minutes, round(avg(selections), 1) selections,
                        round(sum(len2 + len3) / nullif(sum(len1 + len2 + len3), 0), 3) longer
                   from bo_child_days group by 1 having count(distinct owner) >= min_group) t));
  end if;
  o := o || jsonb_build_object('usage', part);

  -- How these families set the app up (which languages, which options): counts per choice.
  if sharing >= min_group and sharing_owners >= min_group then
    select jsonb_build_object(
      'children', sharing,
      'minimum', min_group,
      'choices', (select coalesce(jsonb_object_agg(key, dist), '{}') from (
        select key, jsonb_object_agg(val, n) dist from (
          select c.key, coalesce(c.val, '?') val, count(*) n
            from profiles p, lateral (select p.data -> 'settings' s) x, lateral (values
              ('lang', x.s ->> 'lang'),
              ('langs', (select string_agg(l, '+' order by l) from jsonb_array_elements_text(
                           case when jsonb_typeof(x.s -> 'langs') = 'array' then x.s -> 'langs' else '[]'::jsonb end) l)),
              ('arabic', coalesce(x.s ->> 'arabic', 'lb')),
              ('uiLang', x.s ->> 'uiLang'),
              ('level', x.s ->> 'revealLevel'),
              ('symbols', x.s ->> 'symbolSet'),
              ('visual', coalesce(x.s ->> 'visual', 'standard')),
              ('access', coalesce(x.s ->> 'access', 'release')),
              ('voice', coalesce(x.s ->> 'voiceKind', 'device') || '/' || coalesce(x.s ->> 'voiceAge', 'adult')),
              ('grammar', x.s ->> 'grammar'),
              ('quickZone', x.s ->> 'quickZone'),
              ('ai', x.s ->> 'aiSuggestions'),
              ('weekPlan', x.s -> 'plans' ->> 'week'),
              ('monthPlan', x.s -> 'plans' ->> 'month'),
              ('recording', coalesce(x.s ->> 'dataCollection', 'off'))
            ) c(key, val)
           where x.s ->> 'shareStats' = 'anonymous'
           group by 1, 2 having count(distinct p.owner_id) >= min_group) t group by key) t2),
      'averages', (select jsonb_build_object(
          'activityBoards', round(avg(case when jsonb_typeof(data -> 'tlaOrder') = 'array' then jsonb_array_length(data -> 'tlaOrder') else 0 end), 1),
          'ownWords', round(avg((select count(*) from jsonb_object_keys(
                        case when jsonb_typeof(data -> 'customConcepts') = 'object' then data -> 'customConcepts' else '{}'::jsonb end))), 1),
          'changedWords', round(avg((select count(*) from jsonb_object_keys(
                            case when jsonb_typeof(data -> 'overrides') = 'object' then data -> 'overrides' else '{}'::jsonb end))), 1),
          'schedules', round(avg(case when jsonb_typeof(data -> 'schedules') = 'array' then jsonb_array_length(data -> 'schedules') else 0 end), 1),
          'demonstrations', round(avg(case when jsonb_typeof(data -> 'demos') = 'array' then jsonb_array_length(data -> 'demos') else 0 end), 1))
        from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous'))
      into part;
  else
    part := jsonb_build_object('children', shown_n(sharing, sharing_owners), 'minimum', min_group);
  end if;
  o := o || jsonb_build_object('setup', part);

  return o || jsonb_build_object('at', now());
end $$;

create or replace function public.admin_product() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  agreed int;
  agreed_families int;
  children int;
  families int;
  children30 int;
  families30 int;
  o jsonb;
  part jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select count(*), count(distinct p.owner_id) into agreed, agreed_families from profiles p where shares_product(p.id);
  select count(distinct f.profile_id), count(distinct p.owner_id) into children, families
    from feature_days f join profiles p on p.id = f.profile_id
   where f.day > current_date - 90 and shares_product(p.id);
  -- A group of 1 to 4 is never a number (null).
  o := jsonb_build_object('agreed', shown_n(agreed, agreed_families), 'children', shown_n(children, families), 'minimum', min_group,
                          'enough', children >= min_group and families >= min_group, 'days', 90);
  if children < min_group or families < min_group then return o || jsonb_build_object('at', now()); end if;

  -- Each feature: used regularly (4 days or more in the last 30), now and then (1 to 3 days),
  -- given up (used in the last 90 days, not in the last 30), or never used.
  with base as (
    select f.profile_id, p.owner_id, f.day, f.counts
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 90 and shares_product(p.id)),
  keys as (select k, ord from unnest(product_features()) with ordinality as t(k, ord)),
  per as (
    select k.k, k.ord, b.profile_id, b.owner_id,
           count(distinct b.day) filter (where b.day > current_date - 30 and public.num(b.counts -> k.k) > 0) as d30,
           bool_or(public.num(b.counts -> k.k) > 0) as any90
      from keys k cross join base b
     group by k.k, k.ord, b.profile_id, b.owner_id),
  seg as (
    select k, ord,
           count(*) filter (where d30 >= 4) as regular, count(distinct owner_id) filter (where d30 >= 4) as rf,
           count(*) filter (where d30 between 1 and 3) as occasional, count(distinct owner_id) filter (where d30 between 1 and 3) as ofam,
           count(*) filter (where d30 = 0 and any90) as abandoned, count(distinct owner_id) filter (where d30 = 0 and any90) as af,
           count(*) filter (where not any90) as never, count(distinct owner_id) filter (where not any90) as nf,
           count(distinct owner_id) filter (where d30 >= 1) as uf, count(distinct owner_id) filter (where d30 = 0) as nuf
      from per group by k, ord)
  select jsonb_agg(
           case
             -- (each group: none, or 5 children of 5 families)
             when product_shown(regular, rf) and product_shown(occasional, ofam) and product_shown(abandoned, af) and product_shown(never, nf)
               then jsonb_build_object('key', k, 'regular', regular, 'occasional', occasional, 'abandoned', abandoned, 'never', never)
             when product_shown(regular + occasional, uf) and product_shown(abandoned + never, nuf)
               then jsonb_build_object('key', k, 'using', regular + occasional, 'notUsing', abandoned + never)
             when uf >= min_group then jsonb_build_object('key', k, 'few', 'notUsing')
             when nuf >= min_group then jsonb_build_object('key', k, 'few', 'using')
             else jsonb_build_object('key', k, 'hidden', true)
           end order by ord)
    into part from seg;
  o := o || jsonb_build_object('features', coalesce(part, '[]'::jsonb));

  -- Seen and used, last 30 days: children who used the feature, who had its button or panel on
  -- screen without using it, who never had it on screen. Only the days counted by a version of
  -- the app that counts what is seen (the board itself is then always "seen"). When a group is
  -- too small, two are put together; when that is not enough either, nothing is shown.
  with r as (
    select f.profile_id, p.owner_id, f.counts
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 30 and shares_product(p.id) and public.num(f.counts -> 'seen:board') > 0),
  keys as (select k, ord from unnest(product_features()) with ordinality as t(k, ord)),
  per as (
    select k.k, k.ord, r.profile_id, r.owner_id,
           bool_or(public.num(r.counts -> k.k) > 0) as used,
           bool_or(public.num(r.counts -> k.k) > 0 or public.num(r.counts -> ('seen:' || k.k)) > 0) as seen
      from keys k cross join r
     group by k.k, k.ord, r.profile_id, r.owner_id),
  g as (
    select k, ord,
           count(*) filter (where used) as u, count(distinct owner_id) filter (where used) as uf,
           count(*) filter (where seen and not used) as so, count(distinct owner_id) filter (where seen and not used) as sof,
           count(*) filter (where not seen) as ns, count(distinct owner_id) filter (where not seen) as nsf,
           count(*) filter (where seen) as sa, count(distinct owner_id) filter (where seen) as saf,
           count(*) filter (where not used) as nu, count(distinct owner_id) filter (where not used) as nuf
      from per group by k, ord)
  select jsonb_agg(
           case
             when product_shown(u, uf) and product_shown(so, sof) and product_shown(ns, nsf)
               then jsonb_build_object('key', k, 'used', u, 'seenOnly', so, 'unseen', ns)
             when product_shown(u, uf) and product_shown(nu, nuf) then jsonb_build_object('key', k, 'used', u, 'notUsed', nu)
             when product_shown(sa, saf) and product_shown(ns, nsf) then jsonb_build_object('key', k, 'seen', sa, 'unseen', ns)
             else jsonb_build_object('key', k, 'hidden', true)
           end order by ord)
    into part from g;
  o := o || jsonb_build_object('seen', coalesce(part, '[]'::jsonb));

  -- The features by version of the app, last 30 days: a version is named when 5 children of 5
  -- families used it (the 4 most recent at most); the others and the unknown ones together are
  -- "other", shown on the same rule. A child who changed version counts in both.
  with r as (
    select f.profile_id, p.owner_id, nullif(clean_version(f.app_version), '') as v, f.counts
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 30 and shares_product(p.id)),
  named as (
    select v from r where v is not null group by v
    having count(distinct profile_id) >= min_group and count(distinct owner_id) >= min_group
     order by string_to_array(v, '.')::int[] desc limit 4),
  r2 as (
    select r.profile_id, r.owner_id, coalesce((select n.v from named n where n.v = r.v), 'other') as grp, r.counts from r),
  grps as (
    select grp, count(distinct profile_id) as n from r2 group by grp
    having count(distinct profile_id) >= min_group and count(distinct owner_id) >= min_group),
  keys as (select k, ord from unnest(product_features()) with ordinality as t(k, ord)),
  per as (
    select r2.grp, k.k, k.ord, r2.profile_id, r2.owner_id, bool_or(public.num(r2.counts -> k.k) > 0) as used
      from r2 join grps using (grp) cross join keys k
     group by r2.grp, k.k, k.ord, r2.profile_id, r2.owner_id),
  cells as (
    select grp, k, ord,
           count(*) filter (where used) as u, count(distinct owner_id) filter (where used) as uf,
           count(*) filter (where not used) as nu, count(distinct owner_id) filter (where not used) as nuf
      from per group by grp, k, ord)
  select jsonb_agg(jsonb_build_object(
           'version', gs.grp, 'children', gs.n,
           'features', (select jsonb_agg(
                                 case
                                   when product_shown(c.u, c.uf) and product_shown(c.nu, c.nuf) then jsonb_build_object('key', c.k, 'used', c.u)
                                   when product_shown(c.u, c.uf) then jsonb_build_object('key', c.k, 'few', 'notUsing')
                                   when product_shown(c.nu, c.nuf) then jsonb_build_object('key', c.k, 'few', 'using')
                                   else jsonb_build_object('key', c.k, 'hidden', true)
                                 end order by c.ord)
                          from cells c where c.grp = gs.grp))
         order by gs.grp = 'other', case when gs.grp <> 'other' then string_to_array(gs.grp, '.')::int[] end desc)
    into part from grps gs;
  o := o || jsonb_build_object('byVersion', coalesce(part, '[]'::jsonb));

  -- What happened inside the tasks, last 30 days: a sum is given only when 5 children of 5
  -- families took part in it.
  select count(distinct f.profile_id), count(distinct p.owner_id) into children30, families30
    from feature_days f join profiles p on p.id = f.profile_id
   where f.day > current_date - 30 and shares_product(p.id);
  select coalesce(jsonb_object_agg(key, total), '{}'::jsonb) into part from (
    select e.key, sum(public.num(e.value, 86400000)) as total
      from feature_days f join profiles p on p.id = f.profile_id, jsonb_each(f.counts) e
     where f.day > current_date - 30 and shares_product(p.id) and e.key = any (product_keys()) and position(':' in e.key) = 0
       and public.num(e.value, 86400000) > 0
     group by e.key
    having count(distinct f.profile_id) >= min_group and count(distinct p.owner_id) >= min_group) t;
  o := o || jsonb_build_object('children30', shown_n(children30, families30), 'tasks', case when children30 >= min_group and families30 >= min_group then part else '{}'::jsonb end);

  -- How long people waited, last 30 days: how many times in each step. A kind of wait is shown
  -- from 5 children of 5 families; a step that only 1 to 4 children met is "few", not a number.
  with e as (
    select f.profile_id, p.owner_id, split_part(x.key, ':', 1) as kind, split_part(x.key, ':', 2) as step, public.num(x.value, 100000) as n
      from feature_days f join profiles p on p.id = f.profile_id, jsonb_each(f.counts) x
     where f.day > current_date - 30 and shares_product(p.id) and x.key = any (product_keys())
       and split_part(x.key, ':', 1) = any (product_speeds()) and public.num(x.value, 100000) > 0),
  kinds as (
    select kind, count(distinct profile_id) as n from e group by kind
    having count(distinct profile_id) >= min_group and count(distinct owner_id) >= min_group),
  cells as (
    select k.kind, b.step, coalesce(sum(e.n), 0) as total, count(distinct e.profile_id) as c, count(distinct e.owner_id) as cf
      from kinds k cross join unnest(product_speed_buckets()) as b(step) left join e on e.kind = k.kind and e.step = b.step
     group by k.kind, b.step)
  select jsonb_agg(jsonb_build_object(
           'key', k.kind, 'children', k.n,
           'buckets', (select jsonb_object_agg(c.step, case when c.c = 0 then to_jsonb(0)
                                                            when product_shown(c.c, c.cf) then to_jsonb(c.total)
                                                            else to_jsonb('few'::text) end)
                         from cells c where c.kind = k.kind))
         order by array_position(product_speeds(), k.kind))
    into part from kinds k;
  o := o || jsonb_build_object('speed', coalesce(part, '[]'::jsonb));

  -- The same children by kind of device (a kind used by fewer than 5 children is left out).
  select coalesce(jsonb_object_agg(form, n), '{}'::jsonb) into part from (
    select f.form, count(distinct f.profile_id) as n
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 30 and shares_product(p.id)
     group by f.form
    having count(distinct f.profile_id) >= min_group and count(distinct p.owner_id) >= min_group) t;
  return o || jsonb_build_object('forms', part, 'at', now());
end $$;

-- The weekly e-mail to the team: the same rule (it tested 5 children, not 5 families, and wrote
-- the exact number under 5).
create or replace function public.team_week_figures() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  d0 date := current_date - 7;
  d1 date := current_date;
  o jsonb;
  kids int;
  fams int;
  usage jsonb;
begin
  o := jsonb_build_object(
    'from', d0, 'to', d1 - 1,
    'accounts', (select jsonb_build_object(
        'newParents', count(*) filter (where role = 'parent' and created_at >= d0 and created_at < d1),
        'newPros', count(*) filter (where role = 'pro' and created_at >= d0 and created_at < d1),
        'parents', count(*) filter (where role = 'parent'),
        'pros', count(*) filter (where role = 'pro'),
        'unconfirmed', count(*) filter (where not confirmed)) from bo_people),
    'boards', jsonb_build_object(
        'profiles', (select count(*) from profiles),
        'tablets', (select count(*) from devices where not revoked),
        -- about use: the families who share figures only, from 5 children of 5 families (null: fewer)
        'used7', (select shown_n(count(distinct d.profile_id), count(distinct p.owner_id)) from devices d join profiles p on p.id = d.profile_id
                   where not d.revoked and d.last_seen_at >= d0 and p.data -> 'settings' ->> 'shareStats' = 'anonymous')),
    'pros', jsonb_build_object(
        'waiting', (select count(*) from verifications where status = 'pending'),
        'oldestDays', (select floor(extract(epoch from now() - min(submitted_at)) / 86400.0) from verifications where status = 'pending'),
        'verified7', (select count(*) from verifications where status = 'verified' and decided_at >= d0 and decided_at < d1),
        'rejected7', (select count(*) from verifications where status = 'rejected' and decided_at >= d0 and decided_at < d1),
        'moreInfo7', (select count(*) from verifications where status = 'more_info' and decided_at >= d0 and decided_at < d1),
        'verified', (select count(*) from verifications where status = 'verified')),
    'messages', jsonb_build_object(
        'new7', (select count(*) from feedback where created_at >= d0 and created_at < d1),
        'open', (select count(*) from feedback where status = 'new')),
    'ai', jsonb_build_object('calls7', (select coalesce(sum(n), 0) from ai_calls where day >= d0 and day < d1)));

  select count(distinct child), count(distinct owner) into kids, fams from bo_child_days where day >= d0 and day < d1;
  usage := jsonb_build_object('children', shown_n(kids, fams), 'minimum', min_group, 'enough', fams >= min_group);
  if fams >= min_group then
    usage := usage || (
      select jsonb_build_object(
        'daysPerChild', round(count(*)::numeric / kids, 1),
        'minutes', round(avg(minutes), 1),
        'selections', round(avg(selections), 1),
        'utterances', round(avg(utterances), 1),
        'words', round(avg(words), 1))
        from bo_child_days where day >= d0 and day < d1);
  end if;
  return o || jsonb_build_object('usage', usage);
end $$;

create or replace function public.team_week_text(f jsonb) returns text
language sql immutable as $$
  select concat_ws(E'\n',
    'Week from ' || to_char((f ->> 'from')::date, 'FMDD Mon') || ' to ' || to_char((f ->> 'to')::date, 'FMDD Mon YYYY'),
    '',
    'ACCOUNTS',
    '- New parents this week: ' || (f #>> '{accounts,newParents}'),
    '- New professionals this week: ' || (f #>> '{accounts,newPros}'),
    '- Parents in total: ' || (f #>> '{accounts,parents}'),
    '- Professionals in total: ' || (f #>> '{accounts,pros}'),
    '- Address not confirmed yet: ' || (f #>> '{accounts,unconfirmed}'),
    '',
    'CHILDREN''S BOARDS',
    '- Profiles: ' || (f #>> '{boards,profiles}'),
    '- Tablets linked: ' || (f #>> '{boards,tablets}'),
    '- Boards used this week (families who share anonymous statistics): '
      || coalesce(f #>> '{boards,used7}', 'fewer than ' || (f #>> '{usage,minimum}') || ' families, not shown'),
    '',
    'PROFESSIONALS',
    '- Waiting for your decision: ' || (f #>> '{pros,waiting}')
      || coalesce(' (oldest: ' || (f #>> '{pros,oldestDays}') || ' days)', ''),
    '- Decided this week: verified ' || (f #>> '{pros,verified7}') || ', refused ' || (f #>> '{pros,rejected7}')
      || ', asked for more information ' || (f #>> '{pros,moreInfo7}'),
    '- Verified in total: ' || (f #>> '{pros,verified}'),
    '',
    'MESSAGES FROM USERS',
    '- New this week: ' || (f #>> '{messages,new7}'),
    '- Not handled yet: ' || (f #>> '{messages,open}'),
    '',
    'AI HELPER',
    '- Requests this week: ' || (f #>> '{ai,calls7}'),
    '',
    'USE OF THE BOARDS (only families who share anonymous statistics)',
    case when (f #>> '{usage,enough}')::boolean then concat_ws(E'\n',
      '- Children who used their board this week: ' || (f #>> '{usage,children}'),
      '- Days of use per child: ' || (f #>> '{usage,daysPerChild}'),
      '- On a day of use: ' || (f #>> '{usage,minutes}') || ' minutes, ' || (f #>> '{usage,selections}') || ' words touched, '
        || (f #>> '{usage,utterances}') || ' sentences, ' || (f #>> '{usage,words}') || ' different words')
    else '- Not shown this week. Figures appear from ' || (f #>> '{usage,minimum}') || ' children of '
        || (f #>> '{usage,minimum}') || ' families, so that nobody can be recognised.' end,
    '',
    'Counts only: no name, no word, no sentence. Charts and details: the back office, in the app.',
    'Sent automatically by the app''s server every Monday.') $$;
