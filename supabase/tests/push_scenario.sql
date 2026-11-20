-- Notifications outside the app: who may register a device, where the server may post, who is
-- reminded at 12:00, and who an idea put to the vote is asked to.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set ana     '00000000-0000-0000-0000-0000000000e1'
\set omar    '00000000-0000-0000-0000-0000000000e2'
\set karim   '00000000-0000-0000-0000-0000000000e3'
\set zoe     '00000000-0000-0000-0000-0000000000e4'
\set tablet  '00000000-0000-0000-0000-0000000000e5'
\set mallory '00000000-0000-0000-0000-0000000000e6'
\set lina    '00000000-0000-0000-0000-0000000000e7'
\set sami    '00000000-0000-0000-0000-0000000000e8'
\set key     'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
\set pub     'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'
\set dh      'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'
\set au      'CCCCCCCCCCCCCCCCCCCCCC'

truncate test.ids;
delete from admins; delete from admin_log; delete from rate_log; delete from notices; delete from roadmap;
delete from push_config; delete from team_mail_config;
insert into team_mail_config (function_url, key) values ('https://abcdefgh.supabase.co/functions/v1/caa-mail', :'key');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ana', 'ana@example.com', now(), '{"role":"parent","display_name":"Ana"}'),
  (:'omar', 'omar@example.com', now(), '{"role":"parent","display_name":"Omar"}'),
  (:'karim', 'karim@clinic.fr', now(), '{"role":"pro","display_name":"Karim"}'),
  (:'zoe', 'zoe@team.example', now(), '{"role":"parent","display_name":"Zoe"}'),
  (:'mallory', 'mallory@example.com', now(), '{"role":"parent","display_name":"Mallory"}');
insert into auth.users (id, is_anonymous) values (:'tablet', true);
insert into verifications (user_id, full_name, country, profession, status) values (:'karim', 'Karim B', 'Liban', 'slp', 'verified');
insert into admins (user_id) values (:'zoe');
insert into profiles (id, owner_id, name, age, data) values
  (:'lina', :'ana', 'Lina', 5, '{"settings":{}}'),
  (:'sami', :'omar', 'Sami', 6, '{"settings":{}}');
insert into members (profile_id, user_id, role, level) values (:'lina', :'karim', 'therapist', 2);
update accounts set prefs = '{"uiLang":"en"}' where id = :'ana';
-- A time zone where it is 12-something now, and one where it is not.
select name as noon from pg_timezone_names where extract(hour from now() at time zone name) = 12 order by name limit 1 \gset
select name as night from pg_timezone_names where extract(hour from now() at time zone name) = 3 order by name limit 1 \gset

-- 1. The keys: made by the server function only; the app reads the public half.
set role authenticated;
select set_config('request.jwt.claim.sub', :'ana', false);
select test.ok(push_key() is null, 'before the server function ran, the app is told there is no key (and offers nothing)');
select test.expect_error(format('select push_keys_set(%L, %L, %L)', :'key', :'pub', repeat('d', 43)), 'permission denied for function push_keys_set');
select test.expect_error(format('select * from push_keys(%L)', :'key'), 'permission denied for function push_keys');
select test.expect_error('select * from push_config', 'permission denied for table push_config');
reset role;
set role service_role;
select test.expect_error(format('select push_keys_set(''wrong'', %L, %L)', :'pub', repeat('d', 43)), 'forbidden');
select test.expect_error(format('select push_keys_set(%L, ''short'', %L)', :'key', repeat('d', 43)), 'invalid');
select push_keys_set(:'key', :'pub', repeat('d', 43));
select push_keys_set(:'key', :'pub', repeat('e', 43));
select test.ok((select private_key = repeat('d', 43) from push_keys(:'key')), 'the keys are written once and never replaced');
reset role;
select test.ok((select position('dddd' in encode(private_sealed, 'escape')) = 0 from push_config), 'the private half is sealed in the table');
set role authenticated;
select test.ok(push_key() = :'pub', 'a signed-in person''s browser gets the public half');

