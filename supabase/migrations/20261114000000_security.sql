-- Security hardening after the review of November 2026 (docs/SECURITY.md lists what and why).
-- Run once, after the seven earlier files. It only tightens rules: no data is removed.

-- ───────────────────────── 1. Small tools used below ─────────────────────────

-- A code people type, drawn from the database's strong random source (the old one used
-- random(), which can be predicted). 32 letters and digits, no 0/O or 1/I.
create function public.strong_code(p_len int default 8) returns text
language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + (get_byte(uuid_send(gen_random_uuid()), 0) % 32), 1), '')
    from generate_series(1, p_len)
$$;

create or replace function public.friendly_code() returns text
language sql volatile set search_path = public as $$
  select public.strong_code(8)
$$;

-- Who did what, recently: only to refuse someone who repeats an action too often.
create table public.rate_log (
  user_id uuid not null,
  kind text not null,
  at timestamptz not null default now()
);
create index on public.rate_log (user_id, kind, at);
alter table public.rate_log enable row level security;
-- No policy: only the functions below touch it.

-- Counts one action; refuses when the person passed the limit for the period.
create function public.rate_limit(p_kind text, p_max int, p_window interval) returns void
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select count(*) into n from rate_log where user_id = auth.uid() and kind = p_kind and at > now() - p_window;
  if n >= p_max then raise exception 'too_many' using detail = p_kind; end if;
  insert into rate_log (user_id, kind) values (auth.uid(), p_kind);
  if random() < 0.02 then delete from rate_log where at < now() - interval '2 days'; end if;
end $$;

-- Wrong codes: 5 in 15 minutes, then the person waits. A wrong code is written down by the
-- function that received it, which then answers "nothing" instead of an error (an error
-- would erase the note).
create function public.code_tries_left() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and (select count(*) from rate_log where user_id = auth.uid() and kind = 'wrong_code' and at > now() - interval '15 minutes') < 5
$$;

-- The switches a team member can hold: only these names, only true / false.
create function public.clean_perms(p jsonb) returns jsonb
language sql immutable as $$
  select jsonb_build_object(
    'createMaterials', coalesce(p -> 'createMaterials' = 'true'::jsonb, false),
    'proposeVocabulary', coalesce(p -> 'proposeVocabulary' = 'true'::jsonb, false),
    'changeAccess', coalesce(p -> 'changeAccess' = 'true'::jsonb, false),
    'invite', coalesce(p -> 'invite' = 'true'::jsonb, false),
    'manageDevices', coalesce(p -> 'manageDevices' = 'true'::jsonb, false),
    'manager', coalesce(p -> 'manager' = 'true'::jsonb, false),
    'viewData', coalesce(p -> 'viewData' = 'true'::jsonb, false))
$$;

