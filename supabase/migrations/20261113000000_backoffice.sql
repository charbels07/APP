-- Back office: the app's own team.
--  • checks the professionals' certificates and accepts them (until then a professional cannot
--    join a child's team);
--  • reads figures that help improve the app: counts for everybody (accounts, tablets, teamwork),
--    and anonymous usage numbers only for the families who chose to share them;
--  • reads the messages people send from the app.
-- Who is in the team is the "admins" table, filled by hand in the SQL editor (see supabase/README.md).
-- Everything goes through functions that first check is_admin(); every decision and every
-- certificate opened is written in admin_log.

-- ───────────────────────── Who is in the team ─────────────────────────

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text,
  added_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policy: nobody reads or changes this list from the app.

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null
     and not coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
     and exists (select 1 from admins where user_id = auth.uid())
$$;

create table public.admin_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users (id) on delete set null,
  admin_name text not null default '',
  action text not null,
  target_id uuid,
  target_name text,
  detail text,
  created_at timestamptz not null default now()
);
create index on public.admin_log (created_at desc);
alter table public.admin_log enable row level security;
-- No policy: read through admin_history() only.

create function public.admin_note(p_action text, p_target uuid, p_target_name text, p_detail text) returns void
language sql security definer set search_path = public as $$
  insert into admin_log (admin_id, admin_name, action, target_id, target_name, detail)
  values (auth.uid(), my_name(), p_action, p_target, p_target_name, p_detail)
$$;
revoke execute on function public.admin_note(text, uuid, text, text) from public, anon, authenticated;

-- ───────────────────────── A professional works only once accepted ─────────────────────────