-- 2. Registering a device.
select test.expect_error(format('select push_subscribe(''https://evil.example/push/1'', %L, %L)', :'dh', :'au'), 'invalid');
select test.expect_error(format('select push_subscribe(''https://fcm.googleapis.com.evil.example/x'', %L, %L)', :'dh', :'au'), 'invalid');
select test.expect_error(format('select push_subscribe(''http://fcm.googleapis.com/fcm/send/a'', %L, %L)', :'dh', :'au'), 'invalid');
select test.expect_error(format('select push_subscribe(''https://10.0.0.1/a'', %L, %L)', :'dh', :'au'), 'invalid');
select test.ok(true, 'the server only ever posts to the browsers'' notification services');
select test.expect_error(format('select push_subscribe(''https://fcm.googleapis.com/fcm/send/a'', ''x'', %L)', :'au'), 'invalid');
select push_subscribe('https://fcm.googleapis.com/fcm/send/ana-phone', :'dh', :'au', 'en', :'noon');
select push_subscribe('https://fcm.googleapis.com/fcm/send/ana-phone', :'dh', :'au', 'en', :'noon');
select push_subscribe('https://web.push.apple.com/ana-ipad', :'dh', :'au', 'xx', 'Not/AZone');
reset role;
select test.ok((select count(*) = 2 from push_subs where user_id = :'ana'), 'the same browser is registered once');
select test.ok((select lang = 'fr' and tz = 'UTC' from push_subs where endpoint like '%ana-ipad'), 'an unknown language or time zone becomes the default one');
set role authenticated;
select test.expect_error('select * from push_subs', 'permission denied for table push_subs');
select test.expect_error('select * from push_out', 'permission denied for table push_out');
select test.expect_error('select * from profile_seen', 'permission denied for table profile_seen');
select test.expect_error('select push_reminders()', 'permission denied for function push_reminders');
select test.expect_error(format('select roadmap_announce(%L)', :'lina'), 'permission denied for function roadmap_announce');
select test.expect_error(format('select * from push_take(%L)', :'key'), 'permission denied for function push_take');
select test.ok(true, 'the app can read neither the devices, the queue nor the last opening, and cannot send anything');
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.expect_error(format('select push_subscribe(''https://fcm.googleapis.com/fcm/send/tab'', %L, %L)', :'dh', :'au'), 'forbidden');
select test.ok(push_key() is null, 'a child''s tablet gets no notification');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'omar', false);
select push_subscribe('https://updates.push.services.mozilla.com/wpush/v2/omar', :'dh', :'au', 'fr', :'noon');
select set_config('request.jwt.claim.sub', :'karim', false);
select push_subscribe('https://fcm.googleapis.com/fcm/send/karim', :'dh', :'au', 'ar', :'noon');
select set_config('request.jwt.claim.sub', :'mallory', false);
select push_unsubscribe('https://fcm.googleapis.com/fcm/send/karim');
select push_subscribe('https://fcm.googleapis.com/fcm/send/mallory', :'dh', :'au', 'fr', :'night');
reset role;
select test.ok((select count(*) = 1 from push_subs where user_id = :'karim'), 'nobody removes another person''s device');

-- 3. The board was opened: only the family counts, and only for a board they may read.
set role authenticated;
select set_config('request.jwt.claim.sub', :'mallory', false);
select test.expect_error(format('select board_seen(%L)', :'sami'), 'forbidden');
select set_config('request.jwt.claim.sub', :'karim', false);
select board_seen(:'lina');
reset role;
select test.ok((select count(*) = 0 from profile_seen), 'a stranger cannot say a board was opened; a professional looking at it does not count');
set role authenticated;
select set_config('request.jwt.claim.sub', :'omar', false);
select board_seen(:'sami');
reset role;
select test.ok((select count(*) = 1 from profile_seen where profile_id = :'sami'), 'the family opening the board is noted (one moment per child)');

update push_subs set tz = :'night' where endpoint like '%ana-ipad';
-- 4. 12:00. Ana's board was not opened (two devices, one of them at noon); Omar's was; Karim is a
--    professional; Mallory has no child and it is night there.
select test.ok(push_reminders() = 1, 'one reminder: the parent whose child''s board was not opened today, on the device where it is noon');
select test.ok((select o.kind = 'reminder' and o.body like 'The board has not been opened%' and s.endpoint like '%ana-phone'
                  from push_out o join push_subs s on s.id = o.sub_id),
  'it is written in the device''s language, with no name in it');
select test.ok((select bool_and(body !~ 'Lina') from push_out), 'the child''s name never leaves in a notification');
select test.ok(push_reminders() = 0, 'once a day at most');
update push_subs set reminded_on = null;
delete from push_out;
update accounts set prefs = prefs || '{"notifications":{"reminder":false}}' where id = :'ana';
select test.ok(push_reminders() = 0, 'a parent who switched the reminder off is left alone');
update accounts set prefs = '{"uiLang":"en"}' where id = :'ana';
update profiles set deleted_at = now() where id = :'lina';
select test.ok(push_reminders() = 0, 'no reminder for a profile in the bin');
update profiles set deleted_at = null where id = :'lina';
update profile_seen set seen_at = now() - interval '2 days';
select test.ok(push_reminders() = 2, 'a board opened two days ago is not "opened today"');
delete from push_out;

-- 5. An idea put to the vote, and who it is asked to.
set role authenticated;
select set_config('request.jwt.claim.sub', :'ana', false);
select test.expect_error('select admin_roadmap_save(null, ''{"en":"x"}'', ''open'', ''pro'')', 'forbidden');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.expect_error('select admin_roadmap_save(null, ''{"en":"x"}'', ''open'', ''everybody'')', 'invalid');
insert into test.ids select 'forPros', admin_roadmap_save(null, '{"fr":"Bilans","en":"Reports","ar":"تقارير"}', 'open', 'pro')::text;
reset role;
select test.ok((select count(*) = 1 and min(user_id::text) = :'karim' from notices where kind = 'idea'),
  'an idea for the professionals: a line in the app for them only (not the families, not a tablet)');
