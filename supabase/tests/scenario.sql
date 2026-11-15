-- Security scenario for the schema: each person only sees and changes what they may.
-- Run after auth_stub.sql and the migrations (see supabase/README.md).
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-00000000000a'
\set sarah   '00000000-0000-0000-0000-00000000000b'
\set marc    '00000000-0000-0000-0000-00000000000c'
\set eve     '00000000-0000-0000-0000-00000000000d'
\set tablet  '00000000-0000-0000-0000-00000000000e'
\set zoe     '00000000-0000-0000-0000-00000000000f'

create schema test;
grant usage on schema test to authenticated;
create function test.expect_error(q text, code text) returns void language plpgsql as $$
begin
  begin
    execute q;
  exception when others then
    if sqlerrm = code then return; end if;
    raise exception 'expected "%" but got "%" for: %', code, sqlerrm, q;
  end;
  raise exception 'expected "%" but it succeeded: %', code, q;
end $$;
create function test.ok(cond boolean, what text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAILED: %', what; end if;
  raise notice 'ok — %', what;
end $$;
grant execute on all functions in schema test to authenticated;
create table test.ids (k text primary key, v text);
grant all on test.ids to authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}');

set role authenticated;

-- Rita creates Adam's profile and invites Sarah (no account yet).
select set_config('request.jwt.claim.sub', :'rita', false);
-- Like the app: the new row is asked back in the same step ("returning").
with created as (
  insert into profiles (owner_id, name, age, data) values (:'rita', 'Adam', 6,
    '{"boards":{"core":{"cells":[{"concept":"i"},{"concept":"want"}]},"food":{"cells":[null]}},"settings":{}}')
  returning id)
insert into test.ids select 'adam', id::text from created;
select test.ok((select count(*) = 1 from list_profiles() where access = 'owner'), 'parent sees her child as owner');
insert into test.ids select 'inv', (invite((select v::uuid from test.ids where k = 'adam'), 'Sarah@Clinic.fr', 'Sarah', 'therapist', 2,
  '{"createMaterials":true,"proposeVocabulary":true}')).id::text;

-- A stranger sees nothing and cannot write.
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from profiles), 'a stranger sees no profile');
select test.expect_error(format('select save_profile(%L, ''{}'', 1)', (select v from test.ids where k = 'adam')), 'forbidden');
select test.expect_error(format('select connection_code(%L)', (select v from test.ids where k = 'adam')), 'forbidden');

-- Sarah signs up later: the invitation and a notification are waiting.
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}');
set role authenticated;
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select role = 'pro' from accounts where id = auth.uid()), 'account created with the pro role');
select test.ok((select count(*) = 1 from notices where kind = 'invitation'), 'invitation notice waiting');
select test.ok((select count(*) = 0 from profiles), 'no access before accepting');

-- A professional starts working only once the app's team accepted her certificate (back office).
select test.expect_error(format('select respond_invitation(%L, true)', (select v from test.ids where k = 'inv')), 'pro_not_verified');
select test.ok(true, 'a professional cannot join a team before her certificate is accepted');
insert into verifications (user_id, full_name, country, profession) values (:'sarah', 'Sarah K', 'France', 'slp');
select test.expect_error('update verifications set status = ''verified'' where user_id = auth.uid()', 'permission denied for table verifications');
select test.expect_error('select submit_verification()', 'incomplete');
update verifications set documents = format('[{"name":"diplome.pdf","kind":"diploma","ref":"%s/1-diplome.pdf"},{"name":"passeport.jpg","kind":"id","ref":"%s/2-passeport.jpg"}]', :'sarah', :'sarah')::jsonb where user_id = auth.uid();
select test.ok((select (submit_verification()).status = 'pending'), 'verification submitted');
update verifications set full_name = 'changed' where user_id = auth.uid();
select test.ok((select full_name = 'Sarah K' from verifications), 'a submitted verification is locked');
select test.expect_error(format('select admin_decide_verification(%L, ''verified'')', :'sarah'), 'forbidden');
select test.expect_error('select count(*) from admin_verifications()', 'forbidden');
select test.expect_error('select admin_overview()', 'forbidden');
select test.expect_error('select count(*) from admin_history()', 'forbidden');
select test.ok(not is_admin(), 'nobody accepts a certificate or reads the figures without being in the app''s team');

