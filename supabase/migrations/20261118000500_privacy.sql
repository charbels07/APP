-- Privacy, second round (November 2026): the parent's consent kept as a record, data kept no
-- longer than needed, and "Download all my data".
--
--  1. Consent. A child's board can reveal health information. Before a family creates a child's
--     profile, or takes over one a professional prepared, the parent states that they are the
--     child's parent or legal guardian and agrees; the database keeps who, when and which text
--     (its version). Without it, the profile is not created (error `consent_needed`).
--  2. Retention, every night: follow-up days 24 months (the children's sentences 12 months),
--     change history 24 months, notices 12 months, messages to the team 3 years, the team's log
--     5 years, finished deletion work 30 days. Accounts without a sign-in for 24 months are only
--     counted for the team, who decide (nothing is deleted without a warning).
--  3. Export: one file with everything the database holds about the person and their children.
-- The values are a proposal to validate with the lawyer (docs/legal/RETENTION-SCHEDULE.md).

-- ───────────────────────── 1. Consent ─────────────────────────

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('child_data')),
  version int not null check (version between 1 and 1000),
  profile_id uuid references public.profiles (id) on delete set null,
  accepted_at timestamptz not null default now()
);
create index on public.consents (user_id, kind, accepted_at desc);
alter table public.consents enable row level security;
create policy "own consents" on public.consents for select to authenticated using (user_id = auth.uid());
create policy "two-step sign-in" on public.consents as restrictive for all to authenticated
  using ((select public.mfa_ok())) with check ((select public.mfa_ok()));
revoke insert, update, delete on public.consents from authenticated, anon;

-- The text the app shows is version 1 (src/lib/consent.ts). A new text: raise both together.
create function public.consent_version(p_kind text) returns int
language sql immutable as $$
  select case p_kind when 'child_data' then 1 else 0 end
$$;

create function public.give_consent(p_kind text, p_version int) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if p_kind is null or consent_version(p_kind) = 0 or p_version is null or p_version < consent_version(p_kind) then
    raise exception 'invalid';
  end if;
  perform rate_limit('consent', 30, interval '1 day');
  insert into consents (user_id, kind, version) values (auth.uid(), p_kind, p_version);
end $$;
revoke execute on function public.give_consent(text, int) from public, anon;
grant execute on function public.give_consent(text, int) to authenticated;

-- A consent given in the last day, at the current version, not yet used for another child.
create function public.take_consent(p_user uuid, p_profile uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  c uuid;
begin
  select id into c from consents
   where user_id = p_user and kind = 'child_data' and version >= consent_version('child_data')
     and accepted_at > now() - interval '1 day' and profile_id is null
   order by accepted_at desc limit 1 for update;
  if not found then return false; end if;
  update consents set profile_id = p_profile where id = c;
  return true;
end $$;
revoke execute on function public.take_consent(uuid, uuid) from public, anon, authenticated;

-- A family creates a child's profile: its consent first. (A verified professional prepares a
-- profile without it: recording and sharing stay off, and the parents consent when they take it.)
create function public.consent_on_create() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- A request from the app (the dashboard's SQL editor and the server's own jobs are not asked).
  if coalesce(auth.jwt() ->> 'role', '') = 'authenticated' and not is_pro(new.owner_id) and not take_consent(new.owner_id, new.id) then
    raise exception 'consent_needed';
  end if;
  return new;
end $$;
create trigger consent_on_create after insert on public.profiles
for each row execute function public.consent_on_create();

-- The parents take over a profile a professional prepared: their consent first.
create function public.consent_on_takeover() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.owner_id is distinct from old.owner_id and coalesce(auth.jwt() ->> 'role', '') = 'authenticated'
     and not is_pro(new.owner_id) and not take_consent(new.owner_id, new.id) then
    raise exception 'consent_needed';
  end if;
  return new;
end $$;
create trigger consent_on_takeover after update of owner_id on public.profiles
for each row execute function public.consent_on_takeover();
revoke execute on function public.consent_on_create() from public, anon, authenticated;
revoke execute on function public.consent_on_takeover() from public, anon, authenticated;

-- ───────────────────────── 2. Retention ─────────────────────────

create function public.retention_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  out jsonb := '{}'::jsonb;
  n int;
begin
  delete from usage_days where day < current_date - interval '24 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('usageDays', n);
  -- The children's sentences (follow-up level "sentences") go after 12 months; the counts stay.
  update usage_days set data = data - 'samples' where day < current_date - interval '12 months' and data ? 'samples';
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
  delete from storage_purge where done_at < now() - interval '30 days';
  return out;
end $$;
revoke execute on function public.retention_daily() from public, anon, authenticated;

-- For the back office's Security page: counts only.
create function public.admin_retention() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'inactiveAccounts', (select count(*) from auth.users u
                          where not coalesce(u.is_anonymous, false)
                            and coalesce(u.last_sign_in_at, u.created_at) < now() - interval '24 months'),
    'inBin', (select count(*) from profiles where deleted_at is not null),
    'filesWaiting', (select count(*) from storage_purge where done_at is null),
    'twoStepTeam', (select count(*) from admins a where mfa_enrolled(a.user_id)),
    'team', (select count(*) from admins),
    'consents', (select count(*) from consents where accepted_at > now() - interval '30 days'));
