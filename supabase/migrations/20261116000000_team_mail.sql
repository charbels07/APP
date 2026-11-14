-- E-mails to the app's team (November 2026)
--
-- The database writes two kinds of e-mail, and the small server function "caa-mail" sends them:
--   1. a professional sent their documents for verification;
--   2. every Monday morning, the figures of the week.
--
-- How it works:
--   · the database writes the message (subject + plain text) in the table team_mail;
--   · it then wakes the server function up (pg_net). The function asks the database for the
--     waiting messages, sends them through the mailbox that already sends the sign-in codes,
--     and tells the database which ones left;
--   · the function is only a postman: it cannot write a message, nor choose what is in it.
--
-- Rules:
--   · nobody reaches these tables or functions from the app, even signed in;
--   · the messages hold counts only: no name, no word, no sentence, no document. What comes
--     from the use of the boards only covers the families who share anonymous statistics, and
--     only from 5 children up (the same rule as the back office);
--   · a professional who sends a request again and again makes one e-mail a day at most;
--   · a failure here never blocks what the person was doing (the request is still sent).
--
-- To turn it on, once the function is deployed (supabase/README.md, section 10):
--   select public.team_mail_connect('https://YOUR-PROJECT.supabase.co');
--   select public.team_mail_test();
--   select * from public.team_mail_check();

-- ───────────────────────── What the server needs ─────────────────────────

-- pg_net lets the database call the server function; pg_cron runs the weekly job.
-- (On a plain PostgreSQL, as in `npm run test:db`, they are missing: the messages then simply wait.)
do $$ begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'pg_net is not available here: the e-mails will wait in team_mail';
end $$;
do $$ begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron is not available here: no weekly job';
end $$;

-- ───────────────────────── The messages ─────────────────────────

create table public.team_mail (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('application', 'weekly', 'test')),
  -- The account the message is about. Never written in the message: only used to send one a day at most.
  about uuid references auth.users (id) on delete set null,
  subject text not null check (char_length(subject) between 1 and 200),
  body text not null check (char_length(body) between 1 and 20000),
  created_at timestamptz not null default now(),
  tries int not null default 0,
  last_try_at timestamptz,
  sent_at timestamptz,
  last_error text
);
create index team_mail_waiting on public.team_mail (created_at) where sent_at is null;
alter table public.team_mail enable row level security;
-- No policy: the app never reads or writes this table.
revoke all on public.team_mail from public, anon, authenticated;

-- Where the server function is, and the key the database shows it. One line, written by
-- team_mail_connect(). The key is made by the database and never leaves the server.
create table public.team_mail_config (
  one boolean primary key default true check (one),
  function_url text not null,
  key text not null,
  connected_at timestamptz not null default now()
);
alter table public.team_mail_config enable row level security;
revoke all on public.team_mail_config from public, anon, authenticated;

-- ───────────────────────── Waking the server function ─────────────────────────

-- Without a connection (or without pg_net) the messages wait; nothing fails.
create function public.team_mail_poke() returns void
language plpgsql security definer set search_path = public as $$
declare
  cfg team_mail_config;
begin
  select * into cfg from team_mail_config;
  if not found then return; end if;
  perform net.http_post(
    url := cfg.function_url,
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-mail-key', cfg.key),
    timeout_milliseconds := 60000);
exception when others then
  null; -- a message that cannot leave now leaves at the next try
end $$;

create function public.team_mail_added() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform team_mail_poke();
  return null;
end $$;
create trigger team_mail_added after insert on public.team_mail
for each statement execute function public.team_mail_added();

-- Run once by the owner of the project, in the SQL Editor, with the project's own address.
create function public.team_mail_connect(p_project_url text) returns text
language plpgsql security definer set search_path = public as $$
declare
  base text := rtrim(btrim(coalesce(p_project_url, '')), '/');