-- Zoe works for the app: she is added to the team by hand, in the database.
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'zoe', 'zoe@app.example', now(), '{"role":"parent","display_name":"Zoe"}');
insert into admins (user_id) values (:'zoe');
set role authenticated;
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok(is_admin() and (select count(*) = 0 from admins), 'the team list itself cannot be read or changed from the app');
select test.expect_error(format('insert into admins (user_id) values (%L)', :'eve'), 'new row violates row-level security policy for table "admins"');
select test.ok((select count(*) = 1 and bool_and(email = 'sarah@clinic.fr' and status = 'pending') from admin_verifications()),
  'the back office sees the requests that are waiting');
select test.expect_error(format('select admin_decide_verification(%L, ''more_info'')', :'sarah'), 'note_required');
select test.expect_error(format('select admin_open_document(%L, %L)', :'sarah', :'eve' || '/x.pdf'), 'not_found');
select test.ok((select admin_open_document(:'sarah', :'sarah' || '/1-diplome.pdf') is not null), 'a certificate is opened through the back office only');
select admin_decide_verification(:'sarah', 'more_info', 'Le diplôme est illisible.');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 1 from notices where kind = 'verification' and text like '%illisible%'), 'the professional is told what is missing');
update verifications set organization = 'Clinique' where user_id = auth.uid();
select test.ok((select (submit_verification()).status = 'pending'), 'she completes her request and sends it again');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select jsonb_array_length(documents) = 2 from admin_verifications()), 'while a request is still open, nothing is deleted');
select test.ok((select (admin_decide_verification(:'sarah', 'verified')).status = 'verified'), 'the back office accepts the certificate');
select test.ok((select jsonb_array_length(documents) = 1 and documents -> 0 ->> 'kind' = 'diploma' from admin_verifications()),
  'the identity document is forgotten as soon as the request is decided');
select test.ok((select count(*) = 3 and bool_and(admin_name = 'Zoe') from admin_history()), 'every decision and every certificate opened is written down');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 2 from notices where kind = 'verification'), 'the professional is told she was accepted');
select respond_invitation((select v::uuid from test.ids where k = 'inv'), true);
select test.ok((select count(*) = 1 from profiles), 'access after accepting');
select test.ok((select level = 2 from access_of((select v::uuid from test.ids where k = 'adam'))), 'therapist at level 2');

-- Level 2: proposals only.
select test.expect_error(format('select save_profile(%L, ''{}'', 1)', (select v from test.ids where k = 'adam')), 'forbidden');
insert into test.ids select 'prop', (create_proposal((select v::uuid from test.ids where k = 'adam'), 'Ajouter pizza', 'repas',
  '[{"path":["cell","food",0],"before":null,"after":{"concept":"pizza"}}]', 1)).id::text;
select test.expect_error(format('select set_proposal_status(%L, ''approved'', null)', (select v from test.ids where k = 'prop')), 'forbidden');

-- Rita is notified, applies it and approves; an outdated save is a conflict.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select count(*) = 1 from notices where kind = 'proposal'), 'parent notified of the proposal');
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"i"},{"concept":"want"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{}}', 1)) ->> 'ok' = 'true'),
  'parent saves the approved change');
select set_proposal_status((select v::uuid from test.ids where k = 'prop'), 'approved', null);
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'adam'), '{}', 1)) ->> 'ok' = 'false'), 'stale save returns a conflict');

