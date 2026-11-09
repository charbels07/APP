-- AAC app — database schema for Supabase (PostgreSQL).
--
-- Same data as the demo server (src/backend/local.ts). Security is enforced here, in the
-- database, with row-level security (RLS): every query only sees the rows its user is allowed
-- to see, and state changes (accepting an invitation, approving a proposal…) go through
-- functions that check permissions first.
--
-- Errors are raised with short codes (forbidden, conflict, code_invalid…) that the app
-- translates (src/backend/supabase.ts).

create extension if not exists pgcrypto;

-- ───────────────────────── Tables ─────────────────────────

create table public.accounts (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'parent' check (role in ('parent', 'pro')),
  display_name text not null default '',
  prefs jsonb not null default '{}',
  created_at timestamptz not null default now()
);

-- A child's AAC profile: the whole communication system as one JSON document + a version.
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  age int,
  intake jsonb,
  data jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null,
  -- the family's code a professional enters to ask for a connection
  connection_code text unique
);

create table public.members (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null default '',
  email text,
  role text not null check (role in ('parent', 'therapist', 'teacher', 'caregiver', 'family', 'other', 'device')),
  level int not null check (level between 1 and 3),
  perms jsonb not null default '{}',
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (profile_id, user_id)
);
create index on public.members (user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  direction text not null check (direction in ('invite', 'request')),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  child_name text not null,
  from_user_id uuid not null references auth.users (id) on delete cascade,
  from_name text not null default '',
  email text,
  to_user_id uuid references auth.users (id) on delete cascade,
  name text,
  code text not null unique,
  role text not null,
  level int not null check (level between 1 and 3),
  perms jsonb not null default '{}',
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now()
);
create index on public.invitations (profile_id);
create index on public.invitations (to_user_id);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  child_name text not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text not null default '',
  author_role text not null,
  title text not null,
  reason text,
  ops jsonb not null,
  base_version int not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'revision', 'withdrawn')),
  decision_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users (id) on delete set null
);
create index on public.proposals (profile_id);
create index on public.proposals (author_id);

-- Configuration changes only (vocabulary, boards, settings): never what the child said.
create table public.history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text not null default '',
  summary text not null,
  ops jsonb not null,
  inverse jsonb not null,
  proposal_id uuid references public.proposals (id) on delete set null,
  created_at timestamptz not null default now(),
  undone_at timestamptz
);
create index on public.history (profile_id);

create table public.devices (
  id text not null,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('primary', 'secondary', 'companion')),
  platform text not null default '',
  last_synced_at timestamptz,
  last_backup_at timestamptz,
  pending_changes int not null default 0,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (profile_id, id)
);

create table public.pairing_codes (
  code text primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  access text not null check (access in ('full', 'use')),
  expires_at timestamptz not null,
  created_by uuid not null references auth.users (id) on delete cascade
);

create table public.verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  country text not null,
  profession text not null,
  organization text,
  documents jsonb not null default '[]',
  status text not null default 'draft' check (status in ('draft', 'pending', 'verified', 'more_info', 'rejected')),
  note text,
  submitted_at timestamptz,
  decided_at timestamptz
);

create table public.notices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  text text not null,
  profile_id uuid references public.profiles (id) on delete cascade,
  ref_id text,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
create index on public.notices (user_id, created_at desc);

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  owner_name text not null default '',
  kind text not null check (kind in ('tla', 'schedule', 'firstThen', 'timer', 'cards')),
  title text not null,
  profile_id uuid references public.profiles (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.resources (owner_id);

create table public.resource_shares (
  resource_id uuid not null references public.resources (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('view', 'edit')),
  shared_by uuid not null references auth.users (id) on delete cascade,
  shared_at timestamptz not null default now(),
  check ((user_id is null) <> (profile_id is null))
);
create index on public.resource_shares (resource_id);

-- ───────────────────────── Helpers ─────────────────────────

-- The current user's access to a profile: owner, or an active, non-expired member.
create function public.access_of(p_profile uuid)
returns table (owner boolean, role text, level int, perms jsonb)
language sql stable security definer set search_path = public as $$
  select true, 'owner', 3,
         '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
    from profiles where id = p_profile and owner_id = auth.uid()
  union all
  select false, m.role, m.level, m.perms
    from members m
   where m.profile_id = p_profile and m.user_id = auth.uid() and m.status = 'active'
     and (m.expires_at is null or m.expires_at > now())
     and not exists (select 1 from profiles where id = p_profile and owner_id = auth.uid())
  limit 1
$$;

create function public.can_read(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.access_of(p_profile))
$$;

create function public.is_manager(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.owner or coalesce((a.perms ->> 'manager')::boolean, false) from public.access_of(p_profile) a), false)
$$;

