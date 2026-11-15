-- Product figures, bugs and requests: what the app's team needs to decide the next updates,
-- built so that the app knows its features well and the families' lives as little as possible.
--
--  1. Feature counters: how often each feature is used, as numbers per child and per day.
--     Names from a fixed list, numbers only: no word, no sentence, no text, no time of day.
--     Only for the families who agreed to the list that mentions them (shareTerms 2), never from
--     a professional's account, erased when the family withdraws, kept 180 days at most.
--     The back office only ever reads sums over at least 5 children of 5 families.
--  2. Technical problems: counters with no link to a child, an account or a device
--     (kind of problem, place in the code, screen, version). Same agreement needed to send one.
--  3. Requests: the messages people write themselves ("Help us improve"), now sorted by subject,
--     and a list of ideas people can vote for.
-- Nothing here is reachable without is_admin(), except what a person sends about themselves.

-- ───────────────────────── 1. The family's agreement ─────────────────────────

-- "Help improve the app" was first agreed for a shorter list (durations, touches, settings).
-- The counters below are new: they need the family to have agreed to the new list (shareTerms 2).
create function public.shares_product(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.data -> 'settings' ->> 'shareStats' = 'anonymous' and public.num(p.data -> 'settings' -> 'shareTerms', 100) >= 2
                     from profiles p where p.id = p_profile), false)
$$;

-- Like the other consent settings: only the family changes it (not an editor, not a
-- professional who prepares the profile).
create function public.guard_share_terms() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  a record;
begin
  if auth.uid() is null then return new; end if;
  if coalesce(new.data -> 'settings' ->> 'shareTerms', '0') is not distinct from coalesce(old.data -> 'settings' ->> 'shareTerms', '0') then return new; end if;
  select * into a from access_of(new.id);
  if not found or not (a.owner or coalesce((a.perms ->> 'manager')::boolean, false)) or (a.owner and is_pro(auth.uid())) then
    raise exception 'consent_protected' using detail = 'shareTerms';
  end if;
  return new;
end $$;
create trigger guard_share_terms before update of data on public.profiles
  for each row execute function public.guard_share_terms();

-- A new profile cannot arrive "already agreed": the agreement only counts when it comes with
-- the family's own choice to share (and never from a professional who prepares the profile).
create function public.new_profile_terms() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.data -> 'settings' ->> 'shareStats' is distinct from 'anonymous' or (auth.uid() is not null and is_pro(auth.uid())) then
    new.data := new.data #- '{settings,shareTerms}';
  end if;
  return new;
end $$;
create trigger new_profile_terms before insert on public.profiles
  for each row execute function public.new_profile_terms();

-- ───────────────────────── 2. Feature counters ─────────────────────────

