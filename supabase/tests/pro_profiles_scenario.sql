-- A professional prepares a child's profile; the family connects later and becomes the owner.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set sarah   '00000000-0000-0000-0000-0000000000c1'
\set marc    '00000000-0000-0000-0000-0000000000c2'
\set eve     '00000000-0000-0000-0000-0000000000c3'
\set rita    '00000000-0000-0000-0000-0000000000c4'
\set tablet  '00000000-0000-0000-0000-0000000000c5'

truncate test.ids;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}');
insert into auth.users (id, is_anonymous) values (:'tablet', true);
insert into verifications (user_id, full_name, country, profession, status) values (:'sarah', 'Sarah K', 'France', 'slp', 'verified');
update accounts set prefs = '{"uiLang":"en"}' where id = :'sarah';
set role authenticated;

-- 1. Only a professional whose certificate was accepted creates a profile.
select set_config('request.jwt.claim.sub', :'marc', false);
select test.expect_error(format('insert into profiles (owner_id, name, data) values (%L, ''Adam'', ''{"settings":{}}'')', :'marc'), 'pro_not_verified');
select test.ok(true, 'a professional who is not verified cannot create a child''s profile');

-- 2. An accepted professional can; recording and sharing start off whatever was sent.
select set_config('request.jwt.claim.sub', :'sarah', false);
with created as (
  insert into profiles (owner_id, name, age, data) values (:'sarah', 'Adam', 6,
    '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"language","shareStats":"anonymous","pin":"1234"}}')
  returning id)
insert into test.ids select 'adam', id::text from created;
select test.ok((select data -> 'settings' ->> 'dataCollection' = 'off' and data -> 'settings' ->> 'shareStats' = 'none' from profiles),
  'a profile created by a professional starts with recording and sharing off');
select test.ok((select count(*) = 1 from list_profiles() where access = 'owner'), 'the professional sees the profile she created');

-- 3. She edits everything, except what is recorded and what is shared.
select test.expect_error(format('select save_profile(%L, %L, 1)', (select v from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"1234"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 1)', (select v from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"off","shareStats":"anonymous","pin":"1234"}}'), 'consent_protected');
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"want"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{"dataCollection":"off","shareStats":"none","pin":"4821"}}', 1)) ->> 'ok' = 'true'),
  'she prepares the board (main board and caregiver code included); recording and sharing wait for the family');

-- 4. An invitation that is not the one for the parents does not give the profile away.
insert into test.ids select 'helper', (invite((select v::uuid from test.ids where k = 'adam'), null, 'Rita', 'family', 1, '{}')).code;
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select (accept_invitation_code((select v from test.ids where k = 'helper'))).status = 'accepted'), 'someone invited as family joins');
select test.ok((select count(*) = 1 from list_profiles() where access = 'family'), 'she is on the team, nothing more');
select test.expect_error(format('select invite(%L, null, ''x'', ''parent'', 3, ''{"manager":true}'')', (select v from test.ids where k = 'adam')), 'forbidden');
select test.ok(true, 'a team member cannot write the invitation that hands the profile over');

-- 5. The parents connect with the code made for them: they become the owner, she stays on the team.
select set_config('request.jwt.claim.sub', :'sarah', false);
insert into test.ids select 'forparents', (invite((select v::uuid from test.ids where k = 'adam'), null, null, 'parent', 3,
  '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true,"viewData":true}')).code;
-- Another professional typing the code joins as a co-parent would; the profile is not handed to a professional.
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select (accept_invitation_code((select v from test.ids where k = 'forparents'))).status = 'accepted'), 'the parent types the code');
select test.ok((select count(*) = 1 from list_profiles() where access = 'owner'), 'the parent who typed the code is now the owner');
reset role;
select test.ok((select owner_id = :'eve' from profiles), 'the profile belongs to the family');
select test.ok((select count(*) = 0 from members where user_id = :'eve'), 'the owner is not listed as a mere member');
select test.ok((select data -> 'settings' ->> 'pin' = '1234' and version = 3 from profiles), 'the caregiver code chosen by the professional is forgotten: the family will choose its own');
set role authenticated;
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.ok((select not owner and role = 'therapist' and level = 3 and not (perms ->> 'manager')::boolean and not (perms ->> 'viewData')::boolean
                  from access_of((select v::uuid from test.ids where k = 'adam'))),
  'the professional stays on the team: she edits directly, is not a parent, and does not see the progress data');
select test.ok((select count(*) = 1 from notices where kind = 'access' and text like 'Eve is now the parent in charge of Adam%'), 'she is told, in her menu language');
select test.expect_error(format('select save_profile(%L, %L, 3)', (select v from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"want"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"1234"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 3)', (select v from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"want"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{"dataCollection":"off","shareStats":"none","pin":"4821"}}'), 'consent_protected');
delete from profiles;
select test.ok((select count(*) = 1 from profiles), 'she can no longer delete the profile: it is the family''s');

-- 6. The family now decides what is recorded.
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select (save_profile((select v::uuid from test.ids where k = 'adam'),
  '{"boards":{"core":{"cells":[{"concept":"want"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"7306"}}', 3)) ->> 'ok' = 'true'),
  'after the hand-over, recording and the caregiver code are the family''s choices');

-- 7. A professional who is no longer accepted loses the profiles she created too (until accepted again).
select set_config('request.jwt.claim.sub', :'sarah', false);
with created as (insert into profiles (owner_id, name, data) values (:'sarah', 'Lina', '{"settings":{}}') returning id)
insert into test.ids select 'lina', id::text from created;
reset role;
update verifications set status = 'rejected' where user_id = :'sarah';
set role authenticated;
select test.ok((select count(*) = 0 from list_profiles()), 'a professional who is no longer accepted sees no child, not even the ones she created');
select test.expect_error(format('select save_profile(%L, ''{"settings":{}}'', 1)', (select v from test.ids where k = 'lina')), 'forbidden');
-- …and not by the direct door either: no reading, renaming or deleting the row.
select test.ok((select count(*) = 0 from profiles where name = 'Lina'), 'she cannot read the profile directly');
update profiles set name = 'Changed' where name = 'Lina';
delete from profiles where id = (select v::uuid from test.ids where k = 'lina');
reset role;
select test.ok((select count(*) = 1 from profiles where name = 'Lina'), 'nor rename or delete it while she is not accepted');
-- Accepted again: the profile is back, as it was.
update verifications set status = 'verified' where user_id = :'sarah';
set role authenticated;
select test.ok((select count(*) = 1 from list_profiles() where name = 'Lina' and access = 'owner'), 'accepted again, she finds the profile she created');
select test.ok((select count(*) = 1 from profiles where name = 'Lina'), 'and reads it');
reset role;
\echo PRO PROFILES SCENARIO PASSED