-- True for a family account, and for a professional whose certificate was accepted.
create function public.pro_cleared(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (select 1 from accounts where id = p_user and role = 'pro')
      or exists (select 1 from verifications where user_id = p_user and status = 'verified')
$$;
revoke execute on function public.pro_cleared(uuid) from public, anon, authenticated;

-- Joining a team (accepting an invitation, being approved by the family) and asking a family
-- for a connection are refused until then. Triggers also run inside the database's own functions.
create function public.cleared_to_join() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'active' and (tg_op = 'INSERT' or old.status is distinct from 'active') and not pro_cleared(new.user_id) then
    raise exception 'pro_not_verified';
  end if;
  return new;
end $$;
create trigger cleared_to_join before insert or update on public.members
for each row execute function public.cleared_to_join();

create function public.cleared_to_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.direction = 'request' and not pro_cleared(new.from_user_id) then raise exception 'pro_not_verified'; end if;
  return new;
end $$;
create trigger cleared_to_request before insert on public.invitations
for each row execute function public.cleared_to_request();
revoke execute on function public.cleared_to_join() from public, anon, authenticated;
revoke execute on function public.cleared_to_request() from public, anon, authenticated;

-- If an acceptance is withdrawn later, the professional's access is suspended (not erased):
-- accepting again gives it back as it was.
create or replace function public.access_of(p_profile uuid)
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
     and pro_cleared(m.user_id)
  limit 1
$$;

-- ───────────────────────── Certificates ─────────────────────────

-- Notices are written in the language the person chose for the menus.
create function public.in_lang(p_user uuid, p_fr text, p_en text, p_ar text) returns text
language sql stable security definer set search_path = public as $$
  select case coalesce((select prefs ->> 'uiLang' from accounts where id = p_user), 'fr')
           when 'en' then p_en when 'ar' then p_ar else p_fr end
$$;
revoke execute on function public.in_lang(uuid, text, text, text) from public, anon, authenticated;

-- Every request that was sent (drafts are not shown), the ones waiting first.
create function public.admin_verifications()
returns table (user_id uuid, full_name text, country text, profession text, organization text, documents jsonb,
               status text, note text, submitted_at timestamptz, decided_at timestamptz,
               email text, phone text, account_name text, account_created_at timestamptz, children int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select v.user_id, v.full_name, v.country, v.profession, v.organization, v.documents,
         v.status, v.note, v.submitted_at, v.decided_at,
         u.email::text, u.phone::text, a.display_name, a.created_at,
         (select count(*)::int from members m where m.user_id = v.user_id and m.status = 'active')
    from verifications v
    join auth.users u on u.id = v.user_id
    left join accounts a on a.id = v.user_id
   where v.status <> 'draft'
   order by (v.status = 'pending') desc, v.submitted_at desc nulls last;
end $$;

-- Accept ('verified'), ask for something more ('more_info') or refuse ('rejected').
-- A note for the professional is required unless the certificate is accepted.
create function public.admin_decide_verification(p_user uuid, p_status text, p_note text default null) returns verifications
language plpgsql security definer set search_path = public as $$
declare
  v verifications;
  n text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  if p_status not in ('verified', 'more_info', 'rejected') then raise exception 'invalid'; end if;
  if p_status <> 'verified' and n is null then raise exception 'note_required'; end if;
  select * into v from verifications where user_id = p_user for update;
  if not found or v.status = 'draft' then raise exception 'not_found'; end if;
  -- The identity document only served to check the certificate is hers: once the request is
  -- accepted or refused it is forgotten (the back office deletes the file itself just before).
  update verifications
     set status = p_status, note = n, decided_at = now(),
         documents = case when p_status = 'more_info' then documents
                          else coalesce((select jsonb_agg(d) from jsonb_array_elements(documents) d where d ->> 'kind' is distinct from 'id'), '[]'::jsonb) end
   where user_id = p_user returning * into v;
  perform notify(p_user, 'verification', case p_status
    when 'verified' then in_lang(p_user,
      'Votre certificat a été accepté : vous pouvez maintenant rejoindre l''équipe d''un enfant.',
      'Your certificate was accepted: you can now join a child''s team.',
      'تم قبول شهادتك: يمكنك الآن الانضمام إلى فريق طفل.')
    when 'more_info' then in_lang(p_user,
      'Vérification : il nous manque une information. ' || n,
      'Verification: we need one more thing. ' || n,
      'التحقق: نحتاج إلى معلومة إضافية. ' || n)
    else in_lang(p_user,
      'Votre demande de vérification n''a pas été acceptée. ' || n,
      'Your verification request was not accepted. ' || n,
      'لم يتم قبول طلب التحقق. ' || n) end);
  perform admin_note(p_status, p_user, v.full_name, n);
  return v;
end $$;

-- Before a certificate is opened: checks the file belongs to that request and writes who opened it.
-- The file itself is then read from the private storage (policy below) with a link that expires.
create function public.admin_open_document(p_user uuid, p_ref text) returns text
language plpgsql security definer set search_path = public as $$
declare
  v verifications;
  doc jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select * into v from verifications where user_id = p_user;
  if not found then raise exception 'not_found'; end if;
  select d into doc from jsonb_array_elements(v.documents) d where d ->> 'ref' = p_ref limit 1;
  if doc is null or p_ref not like p_user::text || '/%' then raise exception 'not_found'; end if;
  perform admin_note('open_document', p_user, v.full_name, coalesce(doc ->> 'kind', '') || ' · ' || coalesce(doc ->> 'name', ''));
  return p_ref;
end $$;

create policy "back office: read verification docs" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());
create policy "back office: delete verification docs" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and public.is_admin());

create function public.admin_history(p_limit int default 200)
returns setof admin_log language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query select * from admin_log order by created_at desc limit least(greatest(p_limit, 1), 1000);
end $$;

-- ───────────────────────── Messages sent from the app ─────────────────────────

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('problem', 'idea', 'other')),
  text text not null check (char_length(text) between 3 and 4000),
  platform text not null default '',
  app_version text not null default '',
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index on public.feedback (created_at desc);
alter table public.feedback enable row level security;
-- No policy: written through send_feedback(), read through admin_feedback().
create trigger no_tablets before insert on public.feedback for each row execute function public.no_tablets();