begin
  -- Only the project's own address: the key must never be shown to another site.
  if base !~ '^https://[a-z0-9]{8,40}\.supabase\.co$' then
    raise exception 'invalid' using detail = 'The address looks like https://abcdefgh.supabase.co (Project Settings → API).';
  end if;
  insert into team_mail_config (one, function_url, key)
    values (true, base || '/functions/v1/caa-mail', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
    on conflict (one) do update set function_url = excluded.function_url, key = excluded.key, connected_at = now();
  return 'Connected. Now run: select public.team_mail_test();';
end $$;

-- ───────────────────────── What the server function may do ─────────────────────────

-- The waiting messages, 10 at most, each one tried 5 times at most. The key is checked here:
-- the function only passes on what it received.
create function public.team_mail_take(p_key text) returns table (id uuid, subject text, body text)
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  return query
    update team_mail m set tries = m.tries + 1, last_try_at = now()
     where m.id in (select w.id from team_mail w
                     where w.sent_at is null and w.tries < 5
                       and (w.last_try_at is null or w.last_try_at < now() - interval '2 minutes')
                     order by w.created_at limit 10 for update skip locked)
    returning m.id, m.subject, m.body;
end $$;

create function public.team_mail_done(p_key text, p_id uuid, p_error text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or not exists (select 1 from team_mail_config c where c.key = p_key) then
    raise exception 'forbidden';
  end if;
  update team_mail set sent_at = case when p_error is null then now() else sent_at end,
                       last_error = left(p_error, 300)
   where id = p_id and sent_at is null;
end $$;

-- ───────────────────────── 1. A professional applied ─────────────────────────

-- Words for a message: one line, nothing but plain characters.
create function public.mail_plain(p text, p_max int) returns text
language sql immutable as $$
  select left(btrim(regexp_replace(coalesce(p, ''), '[[:cntrl:]]+', ' ', 'g')), p_max)
$$;

create function public.team_mail_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  waiting int;
  job text;
begin
  if tg_op = 'UPDATE' and old.status = 'pending' then return null; end if;
  -- One e-mail a day for the same person, 30 a day in all: the rest is seen in the back office.
  if exists (select 1 from team_mail where kind = 'application' and about = new.user_id and created_at > now() - interval '1 day')
     or (select count(*) from team_mail where kind = 'application' and created_at > now() - interval '1 day') >= 30 then
    return null;
  end if;
  select count(*) into waiting from verifications where status = 'pending';
  job := case new.profession
    when 'slp' then 'Speech-language therapist'
    when 'ot' then 'Occupational therapist'
    when 'psychomotor' then 'Psychomotor therapist'
    when 'psychologist' then 'Psychologist'
    when 'teacher' then 'Special education teacher'
    when 'educator' then 'Special educator'
    when 'behaviour' then 'Behaviour analyst'
    when 'other' then 'Other'
    else mail_plain(new.profession, 80) end;
  insert into team_mail (kind, about, subject, body) values ('application', new.user_id,
    'Empower Communication: a professional is waiting for verification',
    concat_ws(E'\n',
      'A professional sent their documents for verification.',
      '',
      '- Profession: ' || job,
      '- Country: ' || mail_plain(new.country, 80),
      '- Requests waiting for a decision: ' || waiting,
      '',
      'To review it: sign in to the app with your team account. It opens on the back office (Verifications).',
      '',
      'Sent automatically by the app''s server. This message holds no name and no document.'));
  return null;
exception when others then
  return null; -- the request itself is never blocked by the e-mail
end $$;
create trigger team_mail_application after insert or update of status on public.verifications
for each row when (new.status = 'pending') execute function public.team_mail_application();

-- ───────────────────────── 2. The figures of the week ─────────────────────────

-- The 7 full days before today. Counts only. The "usage" part only covers the families who
-- share anonymous statistics (bo_child_days already keeps only them), and is left out under
-- 5 children.
create function public.team_week_figures() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  min_group constant int := 5;
  d0 date := current_date - 7;
  d1 date := current_date;
  o jsonb;
  kids int;
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
        'used7', (select count(distinct profile_id) from devices where not revoked and last_seen_at >= d0)),
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

  select count(distinct child) into kids from bo_child_days where day >= d0 and day < d1;
  usage := jsonb_build_object('children', kids, 'minimum', min_group, 'enough', kids >= min_group);
  if kids >= min_group then
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

-- The same figures as sentences (the text of the e-mail).
create function public.team_week_text(f jsonb) returns text
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
    '- Boards used this week: ' || (f #>> '{boards,used7}'),
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
    else '- Not shown this week: ' || (f #>> '{usage,children}') || ' children of these families used their board. Figures appear from '
        || (f #>> '{usage,minimum}') || ' children, so that nobody can be recognised.' end,
    '',
    'Counts only: no name, no word, no sentence. Charts and details: the back office, in the app.',
    'Sent automatically by the app''s server every Monday.')
$$;

-- Written by the weekly job (once a week at most, even if the job runs twice).
create function public.team_mail_weekly() returns void
language plpgsql security definer set search_path = public as $$
declare
  f jsonb;
begin
  if exists (select 1 from team_mail where kind = 'weekly' and created_at > now() - interval '6 days') then return; end if;
  f := team_week_figures();
  insert into team_mail (kind, subject, body) values ('weekly',
    'Empower Communication: figures of the week (' || to_char((f ->> 'from')::date, 'FMDD Mon') || ' - ' || to_char((f ->> 'to')::date, 'FMDD Mon') || ')',
    team_week_text(f));
end $$;

-- ───────────────────────── Tools for the owner of the project (SQL Editor) ─────────────────────────

-- A first e-mail, to see that everything is in place.
create function public.team_mail_test() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from team_mail_config) then
    return 'Not connected yet. First run: select public.team_mail_connect(''https://YOUR-PROJECT.supabase.co'');';
  end if;
  insert into team_mail (kind, subject, body) values ('test', 'Empower Communication: the team e-mails work',
    concat_ws(E'\n', 'This is a test.', '',
      'From now on this mailbox receives:',
      '- a message when a professional sends their documents for verification;',
      '- the figures of the week, every Monday morning.'));
  return 'A test e-mail was written. It should arrive within a minute. If not: select * from public.team_mail_check();';
end $$;

-- Where things stand, in plain lines.
create function public.team_mail_check() returns table (what text, answer text)
language plpgsql security definer set search_path = public as $$
begin
  return query select 'Connected to the server function'::text,
    coalesce((select 'yes, since ' || to_char(connected_at, 'YYYY-MM-DD HH24:MI') from team_mail_config), 'no: run team_mail_connect(...)');
  return query select 'pg_net (calls the function)'::text,
    case when exists (select 1 from pg_extension where extname = 'pg_net') then 'installed' else 'missing' end;
  return query select 'pg_cron (weekly job)'::text,
    case when exists (select 1 from pg_extension where extname = 'pg_cron') then 'installed' else 'missing' end;
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    begin
      return query execute
        'select ''Weekly job planned''::text, case when count(*) > 0 then ''yes'' else ''no: run select public.team_mail_plan();'' end
           from cron.job where jobname = ''team-mail-weekly'' ';
    exception when others then
      return query select 'Weekly job planned'::text, 'not readable'::text;
    end;
  end if;
  return query select 'Messages sent'::text, (select count(*)::text from team_mail where sent_at is not null);
  return query select 'Last one sent'::text, coalesce((select to_char(max(sent_at), 'YYYY-MM-DD HH24:MI') from team_mail), 'none yet');
  return query select 'Messages waiting'::text, (select count(*)::text from team_mail where sent_at is null and tries < 5);
  return query select 'Messages given up (5 tries)'::text, (select count(*)::text from team_mail where sent_at is null and tries >= 5);
  return query select 'Last error from the mailbox'::text,
    coalesce((select last_error from team_mail where last_error is not null order by last_try_at desc nulls last limit 1), 'none');
  -- What the server function answered to the last calls (200 = fine, 401 = "Verify JWT" still on
  -- or wrong key, 404 = function not deployed, 503 = a secret is missing).
  if exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      return query execute
        'select ''Last answers of the function''::text, coalesce(string_agg(coalesce(status_code::text, ''no answer''), '', '' order by id desc), ''none yet'')
           from (select id, status_code from net._http_response order by id desc limit 5) r';
    exception when others then
      return query select 'Last answers of the function'::text, 'not readable'::text;
    end;
  end if;
end $$;

-- Tidying: messages older than 90 days go away (sent or given up).
create function public.team_mail_tidy() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from team_mail where created_at < now() - interval '90 days';
  -- The jobs keep a line for each run: two weeks of them are enough.
  begin
    execute 'delete from cron.job_run_details where end_time < now() - interval ''14 days''';
  exception when others then
    null;
  end;
end $$;

-- Nothing here can be called from the app. The server function (service role) takes and marks
-- the messages; everything else is for the owner of the project and the jobs.
revoke execute on function public.team_mail_poke() from public, anon, authenticated;
revoke execute on function public.team_mail_added() from public, anon, authenticated;
revoke execute on function public.team_mail_connect(text) from public, anon, authenticated, service_role;
revoke execute on function public.team_mail_take(text) from public, anon, authenticated;
revoke execute on function public.team_mail_done(text, uuid, text) from public, anon, authenticated;
revoke execute on function public.mail_plain(text, int) from public, anon, authenticated;
revoke execute on function public.team_mail_application() from public, anon, authenticated;
revoke execute on function public.team_week_figures() from public, anon, authenticated, service_role;
revoke execute on function public.team_week_text(jsonb) from public, anon, authenticated, service_role;
revoke execute on function public.team_mail_weekly() from public, anon, authenticated, service_role;
revoke execute on function public.team_mail_test() from public, anon, authenticated, service_role;
revoke execute on function public.team_mail_check() from public, anon, authenticated, service_role;
revoke execute on function public.team_mail_tidy() from public, anon, authenticated, service_role;
grant execute on function public.team_mail_take(text) to service_role;
grant execute on function public.team_mail_done(text, uuid, text) to service_role;

-- ───────────────────────── The jobs ─────────────────────────

-- Monday 06:00 UTC: the figures of the week. Every hour: a new try for what could not leave.
-- Sunday night: tidying (old messages, and the jobs' own log).
-- Can be run again at any time (for example after turning pg_cron on): select public.team_mail_plan();
create function public.team_mail_plan() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    return 'pg_cron is not turned on (Database → Extensions): no weekly e-mail yet. Turn it on, then run this line again.';
  end if;
  perform cron.schedule('team-mail-weekly', '0 6 * * 1', 'select public.team_mail_weekly()');
  perform cron.schedule('team-mail-retry', '17 * * * *',
    'select public.team_mail_poke() where exists (select 1 from public.team_mail where sent_at is null and tries < 5)');
  perform cron.schedule('team-mail-tidy', '30 3 * * 0', 'select public.team_mail_tidy()');
  return 'Planned: the figures every Monday at 06:00 UTC, a new try every hour, tidying on Sundays.';
exception when others then
  return 'The jobs could not be planned: ' || sqlerrm;
end $$;
revoke execute on function public.team_mail_plan() from public, anon, authenticated, service_role;

select public.team_mail_plan();
