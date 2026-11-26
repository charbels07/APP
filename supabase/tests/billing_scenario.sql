-- Payment: off until the owner switches it on; the free week; days 8–14 paused; frozen after; the
-- child's board still opens; who may write who paid; the professional's licence; the daily reminder.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set ana     '00000000-0000-0000-0000-0000000006a1'
\set omar    '00000000-0000-0000-0000-0000000006a2'
\set karim   '00000000-0000-0000-0000-0000000006a3'
\set eve     '00000000-0000-0000-0000-0000000006a4'
\set lina    '00000000-0000-0000-0000-0000000006b1'
\set draft   '00000000-0000-0000-0000-0000000006b2'

truncate test.ids;
delete from rate_log; delete from push_out; delete from push_subs; delete from billing_entitlements;
update billing_config set live = false, live_since = null;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ana', 'ana@example.com', now(), '{"role":"parent","display_name":"Ana"}'),
  (:'omar', 'omar@example.com', now(), '{"role":"parent","display_name":"Omar"}'),
  (:'karim', 'karim@clinic.fr', now(), '{"role":"pro","display_name":"Karim"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}');
insert into verifications (user_id, full_name, country, profession, status) values (:'karim', 'Karim B', 'Liban', 'slp', 'verified');
insert into profiles (id, owner_id, name, age, data) values
  (:'lina', :'ana', 'Lina', 5, '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"pin":"4821"}}'),
  (:'draft', :'karim', 'Sami', 6, '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{}}');
insert into members (profile_id, user_id, role, level, perms) values
  (:'lina', :'karim', 'therapist', 2, '{}'),
  (:'lina', :'omar', 'parent', 3, '{"manager":true}');

create or replace function test.as_person(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{}', false);
$$;
-- Saves Lina's board as Ana with one more card (the version it has now as the base).
create or replace function test.save_lina(p_word text) returns jsonb language sql security definer set search_path = public as $$
  select save_profile('00000000-0000-0000-0000-0000000006b1',
    jsonb_set(data, '{boards,core,cells}', (data #> '{boards,core,cells}') || jsonb_build_array(jsonb_build_object('concept', p_word))), version)
    from profiles where id = '00000000-0000-0000-0000-0000000006b1'
$$;
create or replace function test.shift(p_days int) returns void language sql security definer set search_path = public as $$
  update accounts set created_at = now() - make_interval(days => p_days) where id = '00000000-0000-0000-0000-0000000006a1';
  update billing_config set live_since = now() - make_interval(days => p_days);
$$;
grant execute on all functions in schema test to authenticated;

-- 1. Payment off: nobody is blocked, every professional "has paid".
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'free', 'payment off: the board is free');
select test.ok((test.save_lina('want') ->> 'ok')::boolean, 'payment off: the family saves');
select test.as_person(:'karim');
select test.ok(exists (select 1 from access_of(:'lina')), 'payment off: the therapist works on the child''s board');
reset role;

-- 2. Only the owner switches it on, in the SQL Editor.
set role authenticated;
select test.expect_error('select billing_go_live()', 'permission denied for function billing_go_live');
select test.ok(true, 'the app cannot switch payment on');
reset role;
select billing_go_live();

-- 3. The free week: nothing blocked; the parent who pays is told, a member is not asked to.
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'trial', 'a family that never subscribed has its free week');
select test.ok((billing_state(:'lina') ->> 'payer')::boolean, 'the owner is the one who pays');
select test.ok((test.save_lina('more') ->> 'ok')::boolean, 'during the free week the family saves');
select test.as_person(:'omar');
select test.ok(not (billing_state(:'lina') ->> 'payer')::boolean, 'the other parent is not the one asked to pay');
select test.as_person(:'eve');
select test.expect_error(format('select billing_state(%L)', :'lina'), 'forbidden');
select test.ok(true, 'a stranger does not see where a family stands');

-- 4. The professional's licence: once payment is on, a therapist without it waits.
select test.as_person(:'karim');
select test.ok(not exists (select 1 from access_of(:'lina')), 'a therapist without her licence waits');
select test.ok(billing_state(:'draft') ->> 'status' = 'free', 'a professional''s own draft board is not the family''s to pay');
select test.expect_error(format('select billing_record(%L, ''pro'', null, false, ''app_store'', ''pro_licence'')', :'karim'),
  'permission denied for function billing_record');
select test.ok(true, 'nobody writes their own purchase from the app');
select test.expect_error('select * from billing_entitlements', 'permission denied for table billing_entitlements');
select test.ok(true, 'the purchases are not read directly');
reset role;
set role service_role;
select billing_record(:'karim', 'pro', null, false, 'app_store', 'pro_licence');
reset role;
set role authenticated;
select test.as_person(:'karim');
select test.ok(exists (select 1 from access_of(:'lina')), 'with her licence the therapist works on the board again');
select test.ok((billing_mine() ->> 'pro')::boolean, 'she sees her licence');
reset role;

-- 5. Days 8–14 after the free week started: everything paused except the child talking.
select test.shift(10);
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'paused', 'day 10 without paying: paused');
select test.expect_error('select test.save_lina(''eat'')', 'payment_needed');
select test.ok(true, 'paused: the board is not changed');
select test.ok(not can_send_media(:'lina'), 'paused: photos and recordings wait');
select test.expect_error(format('select create_pairing_code(%L, ''use'')', :'lina'), 'payment_needed');
select test.ok(true, 'paused: no new tablet');
select test.expect_error(format('select invite(%L, ''eve@example.com'', ''Eve'', ''caregiver'', 1, ''{}'')', :'lina'), 'payment_needed');
select test.ok(true, 'paused: nobody new on the team');
select test.expect_error(format('select take_snapshot(%L)', :'lina'), 'payment_needed');
select test.ok(true, 'paused: no copy by hand');
select test.ok(exists (select 1 from read_profile(:'lina')), 'paused: the board still opens');
select test.ok(exists (select 1 from offer_profile(:'lina', :'omar')), 'paused: the child can still be handed to the other parent');
select test.ok(billing_mine() -> 'family' = 'null'::jsonb or billing_mine() -> 'family' is null, 'she has no subscription');
reset role;

-- 6. After day 14: frozen, for good; the board still opens.
select test.shift(20);
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'frozen', 'day 20 without paying: frozen');
select test.expect_error('select test.save_lina(''eat'')', 'payment_needed');
select test.ok(true, 'frozen: the board is not changed');
select test.ok(exists (select 1 from read_profile(:'lina')), 'frozen: the board still opens');
reset role;

