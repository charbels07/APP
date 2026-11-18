-- More product figures for the app's team, in the same fixed lists of names and numbers:
--
--  1. "Seen" (assessment 18.6): for each feature, whether its button, panel or tip was on screen
--     that day (0 or 1), next to "used". The back office can then tell "never found it" from
--     "found it and chose not to use it".
--  2. The app's version (18.13): kept with each child's day, digits and dots only, so that the
--     team can compare the use of the features before and after an update.
--  3. Speed (18.10): how long the app made people wait (opening up to the first board, a save or
--     a look for changes, the voice after a touch), counted in five fixed steps, never the time.
--
-- What is shared grows, so the families are asked again: the agreement now has to be to the
-- list number 3. A family that agreed to the shorter list (2) sends nothing more, counters or
-- problems, until it agrees again (the app asks it: "What is shared has changed").
-- The back office still reads sums only, from 5 children of 5 families; a group of 1 to 4 is
-- "few" or hidden, never a number. Nothing here is reachable without is_admin(), except what a
-- family's own device sends about its own child.

-- ───────────────────────── 1. The agreement: list number 3 ─────────────────────────

-- The list the family must have agreed to (the app's SHARE_TERMS is the same number).
create function public.product_terms() returns int
language sql immutable as $$
  select 3
$$;

create or replace function public.shares_product(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select p.data -> 'settings' ->> 'shareStats' = 'anonymous'
                          and public.num(p.data -> 'settings' -> 'shareTerms', 100) >= public.product_terms()
                     from profiles p where p.id = p_profile), false)
$$;