-- Level 3 edits directly but never moves core vocabulary.
select update_member((select v::uuid from test.ids where k = 'adam'), :'sarah', 3, null, null, null, false);
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) >= 2 from notices where kind in ('decision', 'access')), 'therapist told of the decision and new rights');
select test.expect_error(format('select save_profile(%L, %L, 2)', (select v from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"want"},{"concept":"i"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{}}'), 'core_protected');
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"i"},{"concept":"want"}]},"food":{"cells":[{"concept":"fries"}]}},"settings":{}}', 2)) ->> 'ok' = 'true'),
  'level 3 changes a folder word directly');

-- Marc asks to connect with the family code; nothing until Rita approves; then she revokes.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into test.ids select 'code', connection_code((select v::uuid from test.ids where k = 'adam'));
select set_config('request.jwt.claim.sub', :'marc', false);
select test.ok((select request_connection('NOPE1234', 'teacher', 1, '{}', null) is null), 'a wrong family code gives nothing');
select test.expect_error(format('select request_connection(%L, ''teacher'', 1, ''{}'', null)', (select v from test.ids where k = 'code')), 'pro_not_verified');
select test.ok(true, 'a professional cannot ask a family for a connection before being accepted');
insert into verifications (user_id, full_name, country, profession, documents) values (:'marc', 'Marc T', 'Liban', 'teacher', format('[{"name":"carte.pdf","kind":"licence","ref":"%s/1-carte.pdf"}]', :'marc')::jsonb);
select submit_verification();
select set_config('request.jwt.claim.sub', :'zoe', false);
select admin_decide_verification(:'marc', 'verified');
select set_config('request.jwt.claim.sub', :'marc', false);
insert into test.ids select 'req', (request_connection(lower((select v from test.ids where k = 'code')), 'teacher', 1, '{}', 'CE1')).id::text;
select test.ok((select count(*) = 0 from profiles), 'no access while the request is pending');
select set_config('request.jwt.claim.sub', :'rita', false);
select approve_request((select v::uuid from test.ids where k = 'req'), 2, '{"createMaterials":true}');
select set_config('request.jwt.claim.sub', :'marc', false);
select test.ok((select level = 2 from access_of((select v::uuid from test.ids where k = 'adam'))), 'teacher approved at the chosen level');
select set_config('request.jwt.claim.sub', :'rita', false);
select revoke_member((select v::uuid from test.ids where k = 'adam'), :'marc');
select set_config('request.jwt.claim.sub', :'marc', false);
select test.ok((select count(*) = 0 from profiles), 'revoked teacher loses access at once');

-- A school tablet joins with a pairing code (signed in anonymously), then is revoked.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into test.ids select 'pair', code from create_pairing_code((select v::uuid from test.ids where k = 'adam'), 'use');
reset role;
insert into auth.users (id, is_anonymous) values (:'tablet', true);
set role authenticated;
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.ok((select redeem_pairing_code('000000x', 'd1', 'x', 'ios') is null), 'a wrong tablet code links nothing');
select redeem_pairing_code((select v from test.ids where k = 'pair'), 'school-1', 'Tablette école', 'ios');
select test.ok((select level = 1 and role = 'device' from access_of((select v::uuid from test.ids where k = 'adam'))), 'tablet linked with use-only access');
select test.expect_error(format('select save_profile(%L, ''{}'', 3)', (select v from test.ids where k = 'adam')), 'forbidden');
-- A nameless tablet account cannot start anything of its own.
select test.expect_error(format('insert into profiles (owner_id, name, data) values (%L, ''x'', ''{}'')', :'tablet'), 'forbidden');
select test.expect_error(format('insert into resources (owner_id, kind, title, data) values (%L, ''cards'', ''x'', ''{}'')', :'tablet'), 'forbidden');
select test.expect_error('select send_feedback(''idea'', ''hello there'')', 'forbidden');
select test.ok(true, 'a tablet cannot create a profile or a resource of its own, or write to the app''s team');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'rita', false);
select revoke_device((select v::uuid from test.ids where k = 'adam'), 'school-1');
select set_config('request.jwt.claim.sub', :'tablet', false);
select test.ok((select count(*) = 0 from profiles), 'revoked tablet loses access');