-- 7. Paying gives everything back at once.
set role service_role;
select billing_record(:'ana', 'family', now() + interval '30 days', true, 'play_store', 'family_monthly');
reset role;
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'paid' and (billing_state(:'lina') ->> 'renews')::boolean, 'paid: the board is the family''s again');
select test.ok((test.save_lina('eat') ->> 'ok')::boolean, 'paid: the family saves at once');
select test.ok(billing_mine() #>> '{family,store}' = 'play_store', 'she sees her subscription');
select test.ok(jsonb_array_length(export_my_data() -> 'purchases') = 1, '"Download all my data" lists the purchases');
reset role;

-- 8. A subscription that ended: 7 days with nothing blocked, then paused.
set role service_role;
select billing_record(:'ana', 'family', now() - interval '3 days', false, 'play_store', 'family_monthly');
reset role;
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'grace', 'ended 3 days ago: nothing blocked yet');
select test.ok((test.save_lina('go') ->> 'ok')::boolean, 'ended 3 days ago: the family still saves');
reset role;

-- 9. The daily reminder: to the parent who pays, in her language, never with the child's name.
select name as six from pg_timezone_names where extract(hour from now() at time zone name) = 18 order by name limit 1 \gset
insert into push_subs (user_id, endpoint, p256dh, auth, lang, tz) values
  (:'ana', 'https://fcm.googleapis.com/fcm/send/ana', 'x', 'y', 'en', :'six'),
  (:'omar', 'https://fcm.googleapis.com/fcm/send/omar', 'x', 'y', 'en', :'six');
select billing_reminders();
select test.ok((select count(*) = 1 from push_out where kind = 'billing'), 'one reminder, to the parent who pays');
select test.ok((select body not like '%Lina%' and title = 'Daleth AAC' from push_out where kind = 'billing'), 'never the child''s name');
select billing_reminders();
select test.ok((select count(*) = 1 from push_out where kind = 'billing'), 'once a day at most');

-- 10. Off again: nobody is blocked.
select billing_stop();
set role authenticated;
select test.as_person(:'ana');
select test.ok(billing_state(:'lina') ->> 'status' = 'free', 'payment off again: free');
reset role;
\echo 'billing scenario PASSED'