-- The only names a counter can have (the app's list is the same: src/lib/product.ts).
create function public.product_keys() returns text[]
language sql immutable as $$
  select array[
    -- one per feature: "used that day"
    'board', 'tla', 'schedule', 'firstThen', 'timer', 'search', 'keyboard', 'model', 'edit', 'photo', 'recording',
    'print', 'followUp', 'ai', 'guide', 'lock',
    -- what happened inside a task
    'searchNone', 'searchPick', 'tlaStart', 'tlaDone', 'tlaMs', 'tlaAi', 'tlaPhoto', 'tlaKept', 'tlaChanged',
    'seqStart', 'seqDone', 'pictoSwap', 'printTla', 'printSchedule']
$$;

-- Keeps the known names with a whole number; anything else (text, lists, other names) is dropped.
create function public.clean_counts(d jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(e.key, floor(public.num(e.value, case when e.key like '%Ms' then 86400000 else 100000 end))), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(d) = 'object' then d else '{}'::jsonb end) e
   where e.key = any (public.product_keys()) and jsonb_typeof(e.value) = 'number'
$$;

create table public.feature_days (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null,
  day date not null,
  counts jsonb not null default '{}',
  platform text not null default '?',
  form text not null default '?',
  app_version text not null default '',
  updated_at timestamptz not null default now(),
  primary key (profile_id, device_id, day)
);
create index on public.feature_days (day);
alter table public.feature_days enable row level security;
-- No policy: written through save_feature_day(), read through admin_product() only.

create function public.save_feature_day(p_id uuid, p_dev text, p_day date, p_counts jsonb, p_platform text default '', p_form text default '', p_version text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  if not shares_product(p_id) then raise exception 'forbidden' using detail = 'consent'; end if;
  -- The family's devices and the child's tablets only: a professional's own way of working is
  -- not measured here, and the team's test accounts would only blur the figures.
  if is_pro(auth.uid()) or is_admin() then raise exception 'forbidden' using detail = 'role'; end if;
  if not exists (select 1 from devices where profile_id = p_id and id = p_dev and not revoked) then
    raise exception 'forbidden' using detail = 'device';
  end if;
  if p_day is null or p_day < current_date - 30 or p_day > current_date + 1 then raise exception 'invalid' using detail = 'day'; end if;
  if pg_column_size(p_counts) > 20000 then raise exception 'too_large'; end if;
  insert into feature_days (profile_id, device_id, day, counts, platform, form, app_version, updated_at)
  values (p_id, p_dev, p_day, clean_counts(p_counts),
          case when p_platform in ('ios', 'android', 'web') then p_platform else '?' end,
          case when p_form in ('phone', 'tablet', 'computer') then p_form else '?' end,
          case when p_version ~ '^[0-9A-Za-z.+-]{1,20}$' then p_version else '' end, now())
  on conflict (profile_id, device_id, day) do update
    set counts = excluded.counts, platform = excluded.platform, form = excluded.form, app_version = excluded.app_version, updated_at = now();
  -- Nothing is kept longer than needed to see whether a feature is still used.
  if random() < 0.02 then delete from feature_days where day < current_date - 180; end if;
end $$;

-- The family stops sharing: what was counted for the team is erased at once.
create function public.forget_product() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from feature_days where profile_id = new.id;
  return null;
end $$;
create trigger forget_product after update of data on public.profiles for each row
  when (old.data -> 'settings' ->> 'shareStats' = 'anonymous' and new.data -> 'settings' ->> 'shareStats' is distinct from 'anonymous')
  execute function public.forget_product();

-- ───────────────────────── 3. Technical problems ─────────────────────────

-- One line per kind of problem and per day: how many times. No child, no account, no device.
create table public.error_counts (
  day date not null,
  kind text not null,
  name text not null default '',
  at text not null default '',
  screen text not null default 'other',
  platform text not null default '?',
  form text not null default '?',
  app_version text not null default '',
  n int not null default 0,
  primary key (day, kind, name, at, screen, platform, form, app_version)
);
alter table public.error_counts enable row level security;
-- No policy: written through report_problems(), read through admin_bugs() only.

-- Every field is one of a few known values, or a place in the code ("line:column"): an error's
-- own message is never sent, because it can quote what somebody typed.
create function public.report_problems(p_id uuid, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  it jsonb;
  k text;
begin
  if not can_read(p_id) or not shares_product(p_id) then raise exception 'forbidden'; end if;
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
            case when it ->> 'version' ~ '^[0-9A-Za-z.+-]{1,20}$' then it ->> 'version' else '' end,
            greatest(1, least(50, public.num(it -> 'n', 50)))::int)
    on conflict (day, kind, name, at, screen, platform, form, app_version)
      do update set n = least(1000000, error_counts.n + excluded.n);
  end loop;
  if random() < 0.05 then delete from error_counts where day < current_date - 180; end if;
end $$;

-- ───────────────────────── 4. Requests ("Help us improve") ─────────────────────────

-- The message says what it is about (before: idea / problem / other).
alter table public.feedback drop constraint feedback_kind_check;
update public.feedback set kind = 'feature' where kind = 'idea';
alter table public.feedback add constraint feedback_kind_check
  check (kind in ('feature', 'vocabulary', 'pictogram', 'language', 'access', 'problem', 'other'));

create or replace function public.send_feedback(p_kind text, p_text text, p_platform text default '', p_version text default '') returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if (select count(*) from feedback where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'too_many';
  end if;
  insert into feedback (user_id, kind, text, platform, app_version)
  values (auth.uid(),
          -- an app that was not updated yet still says "idea"
          case when p_kind = 'idea' then 'feature' else p_kind end,
          trim(p_text), left(coalesce(p_platform, ''), 40), left(coalesce(p_version, ''), 20));
end $$;

-- Ideas the team puts to the vote. A title in the three languages, written by the team.
create table public.roadmap (
  id uuid primary key default gen_random_uuid(),
  title jsonb not null,
  status text not null default 'open' check (status in ('open', 'planned', 'done', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.roadmap enable row level security;

create table public.roadmap_votes (
  item_id uuid not null references public.roadmap (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- parent or professional, as it was when the vote was given: "what do the families ask, what do the professionals ask"
  role text not null default '',
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
alter table public.roadmap_votes enable row level security;
-- No policy on either: roadmap_list(), roadmap_vote() and the admin_ functions only.

create function public.roadmap_list()
returns table (id uuid, title jsonb, status text, votes int, mine boolean)
language sql stable security definer set search_path = public as $$
  select r.id, r.title, r.status,
         (select count(*)::int from roadmap_votes v where v.item_id = r.id),
         exists (select 1 from roadmap_votes v where v.item_id = r.id and v.user_id = auth.uid())
    from roadmap r
   where r.status in ('open', 'planned') and auth.uid() is not null
   order by r.created_at
$$;

-- One vote per account and per idea; a child's tablet does not vote.
create function public.roadmap_vote(p_item uuid, p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or is_tablet() then raise exception 'forbidden'; end if;
  if not exists (select 1 from roadmap where id = p_item and status in ('open', 'planned')) then raise exception 'not_found'; end if;
  perform rate_limit('vote', 100, interval '1 day');
  if p_on then
    insert into roadmap_votes (item_id, user_id, role)
    values (p_item, auth.uid(), coalesce((select role from accounts where id = auth.uid()), ''))
    on conflict do nothing;
  else
    delete from roadmap_votes where item_id = p_item and user_id = auth.uid();
  end if;
end $$;

create function public.admin_roadmap()
returns table (id uuid, title jsonb, status text, votes int, parents int, pros int, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  return query
  select r.id, r.title, r.status,
         (select count(*)::int from roadmap_votes v where v.item_id = r.id),
         (select count(*)::int from roadmap_votes v where v.item_id = r.id and v.role = 'parent'),
         (select count(*)::int from roadmap_votes v where v.item_id = r.id and v.role = 'pro'),
         r.created_at
    from roadmap r
   order by (r.status = 'hidden'), (select count(*) from roadmap_votes v where v.item_id = r.id) desc, r.created_at;
end $$;

-- Adds an idea (p_id null) or changes its title or status.
create function public.admin_roadmap_save(p_id uuid, p_title jsonb, p_status text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  t jsonb;
  id_ uuid;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  t := jsonb_build_object('fr', left(trim(coalesce(p_title ->> 'fr', '')), 120),
                          'en', left(trim(coalesce(p_title ->> 'en', '')), 120),
                          'ar', left(trim(coalesce(p_title ->> 'ar', '')), 120));
  if t ->> 'fr' = '' and t ->> 'en' = '' and t ->> 'ar' = '' then raise exception 'invalid' using detail = 'title'; end if;
  if p_status not in ('open', 'planned', 'done', 'hidden') then raise exception 'invalid' using detail = 'status'; end if;
  if p_id is null then
    insert into roadmap (title, status) values (t, p_status) returning id into id_;
  else
    update roadmap set title = t, status = p_status where id = p_id returning id into id_;
    if id_ is null then raise exception 'not_found'; end if;
  end if;
  perform admin_note('roadmap', id_, left(coalesce(nullif(t ->> 'en', ''), nullif(t ->> 'fr', ''), t ->> 'ar'), 60), p_status);
  return id_;
end $$;

-- ───────────────────────── 5. What the back office reads ─────────────────────────

-- Feature adoption and task figures. Sums only, and only from 5 children of 5 families.
-- A feature is: used regularly (4 days or more in the last 30), now and then (1 to 3 days),
-- given up (used in the last 90 days, not in the last 30), or never used.
-- A group of 1 to 4 children is never given as a number: the answer then only says which side
-- is the small one ("few"), or nothing at all ("hidden").
create function public.admin_product() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  agreed int;
  children int;
  families int;
  children30 int;
  families30 int;
  o jsonb;
  part jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select count(*) into agreed from profiles p where shares_product(p.id);
  select count(distinct f.profile_id), count(distinct p.owner_id) into children, families
    from feature_days f join profiles p on p.id = f.profile_id
   where f.day > current_date - 90 and shares_product(p.id);
  o := jsonb_build_object('agreed', agreed, 'children', children, 'minimum', min_group,
                          'enough', children >= min_group and families >= min_group, 'days', 90);
  if children < min_group or families < min_group then return o || jsonb_build_object('at', now()); end if;

  with base as (
    select f.profile_id, f.day, f.counts
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 90 and shares_product(p.id)),
  keys as (
    select k, ord from unnest(array['board', 'tla', 'schedule', 'firstThen', 'timer', 'search', 'keyboard', 'model', 'edit', 'photo',
                                    'recording', 'print', 'followUp', 'ai', 'guide', 'lock']) with ordinality as t(k, ord)),
  per as (
    select k.k, k.ord, b.profile_id,
           count(distinct b.day) filter (where b.day > current_date - 30 and public.num(b.counts -> k.k) > 0) as d30,
           bool_or(public.num(b.counts -> k.k) > 0) as any90
      from keys k cross join base b
     group by k.k, k.ord, b.profile_id),
  seg as (
    select k, ord,
           count(*) filter (where d30 >= 4) as regular,
           count(*) filter (where d30 between 1 and 3) as occasional,
           count(*) filter (where d30 = 0 and any90) as abandoned,
           count(*) filter (where not any90) as never
      from per group by k, ord)
  select jsonb_agg(
           case
             when least(nullif(regular, 0), nullif(occasional, 0), nullif(abandoned, 0), nullif(never, 0)) >= min_group
               then jsonb_build_object('key', k, 'regular', regular, 'occasional', occasional, 'abandoned', abandoned, 'never', never)
             when (regular + occasional = 0 or regular + occasional >= min_group) and (abandoned + never = 0 or abandoned + never >= min_group)
               then jsonb_build_object('key', k, 'using', regular + occasional, 'notUsing', abandoned + never)
             when regular + occasional >= min_group then jsonb_build_object('key', k, 'few', 'notUsing')
             when abandoned + never >= min_group then jsonb_build_object('key', k, 'few', 'using')
             else jsonb_build_object('key', k, 'hidden', true)
           end order by ord)
    into part from seg;
  o := o || jsonb_build_object('features', coalesce(part, '[]'::jsonb));

  -- What happened inside the tasks, last 30 days: a sum is given only when 5 children of 5
  -- families took part in it.
  select count(distinct f.profile_id), count(distinct p.owner_id) into children30, families30
    from feature_days f join profiles p on p.id = f.profile_id
   where f.day > current_date - 30 and shares_product(p.id);
  select coalesce(jsonb_object_agg(key, total), '{}'::jsonb) into part from (
    select e.key, sum(public.num(e.value, 86400000)) as total
      from feature_days f join profiles p on p.id = f.profile_id, jsonb_each(f.counts) e
     where f.day > current_date - 30 and shares_product(p.id) and e.key = any (product_keys()) and public.num(e.value, 86400000) > 0
     group by e.key
    having count(distinct f.profile_id) >= min_group and count(distinct p.owner_id) >= min_group) t;
  o := o || jsonb_build_object('children30', children30, 'tasks', case when children30 >= min_group and families30 >= min_group then part else '{}'::jsonb end);

  -- The same features by kind of device (a kind used by fewer than 5 children is left out).
  select coalesce(jsonb_object_agg(form, n), '{}'::jsonb) into part from (
    select f.form, count(distinct f.profile_id) as n
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 30 and shares_product(p.id)
     group by f.form
    having count(distinct f.profile_id) >= min_group and count(distinct p.owner_id) >= min_group) t;
  return o || jsonb_build_object('forms', part, 'at', now());
end $$;

-- Technical problems of the last 30 days (counters that belong to nobody).
create function public.admin_bugs() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  o jsonb;
begin
  if not is_admin() then raise exception 'forbidden'; end if;
  select jsonb_build_object(
    'days', 30,
    'total', coalesce(sum(n), 0),
    'kinds', (select coalesce(jsonb_object_agg(k, s), '{}') from (select kind k, sum(n) s from error_counts where day > current_date - 30 group by 1) t),
    'versions', (select coalesce(jsonb_object_agg(k, s), '{}') from (
                   select coalesce(nullif(app_version, ''), '?') k, sum(n) s from error_counts where day > current_date - 30 group by 1) t),
    'platforms', (select coalesce(jsonb_object_agg(k, s), '{}') from (select platform k, sum(n) s from error_counts where day > current_date - 30 group by 1) t),
    'screens', (select coalesce(jsonb_object_agg(k, s), '{}') from (select screen k, sum(n) s from error_counts where day > current_date - 30 group by 1) t),
    'daily', (select jsonb_agg(jsonb_build_object('day', d::date, 'n', coalesce((select sum(e.n) from error_counts e where e.day = d::date), 0)) order by d)
                from generate_series(current_date - 29, current_date, interval '1 day') d),
    'top', (select coalesce(jsonb_agg(x), '[]') from (
              select jsonb_build_object('kind', kind, 'name', name, 'at', at, 'screen', screen, 'version', app_version, 'platform', platform,
                                        'n', sum(n), 'last', max(day)) x
                from error_counts where day > current_date - 30
               group by kind, name, at, screen, app_version, platform
               order by sum(n) desc, max(day) desc limit 40) t))
    into o from error_counts where day > current_date - 30;
  return o || jsonb_build_object('at', now());
end $$;

-- Tools of the functions above, not of the app.
revoke execute on function public.shares_product(uuid) from public, anon, authenticated;
revoke execute on function public.guard_share_terms() from public, anon, authenticated;
revoke execute on function public.new_profile_terms() from public, anon, authenticated;
revoke execute on function public.product_keys() from public, anon, authenticated;
revoke execute on function public.clean_counts(jsonb) from public, anon, authenticated;
revoke execute on function public.forget_product() from public, anon, authenticated;
-- For signed-in people only (each admin_ function then checks is_admin()).
revoke execute on function public.save_feature_day(uuid, text, date, jsonb, text, text, text) from public, anon;
revoke execute on function public.report_problems(uuid, jsonb) from public, anon;
revoke execute on function public.roadmap_list() from public, anon;
revoke execute on function public.roadmap_vote(uuid, boolean) from public, anon;
revoke execute on function public.admin_roadmap() from public, anon;
revoke execute on function public.admin_roadmap_save(uuid, jsonb, text) from public, anon;
revoke execute on function public.admin_product() from public, anon;
revoke execute on function public.admin_bugs() from public, anon;
