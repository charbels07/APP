-- Product figures, technical problems, requests and votes: who may send what, what the team
-- reads, and what it can never read (small groups, anything that is not a known number).
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set p1 '00000000-0000-0000-0000-0000000000d1'
\set p2 '00000000-0000-0000-0000-0000000000d2'
\set p3 '00000000-0000-0000-0000-0000000000d3'
\set p4 '00000000-0000-0000-0000-0000000000d4'
\set p5 '00000000-0000-0000-0000-0000000000d5'
\set p6 '00000000-0000-0000-0000-0000000000d6'
\set old '00000000-0000-0000-0000-0000000000d7'
\set pro '00000000-0000-0000-0000-0000000000d8'
\set zoe '00000000-0000-0000-0000-0000000000d9'
\set mallory '00000000-0000-0000-0000-0000000000da'
\set tablet '00000000-0000-0000-0000-0000000000db'

truncate test.ids;
delete from feedback; delete from admins; delete from admin_log; delete from rate_log;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'p1', 'p1@example.com', now(), '{"role":"parent","display_name":"P1"}'),
  (:'p2', 'p2@example.com', now(), '{"role":"parent","display_name":"P2"}'),
  (:'p3', 'p3@example.com', now(), '{"role":"parent","display_name":"P3"}'),
  (:'p4', 'p4@example.com', now(), '{"role":"parent","display_name":"P4"}'),
  (:'p5', 'p5@example.com', now(), '{"role":"parent","display_name":"P5"}'),
  (:'p6', 'p6@example.com', now(), '{"role":"parent","display_name":"P6"}'),
  (:'old', 'old@example.com', now(), '{"role":"parent","display_name":"Old"}'),
  (:'pro', 'pro@clinic.fr', now(), '{"role":"pro","display_name":"Pro"}'),
  (:'zoe', 'zoe@team.example', now(), '{"role":"parent","display_name":"Zoe"}'),
  (:'mallory', 'mallory@example.com', now(), '{"role":"parent","display_name":"Mallory"}');
insert into auth.users (id, is_anonymous) values (:'tablet', true);
insert into verifications (user_id, full_name, country, profession, status) values (:'pro', 'Pro K', 'France', 'slp', 'verified');
insert into admins (user_id) values (:'zoe');
set role authenticated;

-- Six families who agreed to the new list, one who agreed to the old list only.
\set board '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"anonymous","shareTerms":2,"dataCollection":"off","pin":"4821"}}'
select set_config('request.jwt.claim.sub', :'p1', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p1', 'A', 5, :'board') returning id) insert into test.ids select 'c1', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c1'), 'd1', 'iPad', 'companion', 'ios', '1.4.0');
select set_config('request.jwt.claim.sub', :'p2', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p2', 'B', 6, :'board') returning id) insert into test.ids select 'c2', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c2'), 'd2', 'iPad', 'companion', 'ios', '1.4.0');
select set_config('request.jwt.claim.sub', :'p3', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p3', 'C', 7, :'board') returning id) insert into test.ids select 'c3', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c3'), 'd3', 'iPad', 'companion', 'ios', '1.4.0');
select set_config('request.jwt.claim.sub', :'p4', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p4', 'D', 8, :'board') returning id) insert into test.ids select 'c4', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c4'), 'd4', 'iPad', 'companion', 'ios', '1.4.0');
select set_config('request.jwt.claim.sub', :'p5', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p5', 'E', 9, :'board') returning id) insert into test.ids select 'c5', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c5'), 'd5', 'iPad', 'companion', 'ios', '1.4.0');
select set_config('request.jwt.claim.sub', :'p6', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'p6', 'F', 4, :'board') returning id) insert into test.ids select 'c6', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c6'), 'd6', 'Tab', 'companion', 'android', '1.3.0');
select set_config('request.jwt.claim.sub', :'old', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'old', 'G', 6,
  '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"anonymous","dataCollection":"off","pin":"4821"}}') returning id)