-- A number stored in a JSON document, or 0 when it is not a number; never above the cap.
create function public.num(j jsonb, p_cap numeric default 1000000) returns numeric
language sql immutable as $$
  select case when jsonb_typeof(j) = 'number' then greatest(0, least((j #>> '{}')::numeric, p_cap)) else 0 end
$$;

-- ───────────────────────── 2. Accounts: nobody changes their own type ─────────────────────────

-- Before: a professional could switch the account to "parent" and skip the verification.
revoke update on public.accounts from authenticated, anon;
grant update (display_name, prefs) on public.accounts to authenticated;

-- A Google / Apple account is created without a type: the person's choice is applied once,
-- in the first minutes, before the account has done anything.
create function public.choose_role(p_role text) returns public.accounts
language plpgsql security definer set search_path = public as $$
declare
  a accounts;
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if p_role not in ('parent', 'pro') then raise exception 'invalid'; end if;
  update accounts set role = p_role
   where id = auth.uid() and created_at > now() - interval '15 minutes'
     and not exists (select 1 from profiles where owner_id = auth.uid())
     and not exists (select 1 from members where user_id = auth.uid())
     and not exists (select 1 from verifications where user_id = auth.uid() and status <> 'draft')
  returning * into a;
  if not found then raise exception 'forbidden'; end if;
  return a;
end $$;

-- ───────────────────────── 3. Children's profiles ─────────────────────────

-- The app chooses only these columns; id, version and the family code come from the database.
revoke insert, update on public.profiles from authenticated, anon;
grant insert (owner_id, name, age, intake, data) on public.profiles to authenticated;
grant update (name, age, intake) on public.profiles to authenticated;

create function public.profile_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if pg_column_size(new.data) > 3000000 then raise exception 'too_large'; end if;
  if length(new.name) > 80 then raise exception 'too_large'; end if;
  if tg_op = 'INSERT' and (select count(*) from profiles where owner_id = new.owner_id) >= 30 then
    raise exception 'too_many' using detail = 'profiles';
  end if;
  return new;
end $$;
create trigger profile_limits before insert or update on public.profiles
for each row execute function public.profile_limits();

-- Saving. Checked in this order: is the copy up to date, then what this person may change.
-- An editor (level 3) who is not the family never touches the core board, the family's
-- choices about data (what is recorded, what is shared), nor the caregiver code.
create or replace function public.save_profile(p_id uuid, p_data jsonb, p_base int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a record;
  cur profiles;
  k text;
begin
  select * into a from access_of(p_id);
  if not found then raise exception 'forbidden'; end if;
  select * into cur from profiles where id = p_id for update;
  if not (a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false)) and a.level < 3 then
    raise exception 'forbidden';
  end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'invalid'; end if;
  if cur.version <> p_base then
    return jsonb_build_object('ok', false, 'conflict', to_jsonb(cur) - 'connection_code');
  end if;
  if not (a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false)) then
    if (p_data -> 'boards' -> 'core') is distinct from (cur.data -> 'boards' -> 'core') then
      raise exception 'core_protected';
    end if;
    -- (a value that is missing counts as its default)
    foreach k in array array['dataCollection:off', 'shareStats:none', 'pin:1234'] loop
      if coalesce(p_data -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2))
         is distinct from coalesce(cur.data -> 'settings' ->> split_part(k, ':', 1), split_part(k, ':', 2)) then
        raise exception 'consent_protected' using detail = split_part(k, ':', 1);
      end if;
    end loop;
  end if;
  update profiles set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid() where id = p_id;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

-- A professional whose acceptance was withdrawn no longer sees the child in the list.
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
   where p.owner_id = auth.uid() or m.user_id is not null
   order by p.name
$$;

-- The people who decide for a child: same conditions as everywhere else (not expired, accepted).
create or replace function public.managers_of(p_profile uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select owner_id from profiles where id = p_profile
  union
  select user_id from members
   where profile_id = p_profile and status = 'active' and coalesce(perms -> 'manager' = 'true'::jsonb, false)
     and (expires_at is null or expires_at > now()) and pro_cleared(user_id)
$$;

-- ───────────────────────── 4. The team: nobody gives more than they hold ─────────────────────────

create or replace function public.update_member(p_id uuid, p_user uuid, p_level int, p_perms jsonb, p_role text, p_expires timestamptz, p_set_expiry boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  update members set
    level = coalesce(greatest(1, least(3, p_level)), level),
    perms = case when p_perms is null then perms else clean_perms(p_perms) end,
    role = coalesce(p_role, role),
    expires_at = case when p_set_expiry then p_expires else expires_at end
  where profile_id = p_id and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  perform notify(p_user, 'access', 'Vos droits sur le profil de ' || (select name from profiles where id = p_id) || ' ont changé.', p_id);
end $$;

-- Removing someone also cancels the invitations that person had prepared (a way back in).
create or replace function public.revoke_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  update members set status = 'revoked' where profile_id = p_id and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  update invitations set status = 'cancelled' where profile_id = p_id and from_user_id = p_user and status = 'pending';
  perform notify(p_user, 'access', 'Votre accès au profil de ' || (select name from profiles where id = p_id) || ' a été retiré.', p_id);
end $$;

create or replace function public.invite(p_id uuid, p_email text, p_name text, p_role text, p_level int, p_perms jsonb)
returns invitations language plpgsql security definer set search_path = public as $$
declare
  a record;
  inv invitations;
  target uuid;
  boss boolean;
  lvl int := greatest(1, least(3, coalesce(p_level, 1)));
  perms jsonb := clean_perms(p_perms);
begin
  select * into a from access_of(p_id);
  if not found then raise exception 'forbidden'; end if;
  boss := a.owner or coalesce(a.perms -> 'manager' = 'true'::jsonb, false);
  if not (boss or coalesce(a.perms -> 'invite' = 'true'::jsonb, false)) then raise exception 'forbidden'; end if;
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

-- Remembers who joined with an invitation (needed to undo it later).
create or replace function public.join_profile(inv invitations, p_user uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into members (profile_id, user_id, display_name, email, role, level, perms)
  select inv.profile_id, p_user,
         case when inv.direction = 'invite' then coalesce(inv.name, coalesce(nullif(a.display_name, ''), u.email, '—')) else coalesce(nullif(a.display_name, ''), u.email, '—') end,
         u.email, inv.role, greatest(1, least(3, coalesce(p_level, 1))), clean_perms(p_perms)
    from auth.users u left join accounts a on a.id = u.id where u.id = p_user
  on conflict (profile_id, user_id) do update set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms, expires_at = null;
  update invitations set status = 'accepted', to_user_id = case when direction = 'invite' then p_user else to_user_id end where id = inv.id;
end $$;

-- Answering an invitation. A family's answer to a connection request goes through
-- approve_request (where the family chooses the rights): here a request can only be refused.
-- Invitations are valid 30 days (sending it again restarts the 30 days).
create or replace function public.respond_invitation(p_inv uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into inv from invitations where id = p_inv and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if inv.direction = 'request' then
    if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
    if p_accept then raise exception 'forbidden' using detail = 'use approve_request'; end if;
    update invitations set status = 'declined' where id = inv.id;
    perform notify(inv.from_user_id, 'access', 'Votre demande pour ' || inv.child_name || ' a été refusée.', inv.profile_id);
    return;
  end if;
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

-- A wrong code answers "nothing" (the app says "invalid code"); nobody accepts their own invitation.
create or replace function public.accept_invitation_code(p_code text) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
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

-- The sender takes back an invitation that is still waiting; undoing one that was accepted
-- (which removes the person) is for the family.
create or replace function public.cancel_invitation(p_inv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
  boss boolean;
  joined uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into inv from invitations where id = p_inv;
  if not found then raise exception 'not_found'; end if;
  boss := is_manager(inv.profile_id);
  if not boss and not (inv.from_user_id is not distinct from auth.uid() and inv.status = 'pending') then
    raise exception 'forbidden';
  end if;
  if inv.status = 'accepted' then
    joined := case when inv.direction = 'request' then inv.from_user_id else inv.to_user_id end;
    update members set status = 'revoked' where profile_id = inv.profile_id and user_id = joined;
  end if;
  update invitations set status = 'cancelled' where id = p_inv;
end $$;

create or replace function public.resend_invitation(p_inv uuid) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv;
  if not found then raise exception 'not_found'; end if;
  if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
  perform rate_limit('resend', 20, interval '1 day');
  update invitations set created_at = now() where id = p_inv returning * into inv;
  perform notify(inv.to_user_id, 'invitation', 'Rappel : ' || inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

-- A request never carries the family's own rights (they were passed on unseen at approval),
-- and one person has one waiting request per child.
create or replace function public.request_connection(p_code text, p_role text, p_level int, p_perms jsonb, p_message text)
returns invitations language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  inv invitations;
  m uuid;
  perms jsonb := clean_perms(p_perms);
begin
  if not code_tries_left() then raise exception 'too_many' using detail = 'wrong_code'; end if;
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

-- The family chooses the rights when it approves; "acts as a parent" is never given this way
-- (it can be given afterwards, on purpose, in the team page).
create or replace function public.approve_request(p_inv uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv and direction = 'request' and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
  perform join_profile(inv, inv.from_user_id, p_level, clean_perms(p_perms) || '{"manager":false}'::jsonb);
  perform notify(inv.from_user_id, 'access', 'Votre demande pour ' || inv.child_name || ' a été acceptée.', inv.profile_id);
end $$;

-- The person who sent an invitation reads it only while still on the team.
drop policy "read invitations" on public.invitations;
create policy "read invitations" on public.invitations for select to authenticated using (
  is_manager(profile_id)
  or (from_user_id = auth.uid() and (direction = 'request' or can_read(profile_id)))
  or to_user_id = auth.uid()
  or (email is not null and email = lower(auth.email())));

-- ───────────────────────── 5. Proposals and history ─────────────────────────

create or replace function public.create_proposal(p_id uuid, p_title text, p_reason text, p_ops jsonb, p_base int)
returns proposals language plpgsql security definer set search_path = public as $$
declare
  a record;
  prop proposals;
  m uuid;
begin
  select * into a from access_of(p_id);
  if not found or (not a.owner and a.level < 2 and not coalesce(a.perms -> 'manager' = 'true'::jsonb, false)) then
    raise exception 'forbidden';
  end if;
  if pg_column_size(p_ops) > 1000000 then raise exception 'too_large'; end if;
  perform rate_limit('proposal', 60, interval '1 day');
  insert into proposals (profile_id, child_name, author_id, author_name, author_role, title, reason, ops, base_version)
  values (p_id, (select name from profiles where id = p_id), auth.uid(), my_name(),
          case when a.owner then 'parent' else a.role end, left(trim(p_title), 200), left(nullif(trim(p_reason), ''), 2000), p_ops, p_base)
  returning * into prop;
  for m in select managers_of(p_id) loop
    if m <> auth.uid() then
      perform notify(m, 'proposal', prop.author_name || ' propose : ' || prop.title, p_id, prop.id::text);
    end if;
  end loop;
  return prop;
end $$;

-- Only a proposal that is still open, and only by its author while still on the team.
create or replace function public.update_proposal(p_prop uuid, p_title text, p_reason text, p_ops jsonb, p_base int)
returns proposals language plpgsql security definer set search_path = public as $$
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

create or replace function public.set_proposal_status(p_prop uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  prop proposals;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  select * into prop from proposals where id = p_prop for update;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'withdrawn' then
    if prop.author_id is distinct from auth.uid() or prop.status not in ('pending', 'revision') then raise exception 'forbidden'; end if;
  elsif not is_manager(prop.profile_id) then
    raise exception 'forbidden';
  end if;
  update proposals set status = p_status, decision_note = left(nullif(trim(p_note), ''), 2000), decided_at = now(), decided_by = auth.uid() where id = p_prop;
  if p_status in ('approved', 'declined', 'revision') then
    perform notify(prop.author_id, case when p_status = 'revision' then 'revision' else 'decision' end,
      case p_status when 'approved' then 'Proposition acceptée : ' when 'declined' then 'Proposition refusée : ' else 'Révision demandée : ' end || prop.title,
      prop.profile_id, prop.id::text);
  end if;
end $$;

-- The history is written by the people who can change the board (it feeds "Undo").
create or replace function public.add_history(p_id uuid, p_summary text, p_ops jsonb, p_inverse jsonb, p_proposal uuid)
returns history language plpgsql security definer set search_path = public as $$
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
  insert into history (profile_id, actor_id, actor_name, summary, ops, inverse, proposal_id)
  values (p_id, auth.uid(), my_name(), left(p_summary, 500), p_ops, p_inverse, p_proposal)
  returning * into h;
  return h;
end $$;

-- ───────────────────────── 6. Tablets ─────────────────────────

-- The code to link a tablet: 8 letters and digits instead of 6 digits, one code at a time,
-- 5 wrong tries then a pause; the family is told each time a device is linked.
create or replace function public.create_pairing_code(p_id uuid, p_access text)
returns table (code text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare
  c text := strong_code(8);
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  if p_access not in ('full', 'use') then raise exception 'invalid'; end if;
  perform rate_limit('pairing_code', 20, interval '1 hour');
  delete from pairing_codes
   where pairing_codes.expires_at < now() or (pairing_codes.profile_id = p_id and pairing_codes.created_by = auth.uid());
  insert into pairing_codes (code, profile_id, access, expires_at, created_by)
  values (c, p_id, p_access, now() + interval '10 minutes', auth.uid());
  return query select c, now() + interval '10 minutes';
end $$;

create or replace function public.redeem_pairing_code(p_code text, p_dev text, p_name text, p_platform text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pc pairing_codes;
  full_access boolean;
  m uuid;
begin
  if not code_tries_left() then raise exception 'too_many' using detail = 'wrong_code'; end if;
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
  on conflict (profile_id, user_id) do update set status = 'active', level = excluded.level, perms = excluded.perms;
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

-- A device row belongs to the account that created it: someone else on the team cannot rename
-- or take it (the family can); texts are cut to a sensible length.
create or replace function public.register_device(p_id uuid, p_dev text, p_name text, p_kind text, p_platform text, p_version text default '')
returns devices language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = left(p_dev, 80);
  if found and d.revoked then raise exception 'device_revoked'; end if;
  if found and d.user_id is distinct from auth.uid() and not is_manager(p_id) then
    update devices set last_seen_at = now() where profile_id = p_id and id = d.id returning * into d;
    return d;
  end if;
  if not found and (select count(*) from devices where profile_id = p_id) >= 40 then raise exception 'too_many' using detail = 'devices'; end if;
  insert into devices (id, profile_id, user_id, name, kind, platform, app_version, last_seen_at)
  values (left(p_dev, 80), p_id, auth.uid(), left(p_name, 60), case when p_kind in ('primary', 'secondary', 'companion') then p_kind else 'companion' end,
          left(coalesce(p_platform, ''), 40), left(coalesce(p_version, ''), 20), now())
  on conflict (profile_id, id) do update
    set name = excluded.name, kind = excluded.kind, platform = excluded.platform,
        app_version = excluded.app_version, last_seen_at = now(), user_id = excluded.user_id
  returning * into d;
  return d;
end $$;

-- ───────────────────────── 7. Usage data ─────────────────────────

-- Keeps only what has the expected shape: numbers stay numbers, "where the word was touched"
-- keeps its six known places, so no text can travel inside the figures.
create function public.clean_usage(d jsonb) returns jsonb
language plpgsql immutable as $$
declare
  o jsonb := d;
  k text;
begin
  if jsonb_typeof(d) is distinct from 'object' then return '{}'::jsonb; end if;
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

-- A day is saved for a device that is registered for this child and not removed (only the
-- family can list the devices, so a member only knows its own), for a recent date, within a size.
create or replace function public.save_usage_day(p_id uuid, p_dev text, p_day date, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  lvl text;
  d jsonb;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  if not exists (select 1 from devices where profile_id = p_id and id = p_dev and not revoked) then
    raise exception 'forbidden' using detail = 'device';
  end if;
  if p_day is null or p_day < current_date - 60 or p_day > current_date + 1 then raise exception 'invalid' using detail = 'day'; end if;
  if pg_column_size(p_data) > 400000 then raise exception 'too_large'; end if;
  select coalesce(data -> 'settings' ->> 'dataCollection', 'off') into lvl from profiles where id = p_id;
  if lvl is null or lvl not in ('usage', 'vocabulary', 'language') then raise exception 'forbidden'; end if;
  d := clean_usage(p_data);
  if lvl = 'usage' then d := d - 'concepts' - 'searched' - 'samples'; end if;
  if lvl = 'vocabulary' then d := d - 'samples'; end if;
  d := jsonb_set(d, '{level}', to_jsonb(lvl));
  insert into usage_days (profile_id, device_id, day, data, updated_at)
  values (p_id, p_dev, p_day, d, now())
  on conflict (profile_id, device_id, day) do update set data = excluded.data, updated_at = now();
end $$;

-- Notes: everyone allowed to see the data reads them; a note is changed or deleted by its
-- author or by the family, and its signature is written by the database.
drop policy "edit observations" on public.observations;
drop policy "delete observations" on public.observations;
create policy "edit observations" on public.observations for update to authenticated
  using (can_view_data(profile_id) and (created_by = auth.uid() or is_manager(profile_id)))
  with check (can_view_data(profile_id));
create policy "delete observations" on public.observations for delete to authenticated
  using (can_view_data(profile_id) and (created_by = auth.uid() or is_manager(profile_id)));
revoke update on public.observations from authenticated, anon;
grant update (at, sample_t, utterance, function, context, partner, autonomy, result, note, updated_at) on public.observations to authenticated;

create function public.sign_observation() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.author_name := left(my_name(), 80);
  new.created_by := auth.uid();
  return new;
end $$;
create trigger sign_observation before insert on public.observations
for each row execute function public.sign_observation();

-- ───────────────────────── 8. Shared materials ─────────────────────────

-- "Edit" lets someone change the content, never take the material: owner and signature are fixed.
revoke update on public.resources from authenticated, anon;
grant update (kind, title, profile_id, data, updated_at) on public.resources to authenticated;

create function public.sign_resource() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then new.owner_name := left(my_name(), 80); end if;
  if length(new.title) > 200 or pg_column_size(new.data) > 3000000 then raise exception 'too_large'; end if;
  return new;
end $$;
create trigger sign_resource before insert or update on public.resources
for each row execute function public.sign_resource();

create or replace function public.share_resource(p_res uuid, p_email text, p_profile uuid, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r resources;
  target uuid;
  m uuid;
begin
  select * into r from resources where id = p_res and owner_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if p_mode not in ('view', 'edit') then raise exception 'invalid'; end if;
  perform rate_limit('share', 40, interval '1 day');
  if p_profile is not null then
    if not can_read(p_profile) then raise exception 'forbidden'; end if;
    insert into resource_shares (resource_id, profile_id, mode, shared_by) values (p_res, p_profile, p_mode, auth.uid());
    for m in select managers_of(p_profile) loop
      perform notify(m, 'share', my_name() || ' a partagé « ' || r.title || ' ».', p_profile, r.id::text);
    end loop;
  else
    select id into target from auth.users where lower(email) = lower(p_email) and email_confirmed_at is not null;
    if target is null then raise exception 'no_account'; end if;
    insert into resource_shares (resource_id, user_id, mode, shared_by) values (p_res, target, p_mode, auth.uid());
    perform notify(target, 'share', my_name() || ' a partagé « ' || r.title || ' » avec vous.', null, r.id::text);
  end if;
end $$;

-- ───────────────────────── 9. Professionals' requests ─────────────────────────

-- The professional fills in the form; the state of the request is changed by the database only.
revoke insert, update on public.verifications from authenticated, anon;
grant insert (user_id, full_name, country, profession, organization, documents) on public.verifications to authenticated;
grant update (user_id, full_name, country, profession, organization, documents) on public.verifications to authenticated;

-- A request lists at most 10 files, each one in the person's own folder.
create function public.check_verification() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if jsonb_typeof(new.documents) <> 'array' or jsonb_array_length(new.documents) > 10 then raise exception 'invalid' using detail = 'documents'; end if;
  if exists (select 1 from jsonb_array_elements(new.documents) d
              where jsonb_typeof(d) <> 'object'
                 or coalesce(d ->> 'ref', '') not like new.user_id::text || '/%'
                 or d ->> 'ref' like '%..%'
                 or coalesce(d ->> 'kind', '') not in ('licence', 'diploma', 'id')) then
    raise exception 'invalid' using detail = 'documents';
  end if;
  if length(new.full_name) > 120 or length(new.country) > 80 or length(new.profession) > 80 or length(coalesce(new.organization, '')) > 160 then
    raise exception 'too_large';
  end if;
  return new;
end $$;
create trigger check_verification before insert or update of documents, full_name, country, profession, organization on public.verifications
for each row execute function public.check_verification();

create or replace function public.submit_verification() returns verifications
language plpgsql security definer set search_path = public as $$
declare
  v verifications;
begin
  select * into v from verifications where user_id = auth.uid() for update;
  if not found or v.full_name = '' or v.country = '' or v.profession = '' or jsonb_array_length(v.documents) = 0 then
    raise exception 'incomplete';
  end if;
  if v.status not in ('draft', 'more_info') then raise exception 'forbidden'; end if;
  perform rate_limit('verification', 5, interval '1 day');
  update verifications set status = 'pending', submitted_at = now(), note = null where user_id = auth.uid() returning * into v;
  return v;
end $$;

-- ───────────────────────── 10. Files ─────────────────────────

-- Size and kind of files: documents are pictures or PDF (10 MB); a child's media are pictures
-- and sounds (15 MB).
update storage.buckets set file_size_limit = 10485760,
       allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
 where id = 'verification-docs';
update storage.buckets set file_size_limit = 15728640,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/webm']
 where id = 'profile-media';

-- Only real accounts upload documents (not the sign-in of a tablet), at most 20 files each.
drop policy "own verification docs: upload" on storage.objects;
create policy "own verification docs: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text
              and not public.is_tablet() and name not like '%..%'
              and (select count(*) from storage.objects o
                    where o.bucket_id = 'verification-docs' and (storage.foldername(o.name))[1] = auth.uid()::text) < 20);

-- ───────────────────────── 11. AI helper ─────────────────────────

-- The helper is for people who look after a child here (not for any sign-in), with a ceiling
-- for the whole service each day so that a flood cannot run up the bill.
create table public.ai_budget (
  day date primary key,
  n int not null default 0
);
alter table public.ai_budget enable row level security;
-- No policy: only count_ai_call touches it.

create or replace function public.count_ai_call() returns int
language plpgsql security definer set search_path = public as $$
declare
  total int;
  everyone int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not exists (select 1 from profiles where owner_id = auth.uid())
     and not exists (select 1 from members where user_id = auth.uid() and status = 'active') then
    raise exception 'forbidden';
  end if;
  insert into ai_budget (day, n) values (current_date, 1)
  on conflict (day) do update set n = ai_budget.n + 1
  returning n into everyone;
  if everyone > 3000 then raise exception 'ai_busy'; end if;
  insert into ai_calls (user_id, day, n) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set n = ai_calls.n + 1
  returning n into total;
  delete from ai_calls where day < current_date - 30;
  return total;
end $$;

-- ───────────────────────── 12. Figures of the back office ─────────────────────────

-- Same lists as before, but a value that is not a number counts as 0 (one odd row made the
-- whole page fail), places and platforms are known words only, and the owner is kept so that
-- "at least 5" can mean 5 families.
drop view public.research_usage;
drop view public.bo_child_days;
create view public.bo_child_days as
select u.profile_id as child, max(p.age) as age, u.day,
       sum(coalesce((select sum(public.num(s -> 'activeMs', 86400000))
                       from jsonb_array_elements(case when jsonb_typeof(u.data -> 'sessions') = 'array' then u.data -> 'sessions' else '[]'::jsonb end) s), 0)) / 60000.0 as minutes,
       sum(public.num(u.data -> 'selections', 100000)) as selections,
       sum(public.num(u.data -> 'utterances', 100000)) as utterances,
       max(public.num(u.data -> 'stats' -> 'distinctConcepts', 100000)) as words,
       sum(public.num(u.data -> 'stats' -> 'len1', 100000)) as len1,
       sum(public.num(u.data -> 'stats' -> 'len2', 100000)) as len2,
       sum(public.num(u.data -> 'stats' -> 'len3plus', 100000)) as len3,
       sum(public.num(u.data -> 'searches', 100000)) as searches,
       sum(public.num(u.data -> 'tlaCreated', 1000)) as boards_made,
       sum(public.num(u.data -> 'errors', 100000)) as errors,
       sum(public.num(u.data -> 'offlineMs', 86400000)) / 60000.0 as offline_min,
       jsonb_agg(case when jsonb_typeof(u.data -> 'modes') = 'object' then u.data -> 'modes' else '{}'::jsonb end) as modes,
       jsonb_agg(case when jsonb_typeof(u.data -> 'hours') = 'array' then u.data -> 'hours' else '[]'::jsonb end) as hours,
       max(case when split_part(coalesce(u.data ->> 'platform', ''), ' ', 1) in ('ios', 'android', 'web')
                then split_part(u.data ->> 'platform', ' ', 1) else '?' end) as platform,
       (array_agg(p.owner_id))[1] as owner
  from public.usage_days u join public.profiles p on p.id = u.profile_id
 where p.data -> 'settings' ->> 'shareStats' = 'anonymous' and u.day > current_date - 90
 group by u.profile_id, u.day;
revoke all on public.bo_child_days from public, anon, authenticated;

-- For the team (Supabase dashboard): one line per day, only days with at least 5 children of
-- 5 families. (Before: one line per child and per day.)
create view public.research_usage as
select day, count(distinct child) as children,
       round(avg(minutes), 1) as active_minutes, round(avg(selections), 1) as selections,
       round(avg(utterances), 1) as utterances, round(avg(words), 1) as distinct_words
  from public.bo_child_days
 group by day
having count(distinct child) >= 5 and count(distinct owner) >= 5;
revoke all on public.research_usage from public, anon, authenticated;

-- Every figure taken from children's profiles or use now needs 5 children of 5 different
-- families; a week, a platform or a choice shared by fewer than 5 children is left out.
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
    'used7', (select count(distinct profile_id) from devices where not revoked and last_seen_at > now() - interval '7 days'),
    'used30', (select count(distinct profile_id) from devices where not revoked and last_seen_at > now() - interval '30 days'),
    'edited30', (select count(*) from profiles where updated_at > now() - interval '30 days'),
    -- what families chose to record: only among those who share figures, groups of 5 or more
    'collection', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                     select coalesce(data -> 'settings' ->> 'dataCollection', 'off') k, count(*) n from profiles
                      where data -> 'settings' ->> 'shareStats' = 'anonymous' group by 1 having count(*) >= min_group) t),
    'sharing', (select count(*) from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous'))
    into part;
  o := o || jsonb_build_object('families', part);

  select jsonb_build_object(
    'total', count(*),
    'seen7', count(*) filter (where last_seen_at > now() - interval '7 days'),
    'seen30', count(*) filter (where last_seen_at > now() - interval '30 days'),
    'waiting', count(*) filter (where pending_changes > 0),
    'platforms', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                    select coalesce(nullif(left(platform, 40), ''), '?') k, count(*) n from devices where not revoked group by 1) t),
    'versions', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                   select coalesce(nullif(left(app_version, 20), ''), '?') k, count(*) n from devices where not revoked group by 1) t))
    into part from devices where not revoked;
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
    'changes30', (select count(*) from history where created_at > now() - interval '30 days'))
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

  part := jsonb_build_object('sharing', sharing, 'children', using_, 'minimum', min_group, 'enough', using_ >= min_group and owners_ >= min_group, 'days', 90);
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
                      having count(distinct child) >= min_group) t),
      'weeks', (select jsonb_agg(jsonb_build_object(
                  'week', w::date,
                  'children', (select count(distinct d.child) from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'minutes', (select case when count(distinct d.child) >= min_group then round(avg(d.minutes), 1) end
                                from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'selections', (select case when count(distinct d.child) >= min_group then round(avg(d.selections), 1) end
                                   from bo_child_days d where date_trunc('week', d.day::timestamp) = w)) order by w)
                  from generate_series(date_trunc('week', current_date::timestamp) - interval '11 weeks',
                                       date_trunc('week', current_date::timestamp), interval '1 week') w),
      -- Age groups with fewer than 5 children are left out.
      'ages', (select coalesce(jsonb_agg(jsonb_build_object('band', band, 'children', children, 'minutes', minutes, 'selections', selections,
                                                            'longer', longer) order by band), '[]') from (
                 select case when age is null then '?' when age <= 3 then '0-3' when age <= 6 then '4-6'
                             when age <= 10 then '7-10' when age <= 14 then '11-14' else '15+' end band,
                        count(distinct child) children, round(avg(minutes), 1) minutes, round(avg(selections), 1) selections,
                        round(sum(len2 + len3) / nullif(sum(len1 + len2 + len3), 0), 3) longer
                   from bo_child_days group by 1 having count(distinct child) >= min_group) t));
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
           group by 1, 2 having count(*) >= min_group) t group by key) t2),
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
    part := jsonb_build_object('children', sharing, 'minimum', min_group);
  end if;
  o := o || jsonb_build_object('setup', part);

  return o || jsonb_build_object('at', now());
end $$;

-- ───────────────────────── 13. Who may call what ─────────────────────────

-- Nothing in this database is for people who are not signed in.
revoke execute on all functions in schema public from public, anon;
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon;

-- Tools used by the functions above, not by the app.
revoke execute on function public.strong_code(int) from authenticated;
revoke execute on function public.friendly_code() from authenticated;
revoke execute on function public.rate_limit(text, int, interval) from authenticated;
revoke execute on function public.code_tries_left() from authenticated;
revoke execute on function public.clean_perms(jsonb) from authenticated;
revoke execute on function public.clean_usage(jsonb) from authenticated;
revoke execute on function public.num(jsonb, numeric) from authenticated;
revoke execute on function public.managers_of(uuid) from authenticated;
revoke execute on function public.profile_limits() from authenticated;
revoke execute on function public.sign_observation() from authenticated;
revoke execute on function public.sign_resource() from authenticated;
revoke execute on function public.check_verification() from authenticated;
