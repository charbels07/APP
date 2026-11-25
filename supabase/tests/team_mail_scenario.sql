-- E-mails to the app's team: who can touch them, what they say, and what they never say.
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set sarah '00000000-0000-0000-0000-0000000000c1'
\set marc  '00000000-0000-0000-0000-0000000000c2'
\set nour  '00000000-0000-0000-0000-0000000000c3'
\set rita  '00000000-0000-0000-0000-0000000000c4'

-- A stand-in for pg_net: what the database would call is written down instead.
create schema if not exists net;
create table net.calls (url text, headers jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
returns bigint language plpgsql security definer as $$
begin
  insert into net.calls values (url, headers);
  return 1;
end $$;

grant usage on schema test to anon, service_role;
grant execute on all functions in schema test to anon, service_role;
grant all on test.ids to service_role;
truncate test.ids;
delete from team_mail;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'nour', 'nour@centre.lb', now(), '{"role":"pro","display_name":"Nour"}'),
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}');

-- 1. A professional sends the request: one message is written for the team (name, profession, country).
set role authenticated;
select set_config('request.jwt.claim.sub', :'sarah', false);
insert into verifications (user_id, full_name, country, profession, documents)
  values (:'sarah', 'Sarah Khoury', 'France', 'slp', format('[{"name":"c.pdf","kind":"licence","ref":"%s/1-c.pdf"}]', :'sarah')::jsonb);
reset role;
select test.ok((select count(*) = 0 from team_mail), 'a request still being filled in makes no e-mail');
set role authenticated;
select submit_verification();
reset role;
select test.ok((select count(*) = 1 and bool_and(kind = 'application' and about = :'sarah' and sent_at is null) from team_mail),
  'a professional sends the request → one message for the team');
select test.ok((select body like '%Speech-language therapist%' and body like '%Country: France%' and body like '%waiting for a decision: 1%'
                   and body like '%- Name: Sarah Khoury%' and body not like '%clinic%' and body not like '%@%' and body not like '%.pdf%'
                   and subject not like '%Sarah%' and subject not like '%Khoury%' from team_mail),
  'the message gives the name, the profession and the country: never the address or a document, and no name in the subject');
select test.ok((select count(*) = 0 from net.calls), 'not connected yet: the message waits, nothing is called');

-- 2. From the app, signed in or not, nothing of this can be read, written, sent or redirected.
set role authenticated;
select test.expect_error('select * from team_mail', 'permission denied for table team_mail');
select test.expect_error('select * from team_mail_config', 'permission denied for table team_mail_config');
select test.expect_error('insert into team_mail (kind, subject, body) values (''test'', ''x'', ''y'')', 'permission denied for table team_mail');
select test.expect_error('update team_mail set body = ''x''', 'permission denied for table team_mail');
select test.expect_error('select team_mail_connect(''https://abcdefghijklmnopqrst.supabase.co'')', 'permission denied for function team_mail_connect');
select test.expect_error('select * from team_mail_take(''x'')', 'permission denied for function team_mail_take');
select test.expect_error('select team_mail_done(''x'', gen_random_uuid())', 'permission denied for function team_mail_done');
select test.expect_error('select team_mail_test()', 'permission denied for function team_mail_test');
select test.expect_error('select team_mail_weekly()', 'permission denied for function team_mail_weekly');
select test.expect_error('select team_week_figures()', 'permission denied for function team_week_figures');
select test.expect_error('select * from team_mail_check()', 'permission denied for function team_mail_check');
select test.expect_error('select team_mail_poke()', 'permission denied for function team_mail_poke');
select test.expect_error('select team_mail_tidy()', 'permission denied for function team_mail_tidy');
select test.expect_error('select team_mail_plan()', 'permission denied for function team_mail_plan');
reset role;
set role anon;
select test.expect_error('select * from team_mail', 'permission denied for table team_mail');
select test.expect_error('select * from team_mail_take(''x'')', 'permission denied for function team_mail_take');
select test.expect_error('select team_mail_test()', 'permission denied for function team_mail_test');
reset role;
select test.ok(true, 'from the app (signed in or not) the team''s messages cannot be read, written, sent or redirected');

