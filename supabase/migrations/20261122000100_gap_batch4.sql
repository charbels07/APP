-- Gap review of November 2026, batch 4: people and rights.
--
--   1. A second parent: "Acts as a parent" is given or taken by the parent who owns the profile
--      only, after a fresh proof. Nobody else gives the family's rights; nobody changes their own.
--   2. "Manage devices" now means something: the person sees the child's devices, removes a
--      tablet and makes "use only" codes (never a full-access one, never someone's own phone).
--   3. The parent in charge can hand the child to the other parent (who accepts, with consent).
--   4. Deleting one's account erases only the children the person was shown and agreed to erase;
--      the rest of the team is told.
--   5. Leaving a team; asking again after a refusal.
--   6. Renaming a child, changing the age.
--   7. Therapists and teachers on a team are verified professional accounts. Until then (and for
--      those already on a team) their access waits; the child's board and the family are untouched.
--      A place for "has paid" is ready (open for everyone today).
--
-- The app keeps working before this file is run (it then uses the older functions).

-- ───────────────────────── 0. Who may be on a team as a professional ─────────────────────────

-- Payment does not exist yet: every professional "has paid". When it exists, this is the only
-- place to change (the database decides, never the app).
create function public.pro_paid(p_user uuid) returns boolean
language sql stable as $$
  select p_user is not null
$$;
revoke execute on function public.pro_paid(uuid) from public, anon, authenticated;

-- A therapist or a teacher is a professional account accepted by the app's team (and, later,
-- paid). Other roles: as before (a professional's account must be accepted, a family's is).
create function public.member_cleared(p_user uuid, p_role text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pro_cleared(p_user)
     and (coalesce(p_role, '') not in ('therapist', 'teacher') or (public.is_pro(p_user) and public.pro_paid(p_user)))
$$;
revoke execute on function public.member_cleared(uuid, text) from public, anon, authenticated;

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
     and member_cleared(m.user_id, m.role) and mfa_ok()
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
                       and (m.expires_at is null or m.expires_at > now()) and member_cleared(m.user_id, m.role)
   where p.deleted_at is null
     and ((p.owner_id = auth.uid() and pro_cleared(auth.uid())) or m.user_id is not null) and mfa_ok()
   order by p.name
$$;

create or replace function public.managers_of(p_profile uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select owner_id from profiles where id = p_profile
  union
  select user_id from members
   where profile_id = p_profile and status = 'active' and coalesce(perms -> 'manager' = 'true'::jsonb, false)
     and (expires_at is null or expires_at > now()) and member_cleared(user_id, role)
$$;

-- Joining a team, or a new role on it: a therapist or a teacher needs a professional account.
create or replace function public.cleared_to_join() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active' or old.role is distinct from new.role) then
    if new.role in ('therapist', 'teacher') and not is_pro(new.user_id) then raise exception 'pro_account_needed'; end if;
    if not member_cleared(new.user_id, new.role) then raise exception 'pro_not_verified'; end if;
  end if;
  return new;
end $$;

-- Those already on a team as therapist or teacher without such an account are told once (their
-- access waits; the family can give them another role from the Team page).
select public.notify(m.user_id, 'access', public.in_lang(m.user_id,
         'Votre accès au profil de ' || p.name || ' attend : les thérapeutes et les enseignants ont besoin d''un compte professionnel vérifié par notre équipe.',
         'Your access to ' || p.name || '''s profile is waiting: therapists and teachers need a professional account checked by our team.',
         'وصولك إلى ملف ' || p.name || ' في الانتظار: يحتاج المعالجون والمعلمون إلى حساب مهني تتحقق منه فرقتنا.'), m.profile_id)
  from public.members m join public.profiles p on p.id = m.profile_id and p.deleted_at is null
 where m.status = 'active' and m.role in ('therapist', 'teacher') and not public.member_cleared(m.user_id, m.role);

-- The team list says who is waiting for that (the family sees why someone cannot open the board).
drop function public.list_members(uuid);
create function public.list_members(p_id uuid)
returns table (profile_id uuid, user_id uuid, display_name text, email text, role text, level int, perms jsonb,
               status text, expires_at timestamptz, created_at timestamptz, waiting boolean)
language sql stable security definer set search_path = public as $$
  select m.profile_id, m.user_id, m.display_name,
         case when public.manages_team(p_id) or m.user_id = auth.uid() then m.email end,
         m.role, m.level, m.perms, m.status, m.expires_at, m.created_at,
         m.status = 'active' and not public.member_cleared(m.user_id, m.role)
    from members m
   where m.profile_id = p_id and public.can_read(p_id)
   order by m.created_at
$$;
revoke execute on function public.list_members(uuid) from public, anon;
grant execute on function public.list_members(uuid) to authenticated;

-- ───────────────────────── 1. "Acts as a parent": the owner only ─────────────────────────

-- The account that owns the profile, signed in as itself (not a tablet). For a family's profile,
-- that is the parent in charge; for a profile a professional prepares, the professional.
create function public.owns_as_parent(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = p_profile and p.deleted_at is null and p.owner_id = auth.uid()
                                          and owns_profile(p.owner_id))
     and not is_tablet()
$$;
revoke execute on function public.owns_as_parent(uuid) from public, anon, authenticated;

-- A family's account, a real person (not a tablet's sign-in).
create function public.is_family_person(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from accounts a join auth.users u on u.id = a.id
                  where a.id = p_user and a.role = 'parent' and not coalesce(u.is_anonymous, false))
$$;
revoke execute on function public.is_family_person(uuid) from public, anon, authenticated;

create or replace function public.update_member(p_id uuid, p_user uuid, p_level int, p_perms jsonb, p_role text, p_expires timestamptz, p_set_expiry boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  cur members;
  boss boolean;
  was_parent boolean;
  now_parent boolean;
  new_role text;
  new_level int;
  new_perms jsonb;
begin
  if not manages_team(p_id) then raise exception 'forbidden'; end if;
  -- Nobody changes their own access (a co-parent giving herself more, a member changing her role).
  if p_user = auth.uid() then raise exception 'forbidden'; end if;
  select * into cur from members where profile_id = p_id and user_id = p_user for update;
  if not found then raise exception 'not_found'; end if;
  -- A tablet is removed from Devices; it does not get rights here.
  if cur.role = 'device' then raise exception 'forbidden'; end if;
  -- (a professional who prepares a profile gives nobody the family's place: the parents take it)
  boss := owns_as_parent(p_id) and not is_pro(auth.uid());
  was_parent := coalesce(cur.perms -> 'manager' = 'true'::jsonb, false);
  now_parent := case when p_perms is null then was_parent else coalesce(p_perms -> 'manager' = 'true'::jsonb, false) end;
  -- Someone who acts as a parent, and the switch itself: the parent who owns the profile only.
  if (was_parent or now_parent) and not boss then raise exception 'forbidden'; end if;
  if now_parent is distinct from was_parent then
    if not fresh_proof() then raise exception 'proof_needed'; end if;
    -- A parent is a family's account (never a professional, never a tablet).
    if now_parent and not is_family_person(p_user) then raise exception 'invalid' using detail = 'parent'; end if;
  end if;
  if now_parent then
    new_role := 'parent';
    new_level := 3;
    new_perms := '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true,"viewData":true}'::jsonb;
  else
    -- "parent" is only the switch's role: switched off, the person stays as a family member.
    new_role := coalesce(p_role, case when cur.role = 'parent' then 'family' else cur.role end);
    if new_role not in ('therapist', 'teacher', 'caregiver', 'family', 'other') then raise exception 'invalid' using detail = 'role'; end if;
    new_level := coalesce(greatest(1, least(3, p_level)), cur.level);
    new_perms := (case when p_perms is null then cur.perms else clean_perms(p_perms) end) || '{"manager":false}'::jsonb;
    if was_parent then new_perms := new_perms || '{"changeAccess":false,"invite":false,"manageDevices":false}'::jsonb; end if;
  end if;
  update members set
    level = new_level,
    perms = new_perms,
    role = new_role,
    expires_at = case when now_parent then null when p_set_expiry then p_expires else expires_at end
  where profile_id = p_id and user_id = p_user;
  perform notify(p_user, 'access', 'Vos droits sur le profil de ' || (select name from profiles where id = p_id) || ' ont changé.', p_id);
end $$;

-- Removing someone who acts as a parent: the owner only (a co-parent does not remove the other).
create or replace function public.revoke_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  cur members;
begin
  if not manages_team(p_id) then raise exception 'forbidden'; end if;
  select * into cur from members where profile_id = p_id and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  if coalesce(cur.perms -> 'manager' = 'true'::jsonb, false) and cur.role <> 'device' and not owns_as_parent(p_id) then
    raise exception 'forbidden';
  end if;
  perform remove_from_team(p_id, p_user);
  perform notify(p_user, 'access', 'Votre accès au profil de ' || (select name from profiles where id = p_id) || ' a été retiré.', p_id);
end $$;

-- An invitation never gives "acts as a parent" (that is the switch, after the person joined).
-- "parent" stays the role by which a professional hands a profile she prepared to the parents.
-- A therapist or a teacher is invited as a professional: an address that belongs to a family's
-- account is refused at once (the invitation could never be accepted).
create or replace function public.invite(p_id uuid, p_email text, p_name text, p_role text, p_level int, p_perms jsonb)
returns invitations
language plpgsql security definer set search_path = public as $$
declare
  a record;
  inv invitations;
  target uuid;
  boss boolean;
  lvl int := greatest(1, least(3, coalesce(p_level, 1)));
  perms jsonb := clean_perms(p_perms) || '{"manager":false}'::jsonb;
begin
  select * into a from access_of(p_id);
  if not found or a.role = 'device' or is_tablet() then raise exception 'forbidden'; end if;
  boss := a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false);
  if not (boss or coalesce(a.perms -> 'invite' = 'true'::jsonb, false)) then raise exception 'forbidden'; end if;
  if p_role is null or p_role not in ('parent', 'therapist', 'teacher', 'caregiver', 'family', 'other') then
    raise exception 'invalid' using detail = 'role';
  end if;
  if p_role = 'parent' and not (a.owner and exists (select 1 from profiles where id = p_id and is_pro(owner_id))) then
    raise exception 'forbidden';
  end if;
  if not a.owner and not sees_code(p_id) and p_role not in ('therapist', 'teacher') then raise exception 'forbidden'; end if;
  perform rate_limit('invite', 30, interval '1 day');
  if not boss then
    lvl := least(lvl, a.level);
    perms := jsonb_build_object(
      'createMaterials', (perms -> 'createMaterials' = 'true'::jsonb) and coalesce(a.perms -> 'createMaterials' = 'true'::jsonb, false),
      'proposeVocabulary', (perms -> 'proposeVocabulary' = 'true'::jsonb) and coalesce(a.perms -> 'proposeVocabulary' = 'true'::jsonb, false),
      'viewData', (perms -> 'viewData' = 'true'::jsonb) and coalesce(a.perms -> 'viewData' = 'true'::jsonb, false),
      'changeAccess', false, 'invite', false, 'manageDevices', false, 'manager', false);
  end if;
  select id into target from auth.users where p_email is not null and lower(email) = lower(p_email) and email_confirmed_at is not null;
  if p_role in ('therapist', 'teacher') and target is not null and not is_pro(target) then raise exception 'pro_account_needed'; end if;
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, to_user_id, name, code, role, level, perms)
  values ('invite', p_id, (select name from profiles where id = p_id), auth.uid(), my_name(), lower(nullif(trim(p_email), '')), target,
          left(nullif(trim(p_name), ''), 80), friendly_code(), p_role, lvl, perms)
  returning * into inv;
  perform notify(target, 'invitation', inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

-- Cancelling the invitation by which someone joined removes them: not someone who acts as a
-- parent, except by the owner (as revoke_member).
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
    if exists (select 1 from profiles where id = inv.profile_id and owner_id = joined) then raise exception 'forbidden'; end if;
    if exists (select 1 from members where profile_id = inv.profile_id and user_id = joined and status = 'active'
                                     and role <> 'device' and coalesce(perms -> 'manager' = 'true'::jsonb, false))
       and not owns_as_parent(inv.profile_id) then
      raise exception 'forbidden';
    end if;
    if exists (select 1 from members where profile_id = inv.profile_id and user_id = joined and status = 'active') then
      perform remove_from_team(inv.profile_id, joined);
      perform notify(joined, 'access', 'Votre accès au profil de ' || inv.child_name || ' a été retiré.', inv.profile_id);
    end if;
  end if;
  update invitations set status = 'cancelled' where id = p_inv;
end $$;

-- ───────────────────────── 2. "Manage devices" ─────────────────────────

-- The family (and a full-access tablet), or a member the family let manage the devices.
create function public.manages_devices(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_manager(p_profile)
      or coalesce((select coalesce(a.perms -> 'manageDevices' = 'true'::jsonb, false) and a.role <> 'device'
                     from public.access_of(p_profile) a), false) and not public.is_tablet()
$$;
revoke execute on function public.manages_devices(uuid) from public, anon;
grant execute on function public.manages_devices(uuid) to authenticated;

drop policy "read devices" on public.devices;
create policy "read devices" on public.devices for select to authenticated
  using (public.manages_devices(profile_id) or user_id = auth.uid());

-- Removing a device: the family removes any; a tablet or a member who manages the devices
-- removes the child's tablets only, never a person's own phone or computer.
create or replace function public.revoke_device(p_id uuid, p_dev text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d devices;
  tablet boolean;
begin
  if not manages_devices(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = p_dev;
  if not found then raise exception 'not_found'; end if;
  tablet := exists (select 1 from members where profile_id = p_id and user_id = d.user_id and role = 'device');
  if not manages_team(p_id) and not tablet then raise exception 'forbidden'; end if;
  update devices set revoked = true where profile_id = p_id and id = p_dev;
  if tablet then perform remove_from_team(p_id, d.user_id); end if;
end $$;

-- A "use only" code: also a member who manages the devices (and receives the family's code,
-- which a tablet receives too). A full-access code: the family signed in as itself.
create or replace function public.create_pairing_code(p_id uuid, p_access text)
returns table (code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  c text := strong_code(8);
begin
  if not manages_devices(p_id) then raise exception 'forbidden'; end if;
  if p_access not in ('full', 'use') then raise exception 'invalid'; end if;
  if p_access = 'full' and not manages_team(p_id) then raise exception 'forbidden'; end if;
  if not sees_code(p_id) and not exists (select 1 from profiles where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if p_access = 'full' and not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('pairing_code', 20, interval '1 hour');
  delete from pairing_codes
   where pairing_codes.expires_at < now() or (pairing_codes.profile_id = p_id and pairing_codes.created_by = auth.uid());
  insert into pairing_codes (code, profile_id, access, expires_at, created_by)
  values (c, p_id, p_access, now() + interval '10 minutes', auth.uid());
  return query select c, now() + interval '10 minutes';
end $$;

-- ───────────────────────── 3. Handing the child to the other parent ─────────────────────────

-- The parent in charge offers the profile to someone who acts as a parent on the team. It is an
-- invitation with the role "parent": the other parent accepts it (with their consent) or not.
create function public.offer_profile(p_id uuid, p_user uuid) returns invitations
language plpgsql security definer set search_path = public, auth as $$
declare
  inv invitations;
  child text;
begin
  if not owns_as_parent(p_id) or is_pro(auth.uid()) then raise exception 'forbidden'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  if p_user is null or p_user = auth.uid() or not is_family_person(p_user)
     or not exists (select 1 from members where profile_id = p_id and user_id = p_user and status = 'active' and role <> 'device'
                                          and coalesce(perms -> 'manager' = 'true'::jsonb, false)) then
    raise exception 'invalid' using detail = 'parent';
  end if;
  perform rate_limit('offer_profile', 10, interval '1 day');
  select name into child from profiles where id = p_id;
  -- One offer at a time.
  update invitations set status = 'cancelled' where profile_id = p_id and status = 'pending' and direction = 'invite' and role = 'parent';
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, to_user_id, code, role, level, perms)
  values ('invite', p_id, child, auth.uid(), my_name(), (select lower(email) from auth.users where id = p_user), p_user,
          friendly_code(), 'parent', 3,
          '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true,"viewData":true}'::jsonb)
  returning * into inv;
  perform notify(p_user, 'invitation', in_lang(p_user,
    inv.from_name || ' vous propose de devenir le parent responsable du profil de ' || child || '.',
    inv.from_name || ' asks you to become the parent in charge of ' || child || '''s profile.',
    inv.from_name || ' يقترح عليك أن تصبح ولي الأمر المسؤول عن ملف ' || child || '.'), p_id, inv.id::text);
  return inv;
end $$;
revoke execute on function public.offer_profile(uuid, uuid) from public, anon;
grant execute on function public.offer_profile(uuid, uuid) to authenticated;

-- Accepting it: the same family, so nothing of the team, the code or the family's choices
-- changes; the two parents swap places (the one who offered stays, acting as a parent).
create function public.take_profile_from_parent(inv invitations, p_user uuid) returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare
  was uuid;
  who text;
begin
  select owner_id into was from profiles where id = inv.profile_id and deleted_at is null for update;
  if not found or inv.direction <> 'invite' or inv.role <> 'parent' or inv.from_user_id <> was or is_pro(was) then return false; end if;
  if p_user = was or not is_family_person(p_user)
     or not exists (select 1 from members where profile_id = inv.profile_id and user_id = p_user and status = 'active'
                                          and coalesce(perms -> 'manager' = 'true'::jsonb, false)) then
    raise exception 'forbidden';
  end if;
  -- (the consent of the parent who takes the profile is checked by consent_on_takeover)
  update profiles set owner_id = p_user, version = version + 1, updated_at = now() where id = inv.profile_id;
  delete from members where profile_id = inv.profile_id and user_id = p_user;
  insert into members (profile_id, user_id, display_name, email, role, level, perms)
  select inv.profile_id, was, coalesce(nullif(btrim(a.display_name), ''), '—'), u.email, 'parent', 3,
         '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true,"viewData":true}'::jsonb
    from auth.users u left join accounts a on a.id = u.id where u.id = was
  on conflict (profile_id, user_id) do update set status = 'active', role = 'parent', level = 3, perms = excluded.perms, expires_at = null;
  update invitations set status = 'accepted', to_user_id = p_user where id = inv.id;
  select coalesce(nullif(btrim(a.display_name), ''), '—') into who from accounts a where a.id = p_user;
  perform notify(was, 'access', in_lang(was,
    coalesce(who, '—') || ' est maintenant le parent responsable du profil de ' || inv.child_name || '. Vous restez dans son équipe.',
    coalesce(who, '—') || ' is now the parent in charge of ' || inv.child_name || '''s profile. You stay on the team.',
    coalesce(who, '—') || ' هو الآن ولي الأمر المسؤول عن ملف ' || inv.child_name || '. تبقى ضمن الفريق.'), inv.profile_id);
  return true;
end $$;
revoke execute on function public.take_profile_from_parent(invitations, uuid) from public, anon, authenticated;

-- join_profile: the hand-over between parents comes first; everything else is as in batch 3.
-- (A professional's own hand-over keeps its place inside the batch 3 version, renamed below.)
alter function public.join_profile(invitations, uuid, int, jsonb) rename to join_profile_b3;
create function public.join_profile(inv invitations, p_user uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  if take_profile_from_parent(inv, p_user) then return; end if;
  -- "parent" otherwise: only a professional's hand-over to a family's account (never a way to
  -- make someone a parent or an owner).
  if inv.role = 'parent' and not (exists (select 1 from profiles where id = inv.profile_id and owner_id = inv.from_user_id and is_pro(owner_id))
                                  and is_family_person(p_user) and p_user <> inv.from_user_id) then
    raise exception 'forbidden';
  end if;
  perform join_profile_b3(inv, p_user, p_level, clean_perms(p_perms) || '{"manager":false}'::jsonb);
end $$;
revoke execute on function public.join_profile(invitations, uuid, int, jsonb) from public, anon, authenticated;
revoke execute on function public.join_profile_b3(invitations, uuid, int, jsonb) from public, anon, authenticated;

-- ───────────────────────── 4. Deleting one's account ─────────────────────────

-- The children whose profile this account owns, and who loses their board with it: the screen
-- names them before anything is erased.
create function public.my_owned_profiles()
returns table (id uuid, name text, in_bin boolean, people text[], tablets int, parents jsonb, offered uuid)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.deleted_at is not null,
         coalesce((select array_agg(m.display_name order by m.created_at) from members m
                    where m.profile_id = p.id and m.status = 'active' and m.role <> 'device'), '{}'),
         (select count(*)::int from members m where m.profile_id = p.id and m.status = 'active' and m.role = 'device'),
         coalesce((select jsonb_agg(jsonb_build_object('userId', m.user_id, 'name', m.display_name) order by m.created_at) from members m
                    where m.profile_id = p.id and m.status = 'active' and m.role <> 'device'
                      and coalesce(m.perms -> 'manager' = 'true'::jsonb, false) and public.is_family_person(m.user_id)), '[]'::jsonb),
         (select i.to_user_id from invitations i
           where i.profile_id = p.id and i.status = 'pending' and i.direction = 'invite' and i.role = 'parent' and i.from_user_id = auth.uid()
           order by i.created_at desc limit 1)
    from profiles p
   where p.owner_id = auth.uid() and mfa_ok() and not public.is_tablet()
   order by p.deleted_at nulls first, p.name
$$;
revoke execute on function public.my_owned_profiles() from public, anon;
grant execute on function public.my_owned_profiles() to authenticated;

-- `p_erase`: the children the person saw and agreed to erase. A profile they own that is not in
-- the list stops the deletion (`profiles_left`): hand it over first, or tick it.
drop function public.delete_account();
create function public.delete_account(p_erase uuid[] default '{}') returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  p record;
  m uuid;
  who text;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  if exists (select 1 from profiles where owner_id = auth.uid() and deleted_at is null and not (id = any (coalesce(p_erase, '{}')))) then
    raise exception 'profiles_left';
  end if;
  who := my_name();
  -- The team of each child is told the board is gone (the notice must outlive the profile).
  for p in select id, name from profiles where owner_id = auth.uid() and deleted_at is null loop
    for m in select user_id from members where profile_id = p.id and status = 'active' and role <> 'device' and user_id <> auth.uid() loop
      perform notify(m, 'access', in_lang(m,
        'Le profil de ' || p.name || ' a été effacé : ' || who || ' a supprimé son compte.',
        p.name || '''s profile was erased: ' || who || ' deleted their account.',
        'تم مسح ملف ' || p.name || ': حذف ' || who || ' حسابه.'));
    end loop;
  end loop;
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function public.delete_account(uuid[]) from public, anon;
grant execute on function public.delete_account(uuid[]) to authenticated;

-- ───────────────────────── 5. Leaving a team; asking again ─────────────────────────

create function public.leave_team(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  child text;
  who text;
  m uuid;
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if exists (select 1 from profiles where id = p_id and owner_id = auth.uid()) then raise exception 'forbidden'; end if;
  if not exists (select 1 from members where profile_id = p_id and user_id = auth.uid() and status = 'active' and role <> 'device') then
    raise exception 'not_found';
  end if;
  select name into child from profiles where id = p_id;
  who := my_name();
  perform remove_from_team(p_id, auth.uid());
  for m in select managers_of(p_id) loop
    if m <> auth.uid() then
      perform notify(m, 'access', in_lang(m,
        who || ' a quitté l''équipe de ' || child || '.',
        who || ' left ' || child || '''s team.',
        who || ' غادر فريق ' || child || '.'), p_id);
    end if;
  end loop;
end $$;
revoke execute on function public.leave_team(uuid) from public, anon;
grant execute on function public.leave_team(uuid) to authenticated;

-- A professional whose request was declined can ask once more, a week later at the earliest;
-- after three refusals in six months, no more (the family can still invite her).
create function public.ask_again(p_inv uuid) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  old invitations;
  inv invitations;
  m uuid;
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  select * into old from invitations where id = p_inv and direction = 'request' and from_user_id = auth.uid() and status = 'declined';
  if not found then raise exception 'not_found'; end if;
  if not exists (select 1 from profiles where id = old.profile_id and deleted_at is null) then raise exception 'not_found'; end if;
  if can_read(old.profile_id) then raise exception 'already_member'; end if;
  if exists (select 1 from invitations where direction = 'request' and profile_id = old.profile_id and from_user_id = auth.uid()
                                         and (status = 'pending' or created_at > now() - interval '7 days')) then
    raise exception 'ask_later';
  end if;
  if (select count(*) from invitations where direction = 'request' and profile_id = old.profile_id and from_user_id = auth.uid()
                                         and status = 'declined' and created_at > now() - interval '180 days') >= 3 then
    raise exception 'refused_often';
  end if;
  if old.role in ('therapist', 'teacher') and not is_pro(auth.uid()) then raise exception 'pro_account_needed'; end if;
  perform rate_limit('request', 10, interval '1 day');
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, code, role, level, perms, message)
  select 'request', old.profile_id, p.name, auth.uid(), my_name(), lower(auth.email()), friendly_code(),
         case when old.role in ('therapist', 'teacher', 'caregiver', 'family', 'other') then old.role else 'other' end,
         old.level, clean_perms(old.perms) || '{"changeAccess":false,"invite":false,"manageDevices":false,"manager":false}'::jsonb, old.message
    from profiles p where p.id = old.profile_id
  returning * into inv;
  for m in select managers_of(inv.profile_id) loop
    perform notify(m, 'request', inv.from_name || ' demande à rejoindre l''équipe de ' || inv.child_name || '.', inv.profile_id, inv.id::text);
  end loop;
  return inv;
end $$;
revoke execute on function public.ask_again(uuid) from public, anon;
grant execute on function public.ask_again(uuid) to authenticated;

-- A request for a therapist or a teacher comes from a professional account.
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
  if is_tablet() then raise exception 'forbidden'; end if;
  if p_role is null or p_role not in ('therapist', 'teacher', 'caregiver', 'family', 'other') then
    raise exception 'invalid' using detail = 'role';
  end if;
  select * into p from profiles where connection_code = upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')) and deleted_at is null;
  if not found then
    insert into rate_log (user_id, kind) values (auth.uid(), 'wrong_code');
    return null;
  end if;
  if p_role in ('therapist', 'teacher') and not is_pro(auth.uid()) then raise exception 'pro_account_needed'; end if;
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

-- ───────────────────────── 6. A child's name and age ─────────────────────────

create function public.update_child(p_id uuid, p_name text, p_age int) returns void
language plpgsql security definer set search_path = public as $$
declare
  n text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  -- The family who owns the profile (or the professional who prepares it), signed in as themself.
  if not owns_as_parent(p_id) then raise exception 'forbidden'; end if;
  if length(n) < 1 or length(n) > 60 then raise exception 'invalid' using detail = 'name'; end if;
  if p_age is not null and (p_age < 0 or p_age > 30) then raise exception 'invalid' using detail = 'age'; end if;
  perform rate_limit('update_child', 30, interval '1 day');
  -- (a new version: the family's other devices take the new name at their next look)
  update profiles set name = n, age = p_age, version = version + 1, updated_at = now() where id = p_id;
  -- The invitations still waiting show the new name.
  update invitations set child_name = n where profile_id = p_id and status = 'pending';
end $$;
revoke execute on function public.update_child(uuid, text, int) from public, anon;
grant execute on function public.update_child(uuid, text, int) to authenticated;