insert into test.ids select 'c7', id::text from c;
select register_device((select v::uuid from test.ids where k = 'c7'), 'd7', 'iPad', 'companion', 'ios', '1.4.0');

-- 1. A family that agreed sends its day: only known names with a number are kept.
select set_config('request.jwt.claim.sub', :'p1', false);
select save_feature_day((select v::uuid from test.ids where k = 'c1'), 'd1', current_date,
  '{"board": 12.7, "tla": 1, "searchNone": 2, "tlaMs": 999999999999, "secret": 5, "print": "the word apple", "edit": {"word": "Adam"}, "timer": -3}', 'ios', 'tablet', '1.4.0');
reset role;
select test.ok((select counts = '{"board": 12, "tla": 1, "searchNone": 2, "tlaMs": 86400000, "timer": 0}'::jsonb from feature_days),
  'a day of feature counters keeps known names and whole numbers only: no other name, no text, nothing inside');
select test.ok((select platform = 'ios' and form = 'tablet' and app_version = '1.4.0' from feature_days), 'with the kind of device and the version of the app');
set role authenticated;

-- 2. Who cannot send.
select set_config('request.jwt.claim.sub', :'mallory', false);
select test.expect_error(format('select save_feature_day(%L, ''d1'', current_date, ''{"board":1}'')', (select v from test.ids where k = 'c1')), 'forbidden');
select test.ok(true, 'a stranger cannot write counters for a child');
select set_config('request.jwt.claim.sub', :'old', false);
select test.expect_error(format('select save_feature_day(%L, ''d7'', current_date, ''{"board":1}'')', (select v from test.ids where k = 'c7')), 'forbidden');
select test.expect_error(format('select report_problems(%L, ''[{"kind":"crash"}]'')', (select v from test.ids where k = 'c7')), 'forbidden');
select test.ok(true, 'a family that agreed to the first list only sends neither counters nor problems: it must agree to the new list');
select set_config('request.jwt.claim.sub', :'p1', false);
select test.expect_error(format('select save_feature_day(%L, ''unknown'', current_date, ''{"board":1}'')', (select v from test.ids where k = 'c1')), 'forbidden');
select test.expect_error(format('select save_feature_day(%L, ''d1'', current_date - 200, ''{"board":1}'')', (select v from test.ids where k = 'c1')), 'invalid');
select test.ok(true, 'an unknown device or an old date is refused');
reset role;
insert into members (profile_id, user_id, display_name, email, role, level, perms)
  values ((select v::uuid from test.ids where k = 'c1'), :'pro', 'Pro', 'pro@clinic.fr', 'therapist', 3, '{"createMaterials":true}'),
         ((select v::uuid from test.ids where k = 'c1'), :'tablet', 'Tablet', null, 'device', 1, '{}');
insert into devices (id, profile_id, user_id, name, kind, platform) values ('dpro', (select v::uuid from test.ids where k = 'c1'), :'pro', 'Mac', 'companion', 'web');
set role authenticated;
select set_config('request.jwt.claim.sub', :'pro', false);
select test.expect_error(format('select save_feature_day(%L, ''dpro'', current_date, ''{"board":1}'')', (select v from test.ids where k = 'c1')), 'forbidden');
select test.ok(true, 'a professional of the team does not feed the counters: her way of working is not measured');
-- She cannot agree in the family''s place either.
select test.expect_error(format('select save_profile(%L, %L, 1)', (select v from test.ids where k = 'c1'),
  '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"anonymous","shareTerms":3,"dataCollection":"off","pin":"4821"}}'), 'consent_protected');
select test.ok(true, 'only the family changes what it agreed to share');

-- 3. A profile cannot be born "already agreed" without the family''s choice to share.
select set_config('request.jwt.claim.sub', :'mallory', false);
with c as (insert into profiles (owner_id, name, age, data) values (:'mallory', 'M', 6,
  '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"none","shareTerms":2,"dataCollection":"off","pin":"4821"}}') returning id)