create function public.managers_of(p_profile uuid) returns setof uuid
language sql stable security definer set search_path = public as $$
  select owner_id from profiles where id = p_profile
  union
  select user_id from members
   where profile_id = p_profile and status = 'active' and coalesce((perms ->> 'manager')::boolean, false)
$$;

create function public.my_name() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(nullif(a.display_name, ''), u.email, u.phone, '—')
    from auth.users u left join accounts a on a.id = u.id where u.id = auth.uid()
$$;

create function public.notify(p_user uuid, p_kind text, p_text text, p_profile uuid default null, p_ref text default null)
returns void language sql security definer set search_path = public as $$
  insert into notices (user_id, kind, text, profile_id, ref_id)
  select p_user, p_kind, p_text, p_profile, p_ref where p_user is not null
$$;

-- Codes people type: 8 characters, no 0/O or 1/I.
create function public.friendly_code() returns text
language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
    from generate_series(1, 8)
$$;

-- ───────────────────────── New accounts ─────────────────────────

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into accounts (id, role, display_name)
  values (new.id,
          case when new.raw_user_meta_data ->> 'role' = 'pro' then 'pro' else 'parent' end,
          coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  -- invitations sent to this email before the account existed
  update invitations set to_user_id = new.id
   where direction = 'invite' and status = 'pending' and to_user_id is null
     and email is not null and lower(email) = lower(new.email);
  insert into notices (user_id, kind, text, ref_id)
  select new.id, 'invitation', from_name || ' vous invite à rejoindre l''équipe de ' || child_name || '.', id::text
    from invitations where to_user_id = new.id and status = 'pending';
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create function public.delete_account() returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  delete from auth.users where id = auth.uid();
end $$;

-- ───────────────────────── Profiles ─────────────────────────

create function public.list_profiles()
returns table (id uuid, name text, age int, owner_id uuid, access text, level int, updated_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.age, p.owner_id,
         case when p.owner_id = auth.uid() then 'owner' else m.role end,
         case when p.owner_id = auth.uid() then 3 else m.level end,
         p.updated_at
    from profiles p
    left join members m on m.profile_id = p.id and m.user_id = auth.uid() and m.status = 'active'
                       and (m.expires_at is null or m.expires_at > now())
   where p.owner_id = auth.uid() or m.user_id is not null
   order by p.name
$$;

-- Saves only if nobody saved a newer version meanwhile; level 3 never moves core vocabulary.
create function public.save_profile(p_id uuid, p_data jsonb, p_base int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a record;
  cur profiles;
begin
  select * into a from access_of(p_id);
  if not found then raise exception 'forbidden'; end if;
  select * into cur from profiles where id = p_id for update;
  if not (a.owner or coalesce((a.perms ->> 'manager')::boolean, false)) then
    if a.level < 3 then raise exception 'forbidden'; end if;
    if (p_data -> 'boards' -> 'core') is distinct from (cur.data -> 'boards' -> 'core') then
      raise exception 'core_protected';
    end if;
  end if;
  if cur.version <> p_base then
    return jsonb_build_object('ok', false, 'conflict', to_jsonb(cur) - 'connection_code');
  end if;
  update profiles set data = p_data, version = version + 1, updated_at = now(), updated_by = auth.uid() where id = p_id;
  return jsonb_build_object('ok', true, 'version', cur.version + 1);
end $$;

-- ───────────────────────── Team ─────────────────────────

create function public.update_member(p_id uuid, p_user uuid, p_level int, p_perms jsonb, p_role text, p_expires timestamptz, p_set_expiry boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  update members set
    level = coalesce(p_level, level),
    perms = coalesce(p_perms, perms),
    role = coalesce(p_role, role),
    expires_at = case when p_set_expiry then p_expires else expires_at end
  where profile_id = p_id and user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  perform notify(p_user, 'access', 'Vos droits sur le profil de ' || (select name from profiles where id = p_id) || ' ont changé.', p_id);
end $$;

create function public.revoke_member(p_id uuid, p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  update members set status = 'revoked' where profile_id = p_id and user_id = p_user;
  perform notify(p_user, 'access', 'Votre accès au profil de ' || (select name from profiles where id = p_id) || ' a été retiré.', p_id);
end $$;

create function public.invite(p_id uuid, p_email text, p_name text, p_role text, p_level int, p_perms jsonb)
returns invitations language plpgsql security definer set search_path = public as $$
declare
  a record;
  inv invitations;
  target uuid;
begin
  select * into a from access_of(p_id);
  if not found or not (a.owner or coalesce((a.perms ->> 'invite')::boolean, false) or coalesce((a.perms ->> 'manager')::boolean, false)) then
    raise exception 'forbidden';
  end if;
  select id into target from auth.users where p_email is not null and lower(email) = lower(p_email) and email_confirmed_at is not null;
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, to_user_id, name, code, role, level, perms)
  values ('invite', p_id, (select name from profiles where id = p_id), auth.uid(), my_name(), lower(nullif(trim(p_email), '')), target,
          nullif(trim(p_name), ''), friendly_code(), p_role, p_level, p_perms)
  returning * into inv;
  perform notify(target, 'invitation', inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

create function public.join_profile(inv invitations, p_user uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into members (profile_id, user_id, display_name, email, role, level, perms)
  select inv.profile_id, p_user,
         case when inv.direction = 'invite' then coalesce(inv.name, coalesce(nullif(a.display_name, ''), u.email, '—')) else coalesce(nullif(a.display_name, ''), u.email, '—') end,
         u.email, inv.role, p_level, p_perms
    from auth.users u left join accounts a on a.id = u.id where u.id = p_user
  on conflict (profile_id, user_id) do update set status = 'active', role = excluded.role, level = excluded.level, perms = excluded.perms, expires_at = null;
  update invitations set status = 'accepted' where id = inv.id;
end $$;
revoke execute on function public.join_profile(invitations, uuid, int, jsonb) from public, anon, authenticated;

create function public.respond_invitation(p_inv uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if inv.direction = 'request' then
    if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
    if p_accept then perform join_profile(inv, inv.from_user_id, inv.level, inv.perms);
    else update invitations set status = 'declined' where id = inv.id; end if;
    perform notify(inv.from_user_id, 'access',
      'Votre demande pour ' || inv.child_name || case when p_accept then ' a été acceptée.' else ' a été refusée.' end, inv.profile_id);
    return;
  end if;
  if not (inv.to_user_id = auth.uid() or (inv.email is not null and inv.email = lower(auth.email()))) then
    raise exception 'forbidden';
  end if;
  if p_accept then perform join_profile(inv, auth.uid(), inv.level, inv.perms);
  else update invitations set status = 'declined' where id = inv.id; end if;
  perform notify(inv.from_user_id, 'access',
    my_name() || case when p_accept then ' a accepté' else ' a refusé' end || ' l''invitation pour ' || inv.child_name || '.', inv.profile_id);
end $$;

create function public.accept_invitation_code(p_code text) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where direction = 'invite' and status = 'pending' and code = upper(trim(p_code)) for update;
  if not found then raise exception 'code_invalid'; end if;
  perform join_profile(inv, auth.uid(), inv.level, inv.perms);
  perform notify(inv.from_user_id, 'access', my_name() || ' a rejoint l''équipe de ' || inv.child_name || '.', inv.profile_id);
  select * into inv from invitations where id = inv.id;
  return inv;
end $$;

create function public.cancel_invitation(p_inv uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv;
  if not found then raise exception 'not_found'; end if;
  if inv.from_user_id <> auth.uid() and not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
  if inv.status = 'accepted' then
    update members set status = 'revoked' where profile_id = inv.profile_id and user_id = coalesce(inv.to_user_id, inv.from_user_id);
  end if;
  update invitations set status = 'cancelled' where id = p_inv;
end $$;

create function public.resend_invitation(p_inv uuid) returns invitations
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv;
  if not found then raise exception 'not_found'; end if;
  if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
  update invitations set created_at = now() where id = p_inv returning * into inv;
  perform notify(inv.to_user_id, 'invitation', 'Rappel : ' || inv.from_name || ' vous invite à rejoindre l''équipe de ' || inv.child_name || '.', null, inv.id::text);
  return inv;
end $$;

create function public.connection_code(p_id uuid, p_renew boolean default false) returns text
language plpgsql security definer set search_path = public as $$
declare
  c text;
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  select connection_code into c from profiles where id = p_id;
  if c is null or p_renew then
    c := friendly_code();
    update profiles set connection_code = c where id = p_id;
  end if;
  return c;
end $$;

create function public.request_connection(p_code text, p_role text, p_level int, p_perms jsonb, p_message text)
returns invitations language plpgsql security definer set search_path = public as $$
declare
  p profiles;
  inv invitations;
  m uuid;
begin
  select * into p from profiles where connection_code = upper(trim(p_code));
  if not found then raise exception 'code_invalid'; end if;
  if can_read(p.id) then raise exception 'already_member'; end if;
  insert into invitations (direction, profile_id, child_name, from_user_id, from_name, email, code, role, level, perms, message)
  values ('request', p.id, p.name, auth.uid(), my_name(), lower(auth.email()), friendly_code(), p_role, p_level, p_perms, nullif(trim(p_message), ''))
  returning * into inv;
  for m in select managers_of(p.id) loop
    perform notify(m, 'request', inv.from_name || ' demande à rejoindre l''équipe de ' || p.name || '.', p.id, inv.id::text);
  end loop;
  return inv;
end $$;

create function public.approve_request(p_inv uuid, p_level int, p_perms jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  inv invitations;
begin
  select * into inv from invitations where id = p_inv and direction = 'request' and status = 'pending' for update;
  if not found then raise exception 'not_found'; end if;
  if not is_manager(inv.profile_id) then raise exception 'forbidden'; end if;
  perform join_profile(inv, inv.from_user_id, p_level, p_perms);
  perform notify(inv.from_user_id, 'access', 'Votre demande pour ' || inv.child_name || ' a été acceptée.', inv.profile_id);
end $$;

-- ───────────────────────── Proposals and history ─────────────────────────

create function public.create_proposal(p_id uuid, p_title text, p_reason text, p_ops jsonb, p_base int)
returns proposals language plpgsql security definer set search_path = public as $$
declare
  a record;
  prop proposals;
  m uuid;
begin
  select * into a from access_of(p_id);
  if not found or (not a.owner and a.level < 2 and not coalesce((a.perms ->> 'manager')::boolean, false)) then
    raise exception 'forbidden';
  end if;
  insert into proposals (profile_id, child_name, author_id, author_name, author_role, title, reason, ops, base_version)
  values (p_id, (select name from profiles where id = p_id), auth.uid(), my_name(),
          case when a.owner then 'parent' else a.role end, trim(p_title), nullif(trim(p_reason), ''), p_ops, p_base)
  returning * into prop;
  for m in select managers_of(p_id) loop
    if m <> auth.uid() then
      perform notify(m, 'proposal', prop.author_name || ' propose : ' || prop.title, p_id, prop.id::text);
    end if;
  end loop;
  return prop;
end $$;

create function public.update_proposal(p_prop uuid, p_title text, p_reason text, p_ops jsonb, p_base int)
returns proposals language plpgsql security definer set search_path = public as $$
declare
  prop proposals;
  m uuid;
begin
  update proposals set
    title = coalesce(nullif(trim(p_title), ''), title),
    reason = coalesce(nullif(trim(p_reason), ''), reason),
    ops = p_ops, base_version = p_base, status = 'pending', decision_note = null
  where id = p_prop and author_id = auth.uid()
  returning * into prop;
  if not found then raise exception 'forbidden'; end if;
  for m in select managers_of(prop.profile_id) loop
    perform notify(m, 'proposal', prop.author_name || ' a révisé : ' || prop.title, prop.profile_id, prop.id::text);
  end loop;
  return prop;
end $$;

create function public.set_proposal_status(p_prop uuid, p_status text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  prop proposals;
begin
  select * into prop from proposals where id = p_prop for update;
  if not found then raise exception 'not_found'; end if;
  if p_status = 'withdrawn' then
    if prop.author_id <> auth.uid() then raise exception 'forbidden'; end if;
  elsif not is_manager(prop.profile_id) then
    raise exception 'forbidden';
  end if;
  update proposals set status = p_status, decision_note = nullif(trim(p_note), ''), decided_at = now(), decided_by = auth.uid() where id = p_prop;
  if p_status in ('approved', 'declined', 'revision') then
    perform notify(prop.author_id, case when p_status = 'revision' then 'revision' else 'decision' end,
      case p_status when 'approved' then 'Proposition acceptée : ' when 'declined' then 'Proposition refusée : ' else 'Révision demandée : ' end || prop.title,
      prop.profile_id, prop.id::text);
  end if;
end $$;

create function public.add_history(p_id uuid, p_summary text, p_ops jsonb, p_inverse jsonb, p_proposal uuid)
returns history language plpgsql security definer set search_path = public as $$
declare
  h history;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  insert into history (profile_id, actor_id, actor_name, summary, ops, inverse, proposal_id)
  values (p_id, auth.uid(), my_name(), p_summary, p_ops, p_inverse, p_proposal)
  returning * into h;
  return h;
end $$;

create function public.mark_undone(p_hist uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  select profile_id into pid from history where id = p_hist;
  if pid is null then raise exception 'not_found'; end if;
  if not is_manager(pid) then raise exception 'forbidden'; end if;
  update history set undone_at = now() where id = p_hist;
end $$;

-- ───────────────────────── Devices ─────────────────────────

create function public.register_device(p_id uuid, p_dev text, p_name text, p_kind text, p_platform text)
returns devices language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = p_dev;
  if found and d.revoked then raise exception 'device_revoked'; end if;
  insert into devices (id, profile_id, user_id, name, kind, platform)
  values (p_dev, p_id, auth.uid(), p_name, p_kind, p_platform)
  on conflict (profile_id, id) do update set name = excluded.name, kind = excluded.kind, platform = excluded.platform
  returning * into d;
  return d;
end $$;

create function public.report_sync(p_id uuid, p_dev text, p_synced boolean, p_backed boolean, p_pending int) returns void
language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  select * into d from devices where profile_id = p_id and id = p_dev and user_id = auth.uid();
  if not found then return; end if;
  if d.revoked then raise exception 'device_revoked'; end if;
  update devices set
    last_synced_at = case when p_synced then now() else last_synced_at end,
    last_backup_at = case when p_backed then now() else last_backup_at end,
    pending_changes = coalesce(p_pending, pending_changes)
  where profile_id = p_id and id = p_dev;
end $$;

create function public.revoke_device(p_id uuid, p_dev text) returns void
language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  update devices set revoked = true where profile_id = p_id and id = p_dev returning * into d;
  if not found then raise exception 'not_found'; end if;
  -- a device linked with a pairing code has its own access: it ends too
  update members set status = 'revoked' where profile_id = p_id and user_id = d.user_id and role = 'device';
end $$;

create function public.create_pairing_code(p_id uuid, p_access text)
returns table (code text, expires_at timestamptz) language plpgsql security definer set search_path = public as $$
declare
  c text := lpad(floor(random() * 1000000)::int::text, 6, '0');
begin
  if not is_manager(p_id) then raise exception 'forbidden'; end if;
  delete from pairing_codes where pairing_codes.expires_at < now();
  insert into pairing_codes (code, profile_id, access, expires_at, created_by)
  values (c, p_id, p_access, now() + interval '10 minutes', auth.uid());
  return query select c, now() + interval '10 minutes';
end $$;

-- On the new device (signed in anonymously): links it to the child's profile.
create function public.redeem_pairing_code(p_code text, p_dev text, p_name text, p_platform text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pc pairing_codes;
  full_access boolean;
begin
  select * into pc from pairing_codes where code = trim(p_code) and expires_at > now() for update;
  if not found then raise exception 'code_invalid'; end if;
  delete from pairing_codes where code = pc.code;
  full_access := pc.access = 'full';
  insert into members (profile_id, user_id, display_name, role, level, perms)
  values (pc.profile_id, auth.uid(), p_name, 'device', case when full_access then 3 else 1 end,
          case when full_access
               then '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true}'::jsonb
               else '{"createMaterials":false,"proposeVocabulary":false,"changeAccess":false,"invite":false,"manageDevices":false,"manager":false}'::jsonb end)
  on conflict (profile_id, user_id) do update set status = 'active', level = excluded.level, perms = excluded.perms;
  insert into devices (id, profile_id, user_id, name, kind, platform)
  values (p_dev, pc.profile_id, auth.uid(), p_name, case when full_access then 'primary' else 'secondary' end, p_platform)
  on conflict (profile_id, id) do update set revoked = false, user_id = excluded.user_id;
  update accounts set display_name = p_name, prefs = prefs || jsonb_build_object('activeProfileId', pc.profile_id) where id = auth.uid();
  return pc.profile_id;
end $$;

-- ───────────────────────── Verification, library ─────────────────────────

create function public.submit_verification() returns verifications
language plpgsql security definer set search_path = public as $$
declare
  v verifications;
begin
  select * into v from verifications where user_id = auth.uid() for update;
  if not found or v.full_name = '' or v.country = '' or v.profession = '' or jsonb_array_length(v.documents) = 0 then
    raise exception 'incomplete';
  end if;
  update verifications set status = 'pending', submitted_at = now(), note = null where user_id = auth.uid() returning * into v;
  return v;
end $$;

create function public.share_resource(p_res uuid, p_email text, p_profile uuid, p_mode text) returns void
language plpgsql security definer set search_path = public as $$
declare
  r resources;
  target uuid;
  m uuid;
begin
  select * into r from resources where id = p_res and owner_id = auth.uid();
  if not found then raise exception 'not_found'; end if;
  if p_profile is not null then
    if not can_read(p_profile) then raise exception 'forbidden'; end if;
    insert into resource_shares (resource_id, profile_id, mode, shared_by) values (p_res, p_profile, p_mode, auth.uid());
    for m in select managers_of(p_profile) loop
      perform notify(m, 'share', my_name() || ' a partagé « ' || r.title || ' ».', p_profile, r.id::text);
    end loop;
  else
    select id into target from auth.users where lower(email) = lower(p_email);
    if target is null then raise exception 'no_account'; end if;
    insert into resource_shares (resource_id, user_id, mode, shared_by) values (p_res, target, p_mode, auth.uid());
    perform notify(target, 'share', my_name() || ' a partagé « ' || r.title || ' » avec vous.', null, r.id::text);
  end if;
end $$;

create function public.shared_with_me(p_res uuid, p_mode text default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from resource_shares s
     where s.resource_id = p_res and (p_mode is null or s.mode = p_mode)
       and (s.user_id = auth.uid() or (s.profile_id is not null and can_read(s.profile_id))))
$$;

-- ───────────────────────── Row-level security ─────────────────────────

alter table public.accounts enable row level security;
alter table public.profiles enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.proposals enable row level security;
alter table public.history enable row level security;
alter table public.devices enable row level security;
alter table public.pairing_codes enable row level security;
alter table public.verifications enable row level security;
alter table public.notices enable row level security;
alter table public.resources enable row level security;
alter table public.resource_shares enable row level security;

create policy "own account" on public.accounts for select to authenticated using (id = auth.uid());
create policy "update own account" on public.accounts for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Profiles: read if owner or member; create as owner; data changes only through save_profile().
create policy "read profiles" on public.profiles for select to authenticated using (can_read(id));
create policy "create own profiles" on public.profiles for insert to authenticated with check (owner_id = auth.uid());
create policy "rename own profiles" on public.profiles for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "delete own profiles" on public.profiles for delete to authenticated using (owner_id = auth.uid());

create policy "read team" on public.members for select to authenticated using (can_read(profile_id));

create policy "read invitations" on public.invitations for select to authenticated using (
  is_manager(profile_id) or from_user_id = auth.uid() or to_user_id = auth.uid()
  or (email is not null and email = lower(auth.email())));

create policy "read proposals" on public.proposals for select to authenticated using (can_read(profile_id) or author_id = auth.uid());

create policy "read history" on public.history for select to authenticated using (can_read(profile_id));

create policy "read devices" on public.devices for select to authenticated using (is_manager(profile_id) or user_id = auth.uid());

-- pairing_codes: no policy at all — reachable only through the functions above.

create policy "own verification" on public.verifications for select to authenticated using (user_id = auth.uid());
create policy "start verification" on public.verifications for insert to authenticated
  with check (user_id = auth.uid() and status = 'draft');
create policy "edit verification" on public.verifications for update to authenticated
  using (user_id = auth.uid() and status in ('draft', 'more_info'))
  with check (user_id = auth.uid() and status in ('draft', 'more_info'));

create policy "own notices" on public.notices for select to authenticated using (user_id = auth.uid());
create policy "mark own notices" on public.notices for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read resources" on public.resources for select to authenticated using (owner_id = auth.uid() or shared_with_me(id));
create policy "create resources" on public.resources for insert to authenticated
  with check (owner_id = auth.uid() and (profile_id is null or can_read(profile_id)));
create policy "edit resources" on public.resources for update to authenticated
  using (owner_id = auth.uid() or shared_with_me(id, 'edit'));
create policy "delete own resources" on public.resources for delete to authenticated using (owner_id = auth.uid());

create policy "read shares" on public.resource_shares for select to authenticated using (
  user_id = auth.uid() or shared_by = auth.uid() or (profile_id is not null and can_read(profile_id)));

-- Internal helpers are not callable from the app.
revoke execute on function public.notify(uuid, text, text, uuid, text) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