select set_config('request.jwt.claim.sub', :'sarah', false);

-- Library: private by default, visible once shared.
insert into resources (owner_id, owner_name, kind, title, data) values (:'sarah', 'Sarah', 'tla', 'Dentiste', '{}');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from resources), 'nobody else sees a private resource');
select test.ok((select count(*) = 0 from notices), 'nobody reads someone else''s notices');
select set_config('request.jwt.claim.sub', :'sarah', false);
select share_resource((select id from resources where title = 'Dentiste'), 'eve@example.com', null, 'view');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 1 from resources), 'shared resource now visible');
update resources set title = 'hacked';
select test.ok((select title = 'Dentiste' from resources), 'view-only share cannot edit');

-- Communication data: only with the family's consent, seen only by those they allow.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error(format('select save_usage_day(%L, ''ipad'', current_date - 3, ''{"selections":3}'')', (select v from test.ids where k = 'adam')), 'forbidden');
select test.expect_error('update profiles set data = jsonb_set(data, ''{settings,dataCollection}'', ''"usage"'')', 'permission denied for table profiles');
select test.ok((select (save_profile(id, jsonb_set(data, '{settings,dataCollection}', '"usage"'), version)) ->> 'ok' = 'true' from profiles
                 where id = (select v::uuid from test.ids where k = 'adam')), 'the family turns recording on (through the app''s save, not by writing the row)');
select register_device((select v::uuid from test.ids where k = 'adam'), 'ipad', 'iPad', 'companion', 'ios');
select save_usage_day((select v::uuid from test.ids where k = 'adam'), 'ipad', current_date - 3,
  '{"selections":3,"concepts":{"want":2},"samples":[{"t":1}],"stats":{"distinctConcepts":1}}');
select test.ok((select not (data ? 'concepts') and not (data ? 'samples') and data ->> 'level' = 'usage' from usage_days),
  'only what the consent allows is kept (no words at "usage")');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 0 from usage_days), 'a therapist without "see the data" sees nothing');
select test.expect_error(format('insert into observations (profile_id, created_by, at) values (%L, %L, now())', (select v from test.ids where k = 'adam'), :'sarah'),
  'new row violates row-level security policy for table "observations"');
select set_config('request.jwt.claim.sub', :'rita', false);
select update_member((select v::uuid from test.ids where k = 'adam'), :'sarah', 3, '{"createMaterials":true,"proposeVocabulary":true,"viewData":true}', 'therapist', null, false);
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 1 from usage_days), 'allowed therapist sees the data');
insert into observations (profile_id, created_by, at, function, context) values ((select v::uuid from test.ids where k = 'adam'), :'sarah', now(), 'request_help', 'repas');
select test.ok((select count(*) = 1 from observations), 'allowed therapist adds an observation');
delete from usage_days;
select test.ok((select count(*) = 1 from usage_days), 'only the family (or a manager) can erase the recorded data');
select set_config('request.jwt.claim.sub', :'rita', false);
delete from usage_days where profile_id = (select v::uuid from test.ids where k = 'adam');
select test.ok((select count(*) = 0 from usage_days), 'the family erases the recorded data');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from usage_days) and (select count(*) = 0 from observations), 'a stranger sees no data');
select test.expect_error('select count(*) from research_usage', 'permission denied for view research_usage');
select test.ok(true, 'the anonymous statistics are not reachable from the app');

-- AI helper: a daily counter per account, nobody reads it from the app.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select count_ai_call() = 1) and (select count_ai_call() = 2), 'AI calls are counted per account and per day');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count_ai_call() = 1), 'each account has its own count');
select test.ok((select count(*) = 0 from ai_calls), 'nobody reads the AI counters from the app');