insert into test.ids select 'cm', id::text from c;
reset role;
select test.ok((select not (data -> 'settings') ? 'shareTerms' from profiles where owner_id = :'mallory'), 'an agreement without the choice to share is dropped when a profile is created');
set role authenticated;

-- 4. The team reads nothing below 5 children of 5 families.
select set_config('request.jwt.claim.sub', :'mallory', false);
select test.expect_error('select admin_product()', 'forbidden');
select test.expect_error('select admin_bugs()', 'forbidden');
select test.expect_error('select * from admin_roadmap()', 'forbidden');
select test.expect_error('select admin_roadmap_save(null, ''{"en":"x"}'', ''open'')', 'forbidden');
select test.ok(true, 'someone outside the team reads none of these pages');
select test.ok((select count(*) = 0 from feature_days) and (select count(*) = 0 from error_counts), 'and cannot read the tables behind them');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select (admin_product() ->> 'enough')::boolean = false and not admin_product() ? 'features'), 'with one child sending, the team sees no figure at all');
select test.ok((select (admin_product() ->> 'agreed')::int = 6), 'only how many families agreed to the new list');

-- 5. Six children: each feature is shown as regular / now and then / given up / never,
--    and a group of 1 to 4 children is never given as a number.
reset role;
delete from feature_days;
-- everybody uses the board 5 days out of the last 30; children 1 to 5 searched 40 days ago only;
-- child 1 alone opened an activity board; five of them met a search without result, two swapped a picture.
insert into feature_days (profile_id, device_id, day, counts, platform, form, app_version)
select t.v::uuid, 'd' || right(t.k, 1), current_date - g, '{"board": 20}'::jsonb, 'ios', 'tablet', '1.4.0'
  from test.ids t, generate_series(1, 5) g where t.k in ('c1', 'c2', 'c3', 'c4', 'c5', 'c6');
insert into feature_days (profile_id, device_id, day, counts, platform, form, app_version)
select t.v::uuid, 'd' || right(t.k, 1), current_date - 40, '{"search": 3}'::jsonb, 'ios', 'tablet', '1.3.0'
  from test.ids t where t.k in ('c1', 'c2', 'c3', 'c4', 'c5');
update feature_days set counts = counts || '{"tla": 2}' where profile_id = (select v::uuid from test.ids where k = 'c1') and day = current_date - 1;
update feature_days set counts = counts || '{"searchNone": 2}' where day = current_date - 2 and profile_id in (select v::uuid from test.ids where k in ('c1', 'c2', 'c3', 'c4', 'c5'));
update feature_days set counts = counts || '{"pictoSwap": 4}' where day = current_date - 3 and profile_id in (select v::uuid from test.ids where k in ('c1', 'c2'));
-- the family that did not agree to the new list has rows from nowhere: they must not count
insert into feature_days (profile_id, device_id, day, counts) values ((select v::uuid from test.ids where k = 'c7'), 'd7', current_date - 1, '{"timer": 9}');
set role authenticated;
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select (admin_product() ->> 'enough')::boolean and (admin_product() ->> 'children')::int = 6), 'six children of six families: the figures open');
select test.ok((select f = '{"key":"board","regular":6,"occasional":0,"abandoned":0,"never":0}'::jsonb
                  from jsonb_array_elements(admin_product() -> 'features') f where f ->> 'key' = 'board'), 'a feature everybody uses 5 days a month is "regular" for the six');
select test.ok((select f = '{"key":"search","regular":0,"occasional":0,"abandoned":5,"never":1}'::jsonb is false and f = '{"key":"search","using":0,"notUsing":6}'::jsonb
                  from jsonb_array_elements(admin_product() -> 'features') f where f ->> 'key' = 'search'),
  'five gave up and one never used: the single child is not told apart, only "nobody uses it now"');
