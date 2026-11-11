-- Security scenario for the schema: each person only sees and changes what they may.
-- Run after auth_stub.sql and the migrations (see supabase/README.md).
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-00000000000a'
\set sarah   '00000000-0000-0000-0000-00000000000b'
\set marc    '00000000-0000-0000-0000-00000000000c'
\set eve     '00000000-0000-0000-0000-00000000000d'
\set tablet  '00000000-0000-0000-0000-00000000000e'

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
select test.expect_error('select request_connection(''NOPE1234'', ''teacher'', 1, ''{}'', null)', 'code_invalid');
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
insert into auth.users (id) values (:'tablet');
set role authenticated;
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.expect_error('select redeem_pairing_code(''000000x'', ''d1'', ''x'', ''ios'')', 'code_invalid');
select redeem_pairing_code((select v from test.ids where k = 'pair'), 'school-1', 'Tablette école', 'ios');
select test.ok((select level = 1 and role = 'device' from access_of((select v::uuid from test.ids where k = 'adam'))), 'tablet linked with use-only access');
select test.expect_error(format('select save_profile(%L, ''{}'', 3)', (select v from test.ids where k = 'adam')), 'forbidden');
-- A nameless tablet account cannot start anything of its own.
select test.expect_error(format('insert into profiles (owner_id, name, data) values (%L, ''x'', ''{}'')', :'tablet'), 'forbidden');
select test.expect_error(format('insert into resources (owner_id, kind, title, data) values (%L, ''cards'', ''x'', ''{}'')', :'tablet'), 'forbidden');
select test.ok(true, 'a tablet cannot create a profile or a resource of its own');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'rita', false);
select revoke_device((select v::uuid from test.ids where k = 'adam'), 'school-1');
select set_config('request.jwt.claim.sub', :'tablet', false);
select test.ok((select count(*) = 0 from profiles), 'revoked tablet loses access');

-- Professional verification: only a draft can be edited; the status is set by the back-office.
select set_config('request.jwt.claim.sub', :'sarah', false);
insert into verifications (user_id, full_name, country, profession) values (:'sarah', 'Sarah K', 'France', 'slp');
select test.expect_error('update verifications set status = ''verified'' where user_id = auth.uid()', 'new row violates row-level security policy for table "verifications"');
select test.expect_error('select submit_verification()', 'incomplete');
update verifications set documents = '[{"name":"diplome.pdf"}]' where user_id = auth.uid();
select test.ok((select (submit_verification()).status = 'pending'), 'verification submitted');
update verifications set full_name = 'changed' where user_id = auth.uid();
select test.ok((select full_name = 'Sarah K' from verifications), 'a submitted verification is locked');

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
select test.expect_error(format('select save_usage_day(%L, ''ipad'', ''2026-11-11'', ''{"selections":3}'')', (select v from test.ids where k = 'adam')), 'forbidden');
update profiles set data = jsonb_set(data, '{settings,dataCollection}', '"usage"') where id = (select v::uuid from test.ids where k = 'adam');
select save_usage_day((select v::uuid from test.ids where k = 'adam'), 'ipad', '2026-11-11',
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

-- Deleting an account removes the child's profile it owns.
select set_config('request.jwt.claim.sub', :'rita', false);
select delete_account();
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select count(*) = 0 from profiles), 'owner deleted: profile gone for everyone');
reset role;
\echo SCENARIO PASSED