-- This tablet tells which version of the app it runs.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select (register_device((select v::uuid from test.ids where k = 'adam'), 'ipad-rita', 'iPad', 'companion', 'ios', '1.2.0')).app_version = '1.2.0'),
  'a device says which version of the app it runs');

-- Messages to the app's team: anyone with an account writes, only the back office reads.
select send_feedback('idea', 'Ajouter des pictogrammes de football.', 'ios', '1.2.0');
select test.ok((select count(*) = 0 from feedback), 'messages cannot be read from the app');
select test.expect_error('select count(*) from admin_feedback()', 'forbidden');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select count(*) = 1 and bool_and(from_name = 'Rita' and status = 'new') from admin_feedback()), 'the back office reads the messages');
select admin_set_feedback((select id from admin_feedback() limit 1), 'done');
select test.ok((select bool_and(status = 'done') from admin_feedback()), 'a message is marked as dealt with');

-- An acceptance can be withdrawn: the access is suspended, and comes back if she is accepted again.
select admin_decide_verification(:'sarah', 'rejected', 'Licence expirée.');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 0 from profiles), 'a professional who is no longer accepted loses access to the children');
select set_config('request.jwt.claim.sub', :'zoe', false);
select admin_decide_verification(:'sarah', 'verified');
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 1 from profiles), 'accepted again: her access is back as it was');

-- Figures: counts for everybody; what comes from the children only with consent, and from 5 children up.
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select (o -> 'accounts' ->> 'parents')::int = 3 and (o -> 'accounts' ->> 'pros')::int = 2
                   and (o -> 'families' ->> 'children')::int = 1 and (o -> 'devices' -> 'versions' ->> '1.2.0')::int = 1
                   and (o -> 'pros' -> 'status' ->> 'verified')::int = 2 and (o -> 'ai' ->> 'calls30')::int = 3
                  from admin_overview() o), 'the back office counts accounts, children, tablets and certificates (tablets are not people)');
reset role;
update profiles set data = jsonb_set(data, '{settings,shareStats}', '"anonymous"');
insert into usage_days (profile_id, device_id, day, data) select id, 'ipad', current_date - 1,
  '{"platform":"ios · iPad","sessions":[{"activeMs":600000}],"selections":40,"utterances":10,"stats":{"distinctConcepts":12,"len1":6,"len2":3,"len3plus":1},"modes":{"core":30,"folder":10},"hours":[0,0,0,0,0,0,0,0,5,35]}'
  from profiles;
set role authenticated;
select test.ok((select (o -> 'usage' ->> 'children')::int = 1 and not (o -> 'usage' ->> 'enough')::boolean
                   and not (o -> 'usage') ? 'minutes' and not (o -> 'setup') ? 'choices'
                  from admin_overview() o), 'figures about fewer than 5 children are never shown');
reset role;
insert into profiles (owner_id, name, age, data)
select :'eve', 'Enfant ' || g, 5, '{"settings":{"shareStats":"anonymous","lang":"ar","arabic":"sa","langs":["ar","en"]},"tlaOrder":["a","b"]}'
  from generate_series(1, 4) g;
insert into usage_days (profile_id, device_id, day, data) select id, 'ipad', current_date - 1,
  '{"platform":"ios · iPad","sessions":[{"activeMs":600000}],"selections":40,"utterances":10,"stats":{"distinctConcepts":12,"len1":6,"len2":3,"len3plus":1},"modes":{"core":30,"folder":10},"hours":[0,0,0,0,0,0,0,0,5,35]}'
  from profiles where name like 'Enfant%';
-- A sixth family records its child's use but did not agree to share it.
insert into profiles (owner_id, name, age, data) values (:'eve', 'Secret', 9, '{"settings":{"dataCollection":"usage"}}');
insert into usage_days (profile_id, device_id, day, data) select id, 'ipad', current_date - 1, '{"sessions":[{"activeMs":6000000}],"selections":4000}' from profiles where name = 'Secret';
set role authenticated;
select test.ok((select (o -> 'usage' ->> 'children')::int = 5 and not (o -> 'usage' ->> 'enough')::boolean
                   and not (o -> 'usage') ? 'minutes' and not (o -> 'setup') ? 'choices'
                  from admin_overview() o), '5 children of only 2 families are not enough either');