select test.ok((select f = '{"key":"tla","few":"using"}'::jsonb
                  from jsonb_array_elements(admin_product() -> 'features') f where f ->> 'key' = 'tla'), 'a feature used by one child only says "fewer than 5 use it", never "1"');
select test.ok((select f = '{"key":"timer","regular":0,"occasional":0,"abandoned":0,"never":6}'::jsonb
                  from jsonb_array_elements(admin_product() -> 'features') f where f ->> 'key' = 'timer'), 'what nobody uses is "never used" for the six (the family that did not agree is not counted)');
select test.ok((select (admin_product() -> 'tasks' ->> 'searchNone')::int = 10 and not (admin_product() -> 'tasks') ? 'pictoSwap'),
  'a sum is given when 5 children took part (searches without result), left out when 2 did (pictures swapped)');
select test.ok((select (admin_product() -> 'forms' ->> 'tablet')::int = 6), 'by kind of device, 5 children or more');
select test.ok((select admin_product()::text !~ '(c1|d1|A"|p1@)' and admin_product()::text !~ (select v from test.ids where k = 'c1')), 'no name, no device, no profile in what the team reads');

-- 6. The family withdraws: what was counted for the team is erased at once.
select set_config('request.jwt.claim.sub', :'p6', false);
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'c6'),
  '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"shareStats":"none","shareTerms":2,"dataCollection":"off","pin":"4821"}}', 1)) ->> 'ok' = 'true'), 'a family turns sharing off');
reset role;
select test.ok((select count(*) = 0 from feature_days where profile_id = (select v::uuid from test.ids where k = 'c6')), 'its counters are deleted');
set role authenticated;
select test.expect_error(format('select save_feature_day(%L, ''d6'', current_date, ''{"board":1}'')', (select v from test.ids where k = 'c6')), 'forbidden');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select (admin_product() ->> 'children')::int = 5 and (admin_product() ->> 'agreed')::int = 5), 'and it is no longer counted');

-- 7. Technical problems: known values only, and nothing that says who.
select set_config('request.jwt.claim.sub', :'p1', false);
select report_problems((select v::uuid from test.ids where k = 'c1'), '[
  {"kind":"crash","name":"TypeError","at":"1:482211","screen":"schedule","platform":"ios","form":"tablet","version":"1.4.0","n":2,"message":"Adam is not valid JSON","user":"p1@example.com"},
  {"kind":"crash","name":"TypeError","at":"1:482211","screen":"schedule","platform":"ios","form":"tablet","version":"1.4.0"},
  {"kind":"speech","name":"Adam said hello","at":"see http://x","screen":"the page of Adam","platform":"my iPad","form":"big","version":"1.4.0 <b>","n":9999},
  {"kind":"made up","n":3},
  "not an object"]');
reset role;
select test.ok((select n = 3 from error_counts where kind = 'crash' and name = 'TypeError' and at = '1:482211' and screen = 'schedule' and app_version = '1.4.0'),
  'the same problem met three times is one line with a count of 3');
select test.ok((select name = 'Error' and at = '' and screen = 'other' and platform = '?' and form = '?' and app_version = '' and n = 50 from error_counts where kind = 'speech'),
  'anything that is not a known value is replaced: no sentence can travel in a problem report');
select test.ok((select count(*) = 2 from error_counts), 'an unknown kind of problem is ignored');
select test.ok((select count(*) = 0 from information_schema.columns where table_name = 'error_counts' and column_name ~ '(profile|user|device|account|message|text)'),
  'the table of problems has no column for a child, an account, a device or a message');