select test.ok((select count(*) = 1 and min(o.title) = 'فكرة جديدة للتصويت' and min(o.body) = 'تقارير'
                  from push_out o join push_subs s on s.id = o.sub_id where s.user_id = :'karim'),
  'and a notification on their devices, in each device''s language');
select test.ok((select count(*) = 1 from push_out), 'no family device hears about it');
set role authenticated;
select set_config('request.jwt.claim.sub', :'ana', false);
select test.ok((select count(*) = 0 from roadmap_list()), 'a parent does not see an idea asked to the professionals');
select test.expect_error(format('select roadmap_vote(%L, true)', (select v from test.ids where k = 'forPros')), 'not_found');
select set_config('request.jwt.claim.sub', :'karim', false);
select test.ok((select count(*) = 1 from roadmap_list()), 'a professional sees it');
select roadmap_vote((select v::uuid from test.ids where k = 'forPros'), true);
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select audience = 'pro' and votes = 1 from admin_roadmap()), 'the team sees who each idea is asked to');
reset role;
delete from push_out; delete from notices;
update accounts set prefs = prefs || '{"notifications":{"ideas":false}}' where id = :'omar';
set role authenticated;
insert into test.ids select 'forParents', admin_roadmap_save(null, '{"fr":"Calendrier","en":"Calendar"}', 'open', 'parent')::text;
insert into test.ids select 'hidden', admin_roadmap_save(null, '{"en":"Later"}', 'hidden', 'all')::text;
select admin_roadmap_save((select v::uuid from test.ids where k = 'forParents'), '{"fr":"Calendrier","en":"Calendar"}', 'planned');
reset role;
select test.ok((select count(*) = 4 and bool_and(user_id <> :'karim') from notices where kind = 'idea'),
  'an idea for the parents: every parent account, once (a hidden idea or a change of status announces nothing)');
select test.ok((select text = 'Nouvelle idée soumise au vote : Calendar' from notices where user_id = :'ana'), 'the title is in the person''s language when the team wrote it');
select test.ok((select count(*) = 3 and bool_and(s.user_id in (:'ana', :'mallory')) from push_out o join push_subs s on s.id = o.sub_id),
  'notifications go to the parents'' devices, except the person who switched "new ideas" off');
select test.ok((select audience = 'parent' from roadmap where id = (select v::uuid from test.ids where k = 'forParents')),
  'an app not updated yet (three values) changes the status and keeps the audience');

-- 6. The server function: with the database's key only.
set role service_role;
select test.expect_error('select * from push_take(''bbbb'')', 'forbidden');
select test.ok((select count(*) = 3 and bool_and(ttl > 3600 and endpoint like 'https://%') from push_take(:'key')), 'with the key, the waiting notifications are handed out with their address');
select test.ok((select count(*) = 0 from push_take(:'key')), 'and not twice in a row');
reset role;
select o.id as sent from push_out o join push_subs s on s.id = o.sub_id where s.endpoint like '%ana-phone' \gset
select o.id as gone from push_out o join push_subs s on s.id = o.sub_id where s.endpoint like '%ana-ipad' \gset
select o.id as failed from push_out o join push_subs s on s.id = o.sub_id where s.endpoint like '%mallory' \gset
set role service_role;
select push_done(:'key', :'sent', 'sent');
select push_done(:'key', :'gone', 'gone');
select push_done(:'key', :'failed', 'failed', '500');
reset role;
select test.ok((select done_at is not null from push_out where id = :'sent'), 'a delivered notification is marked');
select test.ok((select count(*) = 0 from push_subs where endpoint like '%ana-ipad') and (select count(*) = 0 from push_out where id = :'gone'),
  'a device that withdrew its permission leaves the list, with what waited for it');
select test.ok((select error = '500' and done_at is null from push_out where id = :'failed'), 'a failure is kept for a later try');
update push_out set expires_at = now() - interval '1 minute', last_try_at = null where id = :'failed';
set role service_role;
select test.ok((select count(*) = 0 from push_take(:'key')), 'a notification too old to be useful is not sent late');
reset role;

-- 7. Tidying, and what leaves with the account.
update push_out set created_at = now() - interval '3 days';
update push_subs set seen_at = now() - interval '13 months' where endpoint like '%mallory';
select push_tidy();
select test.ok((select count(*) = 0 from push_out) and (select count(*) = 0 from push_subs where endpoint like '%mallory'),
  'old notifications are erased after 2 days; a device silent for 12 months leaves the list');
delete from auth.users where id = :'omar';
select test.ok((select count(*) = 0 from push_subs where endpoint like '%omar') and (select count(*) = 0 from profile_seen where profile_id = :'sami'),
  'an erased account takes its devices and its child''s last opening with it');

do $$ begin raise notice 'PASSED — notifications: devices, reminders, ideas and their audience'; end $$;