-- Four more families, one child each: 9 children of 6 families.
reset role;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
select ('00000000-0000-0000-0000-0000000001f' || g)::uuid, 'fam' || g || '@example.com', now(), '{"role":"parent"}' from generate_series(1, 4) g;
insert into profiles (owner_id, name, age, data)
select ('00000000-0000-0000-0000-0000000001f' || g)::uuid, 'Enfant F' || g, 5,
       '{"settings":{"shareStats":"anonymous","lang":"ar","arabic":"sa","langs":["ar","en"]},"tlaOrder":["a","b"]}'
  from generate_series(1, 4) g;
insert into usage_days (profile_id, device_id, day, data) select id, 'ipad', current_date - 1,
  '{"platform":"ios · iPad","sessions":[{"activeMs":600000}],"selections":40,"utterances":10,"stats":{"distinctConcepts":12,"len1":6,"len2":3,"len3plus":1},"modes":{"core":30,"folder":10},"hours":[0,0,0,0,0,0,0,0,5,35]}'
  from profiles where name like 'Enfant F%';
-- One odd row (text where a number is expected, a sentence where a place is expected) must not break or leak.
insert into usage_days (profile_id, device_id, day, data) select id, 'other', current_date - 2,
  '{"platform":"Adam-Beyrouth x","sessions":"abc","selections":"abc","modes":{"Adam aime la pizza":5},"hours":"x"}'
  from profiles where name = 'Enfant F1';
set role authenticated;
select test.ok((select (o -> 'usage' ->> 'enough')::boolean and (o -> 'usage' ->> 'children')::int = 9
                   and (o -> 'usage' ->> 'selections')::numeric = 36
                   and (o -> 'usage' -> 'places' ->> 'core')::int = 270 and (o -> 'usage' -> 'hours' ->> 9)::int = 315
                   and (o -> 'usage' -> 'lengths' ->> 'two')::int = 27
                   and (o -> 'setup' -> 'choices' -> 'arabic' ->> 'sa')::int = 8
                   and (o -> 'setup' -> 'averages' ->> 'activityBoards')::numeric = 1.8
                  from admin_overview() o), 'from 5 children of 5 families up: averages of the families who agreed, and only theirs');
select test.ok((select not (o -> 'setup' -> 'choices' -> 'arabic') ? 'lb' and not (o -> 'usage' -> 'platforms') ? '?'
                   and (o -> 'usage' -> 'platforms' ->> 'ios')::int = 9 and not (o -> 'families' -> 'collection') ? 'usage'
                   and o::text not like '%Beyrouth%'
                  from admin_overview() o), 'a choice, a platform or a setting shared by fewer than 5 children is left out');
select test.ok((select bool_and(w ->> 'minutes' is null) from admin_overview() o, jsonb_array_elements(o -> 'usage' -> 'weeks') w
                 where (w ->> 'children')::int < 5), 'a week with fewer than 5 children shows no average');
select test.ok((select o::text not like '%Adam%' and o::text not like '%Enfant%' and o::text not like '%pizza%' from admin_overview() o),
  'no name and no word in the figures');
select test.expect_error('select count(*) from bo_child_days', 'permission denied for view bo_child_days');
select test.expect_error('select count(*) from bo_people', 'permission denied for view bo_people');
select test.ok(true, 'the lists behind the figures are not reachable from the app');

-- Deleting an account removes the child's profile it owns.
select set_config('request.jwt.claim.sub', :'rita', false);
select delete_account();
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 0 from profiles), 'owner deleted: profile gone for everyone');
reset role;
\echo SCENARIO PASSED