set role authenticated;
select test.expect_error(format('select report_problems(%L, %L)', (select v from test.ids where k = 'c1'), (select jsonb_agg(jsonb_build_object('kind', 'crash')) from generate_series(1, 41))::text), 'invalid');
select set_config('request.jwt.claim.sub', :'mallory', false);
select test.expect_error(format('select report_problems(%L, ''[{"kind":"crash"}]'')', (select v from test.ids where k = 'c1')), 'forbidden');
select test.ok(true, 'a stranger cannot fill the list of problems');
-- the child''s tablet (signed in with a code) reports too
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select report_problems((select v::uuid from test.ids where k = 'c1'), '[{"kind":"audio","screen":"board","platform":"ios","form":"tablet","version":"1.4.0"}]');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select (admin_bugs() ->> 'total')::int = 54 and (admin_bugs() -> 'kinds' ->> 'crash')::int = 3 and (admin_bugs() -> 'screens' ->> 'schedule')::int = 3
                   and jsonb_array_length(admin_bugs() -> 'daily') = 30 and (admin_bugs() -> 'top' -> 0 ->> 'kind') = 'speech'),
  'the team reads the problems by kind, screen, version and day, the most frequent first');

-- 8. Requests: sorted by subject; ideas people can vote for.
select set_config('request.jwt.claim.sub', :'p1', false);
select send_feedback('vocabulary', 'More words about school please', 'ios', '1.4.0');
select send_feedback('idea', 'A calendar', 'ios', '1.3.0');
select test.expect_error('select send_feedback(''gossip'', ''hello there'', ''ios'', ''1.4.0'')', 'new row for relation "feedback" violates check constraint "feedback_kind_check"');
reset role;
select test.ok((select count(*) = 1 from feedback where kind = 'vocabulary') and (select count(*) = 1 from feedback where kind = 'feature'),
  'a message says what it is about; an older app that still says "idea" is filed under "new feature"');
set role authenticated;
select set_config('request.jwt.claim.sub', :'zoe', false);
insert into test.ids select 'idea1', admin_roadmap_save(null, '{"fr":"Calendrier","en":"Calendar","ar":"تقويم","html":"<b>x</b>"}', 'open')::text;
insert into test.ids select 'idea2', admin_roadmap_save(null, '{"en":"Secret plan"}', 'hidden')::text;
select test.expect_error('select admin_roadmap_save(null, ''{"fr":"  "}'', ''open'')', 'invalid');
select test.ok((select title = '{"fr":"Calendrier","en":"Calendar","ar":"تقويم"}'::jsonb from admin_roadmap() where status = 'open'), 'the team writes an idea in the three languages (nothing else is kept)');
select set_config('request.jwt.claim.sub', :'p1', false);
select test.ok((select count(*) = 1 and bool_and(not mine and votes = 0) from roadmap_list()), 'people see the ideas open to votes, not the hidden ones');
select roadmap_vote((select v::uuid from test.ids where k = 'idea1'), true);
select roadmap_vote((select v::uuid from test.ids where k = 'idea1'), true);
select test.expect_error(format('select roadmap_vote(%L, true)', (select v from test.ids where k = 'idea2')), 'not_found');
select set_config('request.jwt.claim.sub', :'pro', false);
select roadmap_vote((select v::uuid from test.ids where k = 'idea1'), true);
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.expect_error(format('select roadmap_vote(%L, true)', (select v from test.ids where k = 'idea1')), 'forbidden');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'p1', false);
select test.ok((select votes = 2 and mine from roadmap_list()), 'one vote per account, even if the button is pressed twice; a child''s tablet does not vote');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select votes = 2 and parents = 1 and pros = 1 from admin_roadmap() where status = 'open'), 'the team sees the votes of the families and of the professionals apart');
select set_config('request.jwt.claim.sub', :'p1', false);
select roadmap_vote((select v::uuid from test.ids where k = 'idea1'), false);
select test.ok((select votes = 1 and not mine from roadmap_list()), 'a vote can be taken back');
reset role;
select test.ok((select count(*) = 2 from admin_log where action = 'roadmap'), 'what the team adds to the list of ideas is written in the history');

do $$ begin raise notice 'PASSED — product figures, problems, requests and votes'; end $$;