create function public.send_feedback(p_kind text, p_text text, p_platform text default '', p_version text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if (select count(*) from feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many';
  end if;
  insert into feedback (user_id, kind, text, platform, app_version)
  values (auth.uid(), p_kind, trim(p_text), left(coalesce(p_platform, ''), 40), left(coalesce(p_version, ''), 20));
end $$;
revoke execute on function public.send_feedback(text, text, text, text) from public, anon;

create function public.admin_feedback()
returns table (id uuid, kind text, text text, platform text, app_version text, status text, created_at timestamptz,
               from_name text, from_role text, from_email text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select f.id, f.kind, f.text, f.platform, f.app_version, f.status, f.created_at,
         coalesce(nullif(a.display_name, ''), '—'), coalesce(a.role, ''), u.email::text
    from feedback f
    join auth.users u on u.id = f.user_id
    left join accounts a on a.id = f.user_id
   order by (f.status = 'new') desc, f.created_at desc
   limit 500;
end $$;

create function public.admin_set_feedback(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  update feedback set status = p_status where id = p_id;
  if not found then raise exception 'not_found'; end if;
end $$;

-- ───────────────────────── Which version of the app runs on the tablets ─────────────────────────

alter table public.devices add column app_version text not null default '';
alter table public.devices add column last_seen_at timestamptz;

drop function public.register_device(uuid, text, text, text, text);
create function public.register_device(p_id uuid, p_dev text, p_name text, p_kind text, p_platform text, p_version text default '')
returns devices language plpgsql security definer set search_path = public as $$
declare
  d devices;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  select * into d from devices where profile_id = p_id and id = p_dev;
  if found and d.revoked then raise exception 'device_revoked'; end if;
  insert into devices (id, profile_id, user_id, name, kind, platform, app_version, last_seen_at)
  values (p_dev, p_id, auth.uid(), p_name, p_kind, p_platform, coalesce(p_version, ''), now())
  on conflict (profile_id, id) do update
    set name = excluded.name, kind = excluded.kind, platform = excluded.platform,
        app_version = excluded.app_version, last_seen_at = now()
  returning * into d;
  return d;
end $$;

-- ───────────────────────── Figures ─────────────────────────

-- Two private lists the figures are computed from (not reachable from the app).
-- People with an account: tablets linked with a code sign in without one and are counted apart.
create view public.bo_people as
select a.id, a.role, a.created_at, coalesce(a.prefs ->> 'uiLang', '?') as lang,
       coalesce(u.email_confirmed_at, u.phone_confirmed_at) is not null as confirmed
  from public.accounts a join auth.users u on u.id = a.id
 where not coalesce(u.is_anonymous, false);
revoke all on public.bo_people from public, anon, authenticated;

-- One row per child and per day (a child may use two tablets the same day), last 90 days,
-- only for the families who turned on "share anonymous statistics". Numbers only.
create view public.bo_child_days as
select u.profile_id as child, max(p.age) as age, u.day,
       sum(coalesce((select sum((s ->> 'activeMs')::numeric) from jsonb_array_elements(coalesce(u.data -> 'sessions', '[]'::jsonb)) s), 0)) / 60000.0 as minutes,
       sum(coalesce((u.data ->> 'selections')::numeric, 0)) as selections,
       sum(coalesce((u.data ->> 'utterances')::numeric, 0)) as utterances,
       max(coalesce((u.data -> 'stats' ->> 'distinctConcepts')::numeric, 0)) as words,
       sum(coalesce((u.data -> 'stats' ->> 'len1')::numeric, 0)) as len1,
       sum(coalesce((u.data -> 'stats' ->> 'len2')::numeric, 0)) as len2,
       sum(coalesce((u.data -> 'stats' ->> 'len3plus')::numeric, 0)) as len3,
       sum(coalesce((u.data ->> 'searches')::numeric, 0)) as searches,
       sum(coalesce((u.data ->> 'tlaCreated')::numeric, 0)) as boards_made,
       sum(coalesce((u.data ->> 'errors')::numeric, 0)) as errors,
       sum(coalesce((u.data ->> 'offlineMs')::numeric, 0)) / 60000.0 as offline_min,
       jsonb_agg(coalesce(u.data -> 'modes', '{}'::jsonb)) as modes,
       jsonb_agg(coalesce(u.data -> 'hours', '[]'::jsonb)) as hours,
       max(split_part(coalesce(u.data ->> 'platform', ''), ' ', 1)) as platform
  from public.usage_days u join public.profiles p on p.id = u.profile_id
 where p.data -> 'settings' ->> 'shareStats' = 'anonymous' and u.day > current_date - 90
 group by u.profile_id, u.day;
revoke all on public.bo_child_days from public, anon, authenticated;

-- One document with every figure of the back office. Counts only: no name, no word, no sentence.
-- What comes from a child's profile or use of the app (the "usage" and "setup" parts) only covers
-- the families who turned on "share anonymous statistics", and is shown only from 5 children up,
-- so that nobody can be recognised from the numbers.
create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  o jsonb := '{}';
  part jsonb;
  sharing int;
  using_ int;
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
    'collection', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                     select coalesce(data -> 'settings' ->> 'dataCollection', 'off') k, count(*) n from profiles group by 1) t),
    'sharing', (select count(*) from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous'))
    into part;
  o := o || jsonb_build_object('families', part);

  select jsonb_build_object(
    'total', count(*),
    'seen7', count(*) filter (where last_seen_at > now() - interval '7 days'),
    'seen30', count(*) filter (where last_seen_at > now() - interval '30 days'),
    'waiting', count(*) filter (where pending_changes > 0),
    'platforms', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                    select coalesce(nullif(platform, ''), '?') k, count(*) n from devices where not revoked group by 1) t),
    'versions', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                   select coalesce(nullif(app_version, ''), '?') k, count(*) n from devices where not revoked group by 1) t))
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
  select count(*) into sharing from profiles where data -> 'settings' ->> 'shareStats' = 'anonymous';
  select count(distinct child) into using_ from bo_child_days;

  part := jsonb_build_object('sharing', sharing, 'children', using_, 'minimum', min_group, 'enough', using_ >= min_group, 'days', 90);
  if using_ >= min_group then
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
                    where e.value ~ '^[0-9.]+$' group by 1) t),
      'hours', (select coalesce(jsonb_agg(n order by h), '[]') from (
                  select g.h, coalesce((select sum(x.v::numeric) from bo_child_days d, jsonb_array_elements(d.hours) arr,
                                               jsonb_array_elements_text(arr) with ordinality x(v, i)
                                         where x.i = g.h + 1 and x.v ~ '^[0-9.]+$'), 0) n
                    from generate_series(0, 23) g(h)) t),
      'platforms', (select coalesce(jsonb_object_agg(k, n), '{}') from (
                      select coalesce(nullif(platform, ''), '?') k, count(distinct child) n from bo_child_days group by 1) t),
      'weeks', (select jsonb_agg(jsonb_build_object(
                  'week', w::date,
                  'children', (select count(distinct d.child) from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'minutes', (select round(avg(d.minutes), 1) from bo_child_days d where date_trunc('week', d.day::timestamp) = w),
                  'selections', (select round(avg(d.selections), 1) from bo_child_days d where date_trunc('week', d.day::timestamp) = w)) order by w)
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
  if sharing >= min_group then
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
           group by 1, 2) t group by key) t2),
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

-- Only signed-in people can call these (each one then checks is_admin()).
revoke execute on function public.is_admin() from public, anon;
revoke execute on function public.admin_verifications() from public, anon;
revoke execute on function public.admin_decide_verification(uuid, text, text) from public, anon;
revoke execute on function public.admin_open_document(uuid, text) from public, anon;
revoke execute on function public.admin_history(int) from public, anon;
revoke execute on function public.admin_feedback() from public, anon;
revoke execute on function public.admin_set_feedback(uuid, text) from public, anon;
revoke execute on function public.admin_overview() from public, anon;