-- 3. Connecting: only to the project's own function. The key is made by the database.
select test.ok((select team_mail_test() like 'Not connected yet%'), 'the test says what to do while nothing is connected');
select test.expect_error('select team_mail_connect(''https://evil.example.com'')', 'invalid');
select test.expect_error('select team_mail_connect(''https://abcdefghijklmnopqrst.supabase.co.evil.com'')', 'invalid');
select test.expect_error('select team_mail_connect(''http://abcdefghijklmnopqrst.supabase.co'')', 'invalid');
select test.expect_error('select team_mail_connect(''https://abcdefghijklmnopqrst.supabase.co/functions/v1/other'')', 'invalid');
select team_mail_connect('https://abcdefghijklmnopqrst.supabase.co/');
select test.ok((select function_url = 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/caa-mail' and key ~ '^[0-9a-f]{64}$' from team_mail_config),
  'the key can only be shown to the project''s own "caa-mail" function');
select team_mail_test();
select test.ok((select count(*) = 1 and bool_and(url = 'https://abcdefghijklmnopqrst.supabase.co/functions/v1/caa-mail'
                                                  and headers ->> 'x-mail-key' = (select key from team_mail_config)) from net.calls),
  'a new message wakes the server function up, with the key');

-- 4. The server function: the right key gets the waiting messages, once; a wrong key gets nothing.
insert into test.ids select 'key', key from team_mail_config;
set role service_role;
select test.expect_error('select * from team_mail_take(''0000'')', 'forbidden');
select test.expect_error('select * from team_mail_take(null)', 'forbidden');
select test.expect_error('select team_mail_done(''0000'', gen_random_uuid())', 'forbidden');
select test.expect_error('select team_mail_connect(''https://abcdefghijklmnopqrst.supabase.co'')', 'permission denied for function team_mail_connect');
select test.expect_error('select team_week_figures()', 'permission denied for function team_week_figures');
select test.ok((select count(*) = 2 from team_mail_take((select v from test.ids where k = 'key'))), 'with the key, the function receives the waiting messages');
select test.ok((select count(*) = 0 from team_mail_take((select v from test.ids where k = 'key'))), 'a message being sent is not handed out a second time');
select team_mail_done((select v from test.ids where k = 'key'), (select id from team_mail where kind = 'test'));
select team_mail_done((select v from test.ids where k = 'key'), (select id from team_mail where kind = 'application'), 'the mailbox refused');
reset role;
select test.ok((select sent_at is not null and tries = 1 from team_mail where kind = 'test')
           and (select sent_at is null and last_error = 'the mailbox refused' from team_mail where kind = 'application'),
  'sent is sent; a failure is written down');
update team_mail set last_try_at = now() - interval '3 minutes', tries = 4 where kind = 'application';
set role service_role;
select test.ok((select count(*) = 1 from team_mail_take((select v from test.ids where k = 'key'))), 'a message that failed is tried again later');
reset role;
update team_mail set last_try_at = now() - interval '3 minutes' where kind = 'application';
set role service_role;
select test.ok((select count(*) = 0 from team_mail_take((select v from test.ids where k = 'key'))), 'after 5 tries a message is given up');
reset role;

-- 5. Sending the request again and again does not fill the team's mailbox.
update verifications set status = 'more_info' where user_id = :'sarah';
set role authenticated;
select set_config('request.jwt.claim.sub', :'sarah', false);
select submit_verification();
reset role;
select test.ok((select count(*) = 1 from team_mail where kind = 'application'), 'the same person sending again the same day makes no second e-mail');
set role authenticated;
select set_config('request.jwt.claim.sub', :'marc', false);
insert into verifications (user_id, full_name, country, profession, documents)
  values (:'marc', E'Marc\nTannous', E'Liban\nBcc: x@y.z', 'teacher', format('[{"name":"c.pdf","kind":"licence","ref":"%s/1-c.pdf"}]', :'marc')::jsonb);
select submit_verification();
reset role;
select test.ok((select count(*) = 2 from team_mail where kind = 'application')
           and (select body like '%Special education teacher%' and body like '%Country: Liban Bcc: x@y.z%' and body like '%decision: 2%'
                       and body like '%- Name: Marc Tannous%' from team_mail where about = :'marc'),
  'another professional → another message; a line break typed in a field stays inside its line');

-- 6. A mailbox that breaks never blocks the professional.
alter table team_mail add constraint broken check (kind <> 'application') not valid;
set role authenticated;
select set_config('request.jwt.claim.sub', :'nour', false);
insert into verifications (user_id, full_name, country, profession, documents)
  values (:'nour', 'Nour H', 'Liban', 'ot', format('[{"name":"c.pdf","kind":"licence","ref":"%s/1-c.pdf"}]', :'nour')::jsonb);
select submit_verification();
reset role;
alter table team_mail drop constraint broken;
select test.ok((select status = 'pending' from verifications where user_id = :'nour') and (select count(*) = 2 from team_mail where kind = 'application'),
  'if the e-mail cannot be written, the professional''s request is sent all the same');

-- 7. The figures of the week: counts only; the use of the boards only from 5 children of 5
--    families who share anonymous statistics.
update accounts set created_at = now() - interval '2 days' where id in (:'rita', :'marc');
-- Five families: Rita (two children, one of them not shared) and four others, one child each.
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
  select ('00000000-0000-0000-0000-00000000f00' || g)::uuid, 'family' || g || '@example.com', now(), '{"role":"parent"}' from generate_series(2, 5) g;
insert into profiles (id, owner_id, name, age, data)
  select ('00000000-0000-0000-0000-00000000d00' || g)::uuid,
         case when g in (1, 6) then :'rita'::uuid else ('00000000-0000-0000-0000-00000000f00' || g)::uuid end, 'Child ' || g, 6,
         format('{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"%s"}}', case when g = 6 then 'none' else 'anonymous' end)::jsonb
    from generate_series(1, 6) g;
-- Four sharing children used their board yesterday; a fifth one three weeks ago (outside the week).
insert into usage_days (profile_id, device_id, day, data)
  select ('00000000-0000-0000-0000-00000000d00' || g)::uuid, 'd1', current_date - 1,
         '{"sessions":[{"activeMs":600000}],"selections":50,"utterances":10,"stats":{"distinctConcepts":20}}'::jsonb
    from generate_series(1, 4) g;
insert into usage_days (profile_id, device_id, day, data) values
  ('00000000-0000-0000-0000-00000000d005', 'd1', current_date - 20, '{"sessions":[{"activeMs":600000}],"selections":50,"utterances":10,"stats":{"distinctConcepts":20}}'),
  -- The family that does not share: never counted, whatever it holds.
  ('00000000-0000-0000-0000-00000000d006', 'd1', current_date - 1, '{"sessions":[{"activeMs":60000000}],"selections":9999,"utterances":999,"stats":{"distinctConcepts":999}}');
select test.ok((select f #> '{usage,children}' = 'null' and not (f #>> '{usage,enough}')::boolean and not (f -> 'usage') ? 'minutes'
                   and team_week_text(f) like '%Not shown this week. Figures appear from 5 children of 5 families%' and team_week_text(f) not like '%minutes,%'
                   and team_week_text(f) not like '%4 children%'
                  from (select team_week_figures() f) t),
  'under 5 children of sharing families, no figure about the use of the boards, and no "4 children" either');
-- Rita's two children on five days make 5 lines of use, but still 4 families.
update profiles set data = jsonb_set(data, '{settings,shareStats}', '"anonymous"') where id = '00000000-0000-0000-0000-00000000d006';
select test.ok((select f #> '{usage,children}' = 'null' and not (f #>> '{usage,enough}')::boolean and not (f -> 'usage') ? 'minutes'
                  from (select team_week_figures() f) t),
  '5 children of 4 families are not enough');
update profiles set data = jsonb_set(data, '{settings,shareStats}', '"none"') where id = '00000000-0000-0000-0000-00000000d006';
-- Tablets seen this week: counted for the sharing families only, and only from 5 families.
insert into devices (id, profile_id, user_id, name, kind, platform, last_seen_at)
  select 'd1', p.id, p.owner_id, 'Tablet', 'primary', 'ios', now() from profiles p where p.name <> 'Child 5';
select test.ok((select f #> '{boards,used7}' = 'null' and (f #>> '{boards,tablets}')::int = 5
                   and team_week_text(f) like '%Boards used this week (families who share anonymous statistics): fewer than 5 families, not shown%'
                  from (select team_week_figures() f) t),
  'boards used this week: not a number while fewer than 5 sharing families used theirs (the linked tablets stay a plain total)');
insert into usage_days (profile_id, device_id, day, data) values
  ('00000000-0000-0000-0000-00000000d005', 'd1', current_date - 2, '{"sessions":[{"activeMs":600000}],"selections":50,"utterances":10,"stats":{"distinctConcepts":20}}');
insert into devices (id, profile_id, user_id, name, kind, platform, last_seen_at)
  select 'd1', p.id, p.owner_id, 'Tablet', 'primary', 'ios', now() from profiles p where p.name = 'Child 5';
select test.ok((select (f #>> '{usage,children}')::int = 5 and (f #>> '{usage,minutes}')::numeric = 10.0 and (f #>> '{usage,selections}')::numeric = 50.0
                   and team_week_text(f) like '%Children who used their board this week: 5%'
                   and team_week_text(f) like '%On a day of use: 10.0 minutes, 50.0 words touched, 10.0 sentences, 20.0 different words%'
                  from (select team_week_figures() f) t),
  'from 5 children the averages appear, and the family that does not share is not in them');
select test.ok((select (f #>> '{accounts,parents}')::int = 5 and (f #>> '{accounts,pros}')::int = 3 and (f #>> '{accounts,newParents}')::int = 1
                   and (f #>> '{accounts,newPros}')::int = 1 and (f #>> '{pros,waiting}')::int = 3 and (f #>> '{boards,profiles}')::int = 6
                   and (f #>> '{boards,used7}')::int = 5
                  from (select team_week_figures() f) t),
  'accounts, profiles and waiting requests are counted');
select team_mail_weekly();
select team_mail_weekly();
select test.ok((select count(*) = 1 from team_mail where kind = 'weekly'), 'one weekly e-mail a week, even if the job runs twice');
select test.ok((select body like '%ACCOUNTS%' and body like '%- Parents in total: 5%' and body like '%- Professionals in total: 3%' and body like '%- Waiting for your decision: 3 (oldest: 0 days)%'
                   and body not like '%Rita%' and body not like '%Child 1%' and body not like '%Sarah%' and body not like '%@%'
                   and subject like 'Daleth AAC: figures of the week (%' from team_mail where kind = 'weekly'),
  'the weekly e-mail holds counts only: no name, no address');

-- 8. Tools for the owner of the project.
select test.ok((select count(*) >= 8 and bool_or(what = 'Connected to the server function' and answer like 'yes%')
                   and bool_or(what = 'Messages given up (5 tries)' and answer = '1') from team_mail_check()),
  'the check says in plain lines where things stand');
select test.ok((select team_mail_plan() like 'pg_cron is not turned on%'), 'without the alarm clock (pg_cron) the planning says so instead of failing');
update team_mail set created_at = now() - interval '100 days' where kind = 'test';
select team_mail_tidy();
select test.ok((select count(*) = 0 from team_mail where kind = 'test'), 'old messages are tidied away');
\echo TEAM MAIL SCENARIO PASSED