-- ───────────────────────── 2. The fixed lists (the app's are the same: src/lib/product.ts) ─────────────────────────

-- One per feature: "used that day" (and its "seen:" twin).
create function public.product_features() returns text[]
language sql immutable as $$
  select array['board', 'tla', 'schedule', 'firstThen', 'timer', 'search', 'keyboard', 'model', 'edit', 'photo', 'recording',
               'print', 'followUp', 'ai', 'guide', 'lock']
$$;

-- What made people wait, and the steps a waiting time is counted in (under 0.5 s, 0.5 to 1 s,
-- 1 to 2 s, 2 to 5 s, more than 5 s).
create function public.product_speeds() returns text[]
language sql immutable as $$
  select array['start', 'sync', 'voice']
$$;
create function public.product_speed_buckets() returns text[]
language sql immutable as $$
  select array['0.5', '1', '2', '5', 'more']
$$;

-- The only names a counter can have.
create or replace function public.product_keys() returns text[]
language sql immutable as $$
  select array[
    -- one per feature: "used that day"
    'board', 'tla', 'schedule', 'firstThen', 'timer', 'search', 'keyboard', 'model', 'edit', 'photo', 'recording',
    'print', 'followUp', 'ai', 'guide', 'lock',
    -- what happened inside a task
    'searchNone', 'searchPick', 'tlaStart', 'tlaDone', 'tlaMs', 'tlaAi', 'tlaPhoto', 'tlaKept', 'tlaChanged',
    'seqStart', 'seqDone', 'pictoSwap', 'printTla', 'printSchedule',
    -- one per feature: "its button, panel or tip was on screen that day" (0 or 1)
    'seen:board', 'seen:tla', 'seen:schedule', 'seen:firstThen', 'seen:timer', 'seen:search', 'seen:keyboard', 'seen:model',
    'seen:edit', 'seen:photo', 'seen:recording', 'seen:print', 'seen:followUp', 'seen:ai', 'seen:guide', 'seen:lock',
    -- how many times the wait fell in each step
    'start:0.5', 'start:1', 'start:2', 'start:5', 'start:more',
    'sync:0.5', 'sync:1', 'sync:2', 'sync:5', 'sync:more',
    'voice:0.5', 'voice:1', 'voice:2', 'voice:5', 'voice:more']
$$;

-- Keeps the known names with a whole number; anything else (text, lists, other names) is dropped.
-- "Seen" is a yes or no for the day: 1 at most.
create or replace function public.clean_counts(d jsonb) returns jsonb
language sql immutable as $$
  select coalesce(jsonb_object_agg(e.key, floor(public.num(e.value, case when e.key like 'seen:%' then 1
                                                                         when e.key like '%Ms' then 86400000
                                                                         else 100000 end))), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(d) = 'object' then d else '{}'::jsonb end) e
   where e.key = any (public.product_keys()) and jsonb_typeof(e.value) = 'number'
$$;

-- The app's version as it may be kept: digits and dots only ("1.4.0"), 19 characters at most.
-- Anything else (a word, a sentence, "1.4.0-beta") becomes '': no text can travel in it.
create function public.clean_version(v text) returns text
language sql immutable as $$
  select case when v ~ '^[0-9]{1,4}(\.[0-9]{1,4}){0,3}$' then v else '' end
$$;

-- A group shown as a number: nobody (0), or 5 children of 5 families at least.
create function public.product_shown(n bigint, families bigint) returns boolean
language sql immutable as $$
  select n = 0 or (n >= 5 and families >= 5)
$$;

-- Versions kept before this rule: only digits and dots stay.
update public.feature_days set app_version = public.clean_version(app_version) where app_version <> public.clean_version(app_version);

-- ───────────────────────── 3. What a family's device sends ─────────────────────────

create or replace function public.save_feature_day(p_id uuid, p_dev text, p_day date, p_counts jsonb, p_platform text default '', p_form text default '', p_version text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  -- Agreed to today's list (3): a family that agreed to a shorter one sends nothing more.
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
          clean_version(p_version), now())
  on conflict (profile_id, device_id, day) do update
    set counts = excluded.counts, platform = excluded.platform, form = excluded.form, app_version = excluded.app_version, updated_at = now();
  -- Nothing is kept longer than needed to see whether a feature is still used.
  if random() < 0.02 then delete from feature_days where day < current_date - 180; end if;
end $$;

-- Technical problems: the same as before, with the same rule for the version.
create or replace function public.report_problems(p_id uuid, p_items jsonb) returns void
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
            clean_version(it ->> 'version'),
            greatest(1, least(50, public.num(it -> 'n', 50)))::int)
    on conflict (day, kind, name, at, screen, platform, form, app_version)
      do update set n = least(1000000, error_counts.n + excluded.n);
  end loop;
  if random() < 0.05 then delete from error_counts where day < current_date - 180; end if;
end $$;

-- ───────────────────────── 4. What the back office reads ─────────────────────────

-- Feature adoption, seen / used, by version, task figures, waiting times. Sums only, and only
-- from 5 children of 5 families; a group of 1 to 4 is never a number ("few" or hidden).
create or replace function public.admin_product() returns jsonb
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

  -- Each feature: used regularly (4 days or more in the last 30), now and then (1 to 3 days),
  -- given up (used in the last 90 days, not in the last 30), or never used.
  with base as (
    select f.profile_id, f.day, f.counts
      from feature_days f join profiles p on p.id = f.profile_id
     where f.day > current_date - 90 and shares_product(p.id)),
  keys as (select k, ord from unnest(product_features()) with ordinality as t(k, ord)),
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
  o := o || jsonb_build_object('children30', children30, 'tasks', case when children30 >= min_group and families30 >= min_group then part else '{}'::jsonb end);

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

-- Tools of the functions above, not of the app.
revoke execute on function public.product_terms() from public, anon, authenticated;
revoke execute on function public.product_features() from public, anon, authenticated;
revoke execute on function public.product_speeds() from public, anon, authenticated;
revoke execute on function public.product_speed_buckets() from public, anon, authenticated;
revoke execute on function public.clean_version(text) from public, anon, authenticated;
revoke execute on function public.product_shown(bigint, bigint) from public, anon, authenticated;