end $$;
revoke execute on function public.admin_retention() from public, anon;
grant execute on function public.admin_retention() to authenticated;

create function public.retention_plan() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'pg_cron is not turned on (Database → Extensions): nothing is removed automatically until it is.';
  end if;
  perform cron.schedule('retention-daily', '25 3 * * *', 'select public.retention_daily()');
  return 'Planned: every night at 03:25 UTC.';
exception when others then
  return 'The job could not be planned: ' || sqlerrm;
end $$;
revoke execute on function public.retention_plan() from public, anon, authenticated, service_role;
select public.retention_plan();

-- ───────────────────────── 3. "Download all my data" ─────────────────────────

-- Everything about the person, and about the children whose profile they own. A fresh proof is
-- asked first (a borrowed, unlocked phone must not hand it all out).
create function public.export_my_data() returns jsonb
language plpgsql stable security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
  mine uuid[];
begin
  if me is null or is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('export', 10, interval '1 day');
  select coalesce(array_agg(id), '{}') into mine from profiles where owner_id = me;
  return jsonb_build_object(
    'exportedAt', now(),
    'format', 'empower-communication/export-1',
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'phone', u.phone, 'createdAt', u.created_at,
                                          'lastSignInAt', u.last_sign_in_at, 'type', a.role, 'name', a.display_name, 'preferences', a.prefs)
                  from auth.users u left join accounts a on a.id = u.id where u.id = me),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) - 'user_id' order by c.accepted_at), '[]') from consents c where c.user_id = me),
    'children', (select coalesce(jsonb_agg(to_jsonb(p) order by p.name), '[]') from profiles p where p.id = any (mine)),
    'teams', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from members m where m.profile_id = any (mine) or m.user_id = me),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]') from invitations i
                     where i.profile_id = any (mine) or i.from_user_id = me or i.to_user_id = me),
    'proposals', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]') from proposals x where x.profile_id = any (mine) or x.author_id = me),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at), '[]') from history h where h.profile_id = any (mine)),
    'devices', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at), '[]') from devices d where d.profile_id = any (mine) or d.user_id = me),
    'followUpDays', (select coalesce(jsonb_agg(to_jsonb(u) order by u.day), '[]') from usage_days u where u.profile_id = any (mine)),
    'observations', (select coalesce(jsonb_agg(to_jsonb(o) order by o.at), '[]') from observations o where o.profile_id = any (mine) or o.created_by = me),
    'featureCounts', (select coalesce(jsonb_agg(to_jsonb(f) order by f.day), '[]') from feature_days f where f.profile_id = any (mine)),
    'boardCopies', (select coalesce(jsonb_agg(jsonb_build_object('profileId', s.profile_id, 'createdAt', s.created_at, 'reason', s.reason, 'board', s.data) order by s.created_at), '[]')
                      from profile_snapshots s where s.profile_id = any (mine)),
    'notices', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]') from notices n where n.user_id = me),
    'verification', (select to_jsonb(v) from verifications v where v.user_id = me),
    'materials', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') from resources r where r.owner_id = me),
    'messagesToTheTeam', (select coalesce(jsonb_agg(to_jsonb(f) - 'user_id' order by f.created_at), '[]') from feedback f where f.user_id = me),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('idea', r.title, 'at', v.created_at)), '[]')
                from roadmap_votes v join roadmap r on r.id = v.item_id where v.user_id = me),
    'notIncluded', 'Photos and recordings: they are files, kept in the app (each device, and the private storage of the child''s profile). Sign-in records kept by the sign-in service are given on request.');
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ───────────────────────── 4. A message to every family (incidents, maintenance) ─────────────────────────

-- The team writes one short message in three languages; each account receives it as a notice in its
-- own menu language (docs/runbooks/INCIDENT-RESPONSE.md). Team only, 5 a day, written in the team's log.
-- From the SQL editor: select public.admin_broadcast('…', '…', '…');
create function public.admin_broadcast(p_fr text, p_en text, p_ar text) returns int
language plpgsql security definer set search_path = public, auth as $$
declare
  n int;
begin
  -- The team in the app (with its two-step code), or someone with the dashboard (no sign-in token there).
  if not is_admin() and coalesce(auth.jwt() ->> 'role', '') <> '' then raise exception 'forbidden'; end if;
  if coalesce(trim(p_fr), '') = '' or coalesce(trim(p_en), '') = '' or coalesce(trim(p_ar), '') = ''
     or greatest(length(p_fr), length(p_en), length(p_ar)) > 500 then
    raise exception 'invalid';
  end if;
  if auth.uid() is not null then perform rate_limit('broadcast', 5, interval '1 day'); end if;
  insert into notices (user_id, kind, text)
  select u.id, 'access', in_lang(u.id, trim(p_fr), trim(p_en), trim(p_ar))
    from auth.users u where not coalesce(u.is_anonymous, false);
  get diagnostics n = row_count;
  perform admin_note('broadcast', null, null, left(trim(p_en), 200));
  return n;
end $$;
revoke execute on function public.admin_broadcast(text, text, text) from public, anon;
grant execute on function public.admin_broadcast(text, text, text) to authenticated;
