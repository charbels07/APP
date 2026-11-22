-- Gap review of November 2026, batch 3: each hole, tried again as the person who would use it.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set sarah  '00000000-0000-0000-0000-0000000003a1'
\set marc   '00000000-0000-0000-0000-0000000003a2'
\set eve    '00000000-0000-0000-0000-0000000003a3'
\set nadia  '00000000-0000-0000-0000-0000000003a4'
\set tina   '00000000-0000-0000-0000-0000000003a5'
\set noname '00000000-0000-0000-0000-0000000003a6'
\set rita   '00000000-0000-0000-0000-0000000003a7'
\set tab1   '00000000-0000-0000-0000-0000000003b1'
\set tab2   '00000000-0000-0000-0000-0000000003b2'

truncate test.ids;
delete from rate_log;
delete from error_counts;
delete from ai_calls;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'nadia', 'nadia@example.com', now(), '{"role":"parent","display_name":"Nadia"}'),
  (:'tina', 'tina@example.com', now(), '{"role":"parent","display_name":"Tina"}'),
  (:'noname', 'nameless@example.com', now(), '{"role":"parent"}'),
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}');
insert into auth.users (id, is_anonymous) values (:'tab1', true), (:'tab2', true);
insert into verifications (user_id, full_name, country, profession, status) values
  (:'sarah', 'Sarah K', 'France', 'slp', 'verified'), (:'marc', 'Marc H', 'Lebanon', 'teacher', 'verified');
insert into admins (user_id) values (:'rita');
grant usage on schema test to anon;

-- Who is asking: a person (signed in just now), or a child's tablet linked with a code.
create or replace function test.as_person(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{}', false);
$$;
create or replace function test.as_tablet(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{"is_anonymous":true}', false);
$$;
grant execute on all functions in schema test to authenticated;
set role authenticated;

-- ───────── 1. While a professional owns the profile: no recording, no sharing, whoever asks ─────────
select test.as_person(:'sarah');
with created as (
  insert into profiles (owner_id, name, age, data) values (:'sarah', 'Adam', 6,
    '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"pin":"1234"}}')
  returning id)
insert into test.ids select 'adam', id::text from created;
select v as adam from test.ids where k = 'adam' \gset
insert into test.ids select 'full1', code from create_pairing_code(:'adam', 'full');
select test.as_tablet(:'tab1');
select test.ok((select redeem_pairing_code((select v from test.ids where k = 'full1'), 'tab1dev', 'Tablette', 'ios') = :'adam'), 'she links a tablet with full access to the profile she prepares');
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"pin":"1234","dataCollection":"language"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"pin":"1234","shareStats":"anonymous"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"pin":"1234","shareTerms":3}}'), 'consent_protected');
select test.ok(true, 'that tablet cannot turn recording or sharing on, nor agree to what is shared');
select test.expect_error(format('select save_usage_day(%L, ''tab1dev'', current_date, ''{"selections":3}'')', :'adam'), 'forbidden');
select test.expect_error(format('select save_feature_day(%L, ''tab1dev'', current_date, ''{"board":1}'')', :'adam'), 'forbidden');
reset role;
-- Even a row written from somewhere else (an older app, a mistake in a later function) is corrected.
update profiles set data = jsonb_set(jsonb_set(data, '{settings,dataCollection}', '"language"'), '{settings,shareStats}', '"anonymous"') where id = :'adam';
select test.ok((select data -> 'settings' ->> 'dataCollection' = 'off' and data -> 'settings' ->> 'shareStats' = 'none' from profiles where id = :'adam'),
  'recording and sharing stay off while a professional owns the profile, however the row is written');
select test.ok((select count(*) = 0 from usage_days) and (select count(*) = 0 from feature_days) and (select count(*) = 0 from consents),
  'nothing was stored about the child, and no consent was needed for nothing');
set role authenticated;

-- ───────── 2. The parents take the profile over: a team they know ─────────
select test.as_person(:'sarah');
insert into test.ids select 'marc', (invite(:'adam', null, 'Marc', 'teacher', 3,
  '{"createMaterials":true,"proposeVocabulary":true,"changeAccess":true,"invite":true,"manageDevices":true,"manager":true,"viewData":true}')).code;
select test.as_person(:'marc');
select test.ok((select (accept_invitation_code((select v from test.ids where k = 'marc'))).status = 'accepted'), 'the professional gives a colleague every right on the profile');
select test.as_person(:'sarah');
insert into test.ids select 'waiting', (invite(:'adam', 'nadia@example.com', 'Nadia', 'family', 3, '{"manager":true}')).code;
insert into test.ids select 'use1', code from create_pairing_code(:'adam', 'use');
insert into test.ids select 'forparents', (invite(:'adam', null, null, 'parent', 3, '{"manager":true}')).code;
select test.as_person(:'eve');
select give_consent('child_data', 1);
select test.ok((select (accept_invitation_code((select v from test.ids where k = 'forparents'))).status = 'accepted'), 'the parent types the code made for the parents');
reset role;
select test.ok((select owner_id = :'eve' from profiles where id = :'adam'), 'the profile is the family''s');
select test.ok((select count(*) = 0 from pairing_codes where profile_id = :'adam'), 'a code to link a tablet that was still waiting is gone');
select test.ok((select count(*) = 0 from invitations where profile_id = :'adam' and status = 'pending'), 'invitations still waiting are cancelled');
select test.ok((select status = 'revoked' from members where profile_id = :'adam' and user_id = :'tab1')
           and (select revoked from devices where profile_id = :'adam' and id = 'tab1dev'), 'the tablet the professional linked is unlinked');
select test.ok((select bool_and(not (perms ->> 'manager')::boolean and not (perms ->> 'changeAccess')::boolean and not (perms ->> 'invite')::boolean
                                and not (perms ->> 'manageDevices')::boolean and not (perms ->> 'viewData')::boolean) and count(*) = 2
                  from members where profile_id = :'adam' and status = 'active'), 'nobody on the team keeps a right that is the family''s');
select test.ok((select count(*) = 1 from notices where user_id = :'eve'
                   and text = 'Vous êtes maintenant le parent responsable du profil de Adam. Dans son équipe : Marc, Sarah. Vous décidez de leurs droits dans Réglages → Équipe.'),
  'the parent is told who is on the team');
set role authenticated;
select test.as_tablet(:'tab1');
select test.ok((select count(*) = 0 from read_profile(:'adam')), 'the unlinked tablet no longer reads the board');
select test.as_person(:'nadia');
select test.ok((select accept_invitation_code((select v from test.ids where k = 'waiting')) is null), 'the invitation written before the hand-over no longer opens anything');
select test.as_person(:'marc');
select test.expect_error(format('select revoke_member(%L, %L)', :'adam', :'sarah'), 'forbidden');
select test.expect_error(format('select count(*) from usage_of(%L, current_date - 30)', :'adam'), 'forbidden');
select test.ok(true, 'the colleague no longer runs the team nor reads the follow-up');

-- ───────── 3. The family's caregiver code is not sent to professionals ─────────
select test.as_person(:'eve');
select test.ok((select (save_profile(:'adam', jsonb_set(data, '{settings,pin}', '"4821"'), version)) ->> 'ok' = 'true' from read_profile(:'adam')), 'the family chooses its code');
select test.ok((select data -> 'settings' ->> 'pin' = '4821' from read_profile(:'adam')), 'the family reads its own code');
select invite(:'adam', 'nadia@example.com', null, 'family', 1, '{}');
select invite(:'adam', 'tina@example.com', null, 'teacher', 1, '{}');
insert into test.ids select 'use2', code from create_pairing_code(:'adam', 'use');
select test.as_person(:'nadia');
select respond_invitation((select id from invitations where profile_id = :'adam' and status = 'pending'), true);
select test.ok((select data -> 'settings' ->> 'pin' = '4821' from read_profile(:'adam')), 'a member of the family receives the code (the keypad on her phone needs it)');
select test.as_tablet(:'tab2');
select redeem_pairing_code((select v from test.ids where k = 'use2'), 'tab2dev', 'Tablette salon', 'android');
select test.ok((select data -> 'settings' ->> 'pin' = '4821' from read_profile(:'adam')), 'the child''s tablet receives it too');
select test.as_person(:'tina');
select respond_invitation((select id from invitations where profile_id = :'adam' and status = 'pending'), true);
select test.ok((select not (data -> 'settings') ? 'pin' and data -> 'boards' ? 'core' from read_profile(:'adam')), 'a teacher on the team receives the board without the code');
select test.as_person(:'sarah');
select test.ok((select not (data -> 'settings') ? 'pin' from read_profile(:'adam')), 'a professional receives the board without the code');
select test.expect_error('select data from profiles', 'permission denied for table profiles');
select test.ok((select count(*) = 1 from profiles), 'the direct door gives the name and the version, never the content');
select test.ok((select (save_profile(:'adam', jsonb_set(jsonb_set(data, '{settings,pin}', '"0000"'), '{boards,food,cells}', '[{"concept":"pizza"}]'), version)) ->> 'ok' = 'true'
                  from read_profile(:'adam')), 'she edits the board');
select test.ok((select not ((save_profile(:'adam', '{"settings":{}}', 1)) -> 'conflict' -> 'data' -> 'settings') ? 'pin'), 'a save that comes too late gets the newer board back, without the code');
select test.expect_error(format('select save_profile(%L, jsonb_set(data, ''{settings}'', ''"x"''), version) from read_profile(%L)', :'adam', :'adam'), 'invalid');
select test.expect_error(format('select save_profile(%L, data - ''settings'', version) from read_profile(%L)', :'adam', :'adam'), 'invalid');
select test.expect_error(format('select create_pairing_code(%L, ''use'')', :'adam'), 'forbidden');
select test.ok(true, 'she cannot wipe the settings (and the code with them), nor link a tablet that would receive the code');
reset role;
select test.ok((select data -> 'settings' ->> 'pin' = '4821' and data -> 'boards' -> 'food' -> 'cells' -> 0 ->> 'concept' = 'pizza' from profiles where id = :'adam'),
  'the code she sent changed nothing; her word is on the board');
-- The file "Download all my data" of a professional: the profiles she created, never a code; and
-- nothing about the children once her acceptance was withdrawn.
insert into profiles (owner_id, name, data) values (:'sarah', 'Lina', '{"settings":{"pin":"9173"}}');
set role authenticated;
select test.ok((select jsonb_array_length(x -> 'children') = 1 and not (x -> 'children' -> 0 -> 'data' -> 'settings') ? 'pin' from export_my_data() x),
  'her file holds the profile she created, without a code');
reset role;
update verifications set status = 'rejected' where user_id = :'sarah';
set role authenticated;
select test.ok((select jsonb_array_length(x -> 'children') = 0 and jsonb_array_length(x -> 'boardCopies') = 0 and x -> 'account' ->> 'email' = 'sarah@clinic.fr'
                  from export_my_data() x), 'acceptance withdrawn: her file is her account, no child''s profile');
reset role;
update verifications set status = 'verified' where user_id = :'sarah';
delete from profiles where name = 'Lina';
set role authenticated;

-- ───────── 4. Someone removed does not come back ─────────
select test.as_person(:'eve');
select update_member(:'adam', :'marc', 3, '{"createMaterials":true,"proposeVocabulary":true,"invite":true}', null, null, false);
-- (an invitation the family had sent him twice is still waiting)
select invite(:'adam', 'marc@school.lb', null, 'teacher', 3, '{}');
select test.as_person(:'marc');
select test.expect_error(format('select invite(%L, null, ''x'', ''parent'', 3, ''{"manager":true}'')', :'adam'), 'forbidden');
select test.expect_error(format('select invite(%L, null, ''x'', ''device'', 3, ''{"manager":true}'')', :'adam'), 'invalid');
select test.ok(true, 'a member who may invite invites team members: not a parent, not a tablet');
select test.expect_error(format('select invite(%L, null, ''An aunt'', ''family'', 1, ''{}'')', :'adam'), 'forbidden');
select test.ok(true, 'a professional invites colleagues only (a "family member" she invites would receive the family''s code)');
insert into test.ids select 'friend', (invite(:'adam', null, 'A friend', 'teacher', 3, '{}')).code;
insert into test.ids select 'self', (invite(:'adam', 'marc@school.lb', null, 'teacher', 3, '{}')).id::text;
select test.expect_error(format('select respond_invitation(%L, true)', (select v from test.ids where k = 'self')), 'forbidden');
select test.ok(true, 'nobody answers an invitation they wrote themselves');
select test.as_person(:'eve');
select revoke_member(:'adam', :'marc');
reset role;
select test.ok((select count(*) = 0 from invitations where profile_id = :'adam' and status = 'pending'), 'removed: the invitations he wrote, and the ones waiting for him, are cancelled');
set role authenticated;
select test.as_person(:'marc');
select test.expect_error(format('select respond_invitation(%L, true)', (select id from invitations where email = 'marc@school.lb' and from_user_id = :'eve')), 'not_found');
select test.as_person(:'noname');
select test.ok((select accept_invitation_code((select v from test.ids where k = 'friend')) is null), 'his friend''s code opens nothing');
select test.as_person(:'marc');
select test.ok((select count(*) = 0 from read_profile(:'adam')), 'he stays out');
-- Removed through "cancel the invitation" (the other way out): the same clean-up.
select test.as_person(:'eve');
insert into test.ids select 'tina2', (invite(:'adam', 'tina@example.com', null, 'teacher', 1, '{}')).id::text;
select cancel_invitation((select id from invitations where profile_id = :'adam' and status = 'accepted' and to_user_id = :'tina'));
select test.as_person(:'tina');
select test.expect_error(format('select respond_invitation(%L, true)', (select v from test.ids where k = 'tina2')), 'not_found');
select test.ok((select count(*) = 0 from read_profile(:'adam')), 'removed by cancelling her invitation: an invitation that was waiting for her is cancelled too');
-- An access with an end date is not made longer by answering an invitation that was already there.
select test.as_person(:'eve');
select invite(:'adam', 'nadia@example.com', null, 'family', 1, '{}');
select update_member(:'adam', :'nadia', null, null, null, now() + interval '7 days', true);
select test.as_person(:'nadia');
select respond_invitation((select id from invitations where profile_id = :'adam' and status = 'pending' and to_user_id = :'nadia'), true);
reset role;
select test.ok((select expires_at is not null and status = 'active' from members where profile_id = :'adam' and user_id = :'nadia'), 'an access with an end date keeps it');
set role authenticated;
-- A tablet joins with a tablet's code only; a request never asks to be a parent or a tablet.
select test.as_person(:'eve');
insert into test.ids select 'forperson', (invite(:'adam', null, 'Someone', 'family', 3, '{"manager":true}')).code;
select test.as_tablet(:'tab2');
select test.expect_error(format('select accept_invitation_code(%L)', (select v from test.ids where k = 'forperson')), 'forbidden');
select test.as_person(:'eve');
insert into test.ids select 'family_code', connection_code(:'adam');
select cancel_invitation((select id from invitations where profile_id = :'adam' and status = 'pending'));
select test.as_person(:'noname');
select test.expect_error(format('select request_connection(%L, ''parent'', 3, ''{}'', null)', (select v from test.ids where k = 'family_code')), 'invalid');
select test.expect_error(format('select request_connection(%L, ''device'', 3, ''{}'', null)', (select v from test.ids where k = 'family_code')), 'invalid');
insert into test.ids select 'request', (request_connection((select v from test.ids where k = 'family_code'), 'caregiver', 1, '{}', null)).id::text;
select test.ok(true, 'a person asks to join as a member of the team, nothing else');

-- ───────── 5. A tablet linked with full access: what its screens show, nothing more ─────────
select test.as_person(:'eve');
insert into test.ids select 'full2', code from create_pairing_code(:'adam', 'full');
select register_device(:'adam', 'evephone', 'iPhone', 'companion', 'ios', '1.0.0');
select (save_profile(:'adam', jsonb_set(data, '{settings,dataCollection}', '"language"'), version)) from read_profile(:'adam');
select save_usage_day(:'adam', 'evephone', current_date - 1, '{"selections":7,"samples":[{"t":1,"text":"veux gâteau"}]}');
-- A full-access code typed from a person's account (a team member who got hold of it) links nothing.
select test.as_person(:'nadia');
select test.expect_error(format('select redeem_pairing_code(%L, ''nadiaphone'', ''x'', ''ios'')', (select v from test.ids where k = 'full2')), 'forbidden');
select test.ok((select not manages_team(:'adam')), 'a tablet''s code typed from a person''s account gives nothing');
select test.as_tablet(:'tab1');
select redeem_pairing_code((select v from test.ids where k = 'full2'), 'tab1dev', 'Tablette', 'ios');
select test.ok((select is_manager(:'adam') and not manages_team(:'adam')), 'linked with full access by the family');
select test.ok((select (save_profile(:'adam', jsonb_set(data, '{settings,lang}', '"fr"'), version)) ->> 'ok' = 'true' from read_profile(:'adam')), 'it changes the board and its settings');
select test.ok((select count(*) = 1 from create_pairing_code(:'adam', 'use')), 'it makes a "use only" code for another tablet');
select test.expect_error(format('select create_pairing_code(%L, ''full'')', :'adam'), 'forbidden');
select test.expect_error(format('select revoke_member(%L, %L)', :'adam', :'nadia'), 'forbidden');
select test.expect_error(format('select update_member(%L, %L, 3, ''{"manager":true}'', null, null, false)', :'adam', :'nadia'), 'forbidden');
select test.expect_error(format('select approve_request(%L, 3, ''{}'')', (select v from test.ids where k = 'request')), 'forbidden');
select test.expect_error(format('select respond_invitation(%L, false)', (select v from test.ids where k = 'request')), 'forbidden');
select test.expect_error(format('select connection_code(%L)', :'adam'), 'forbidden');
select test.expect_error(format('select invite(%L, null, ''x'', ''family'', 3, ''{}'')', :'adam'), 'forbidden');
select test.expect_error(format('select count(*) from usage_of(%L, current_date - 30)', :'adam'), 'forbidden');
select test.expect_error(format('select count(*) from list_observations(%L)', :'adam'), 'forbidden');
select test.expect_error(format('select save_profile(%L, %L, %s)', :'adam',
  (select jsonb_set(data, '{settings,dataCollection}', '"off"') from read_profile(:'adam')), (select version from read_profile(:'adam'))), 'consent_protected');
delete from usage_days;
select test.ok((select count(*) = 0 from invitations) and (select bool_and(email is null) from list_members(:'adam') where user_id <> :'tab1'),
  'it reads neither the invitations nor the team''s addresses');
select test.expect_error(format('select revoke_device(%L, ''evephone'')', :'adam'), 'forbidden');
-- It cannot make the parent's phone "its own" to get round the two rules above.
select register_device(:'adam', 'evephone', 'x', 'primary', 'ios', '1');
select test.expect_error(format('select save_usage_day(%L, ''evephone'', current_date - 1, ''{}'')', :'adam'), 'forbidden');
select test.expect_error(format('select revoke_device(%L, ''evephone'')', :'adam'), 'forbidden');
select test.ok((select revoke_device(:'adam', 'tab2dev') is not null), 'it removes another tablet, never a person''s own phone');
reset role;
select test.ok((select count(*) = 1 from usage_days), 'it does not erase the follow-up');
select test.ok((select count(*) = 1 from pairing_codes where profile_id = :'adam' and created_by = :'tab1'), '(its code for another tablet is waiting)');
set role authenticated;
select test.as_person(:'eve');
select revoke_device(:'adam', 'tab1dev');
reset role;
select test.ok((select count(*) = 0 from pairing_codes where profile_id = :'adam'), 'a tablet that is removed takes the codes it made with it');
set role authenticated;

-- ───────── 6. Follow-up: whose day, who reads, what is sealed ─────────
select test.as_person(:'nadia');
select register_device(:'adam', 'nadiaphone', 'iPhone', 'companion', 'ios', '1.0.0');
select test.expect_error(format('select save_usage_day(%L, ''evephone'', current_date - 1, ''{"selections":0}'')', :'adam'), 'forbidden');
select save_usage_day(:'adam', 'nadiaphone', current_date - 1, '{"selections":2,"deviceId":"evephone","day":"2020-01-01"}');
select test.expect_error(format('select count(*) from usage_of(%L, current_date - 30)', :'adam'), 'forbidden');
select test.expect_error(format('select count(*) from list_observations(%L)', :'adam'), 'forbidden');
select test.ok(true, 'without "see the progress data" the answer is "no", not empty charts');
select test.as_person(:'eve');
select test.ok((select count(*) = 2 and sum((d ->> 'selections')::int) = 9
                   and bool_or(d ->> 'deviceId' = 'evephone' and d ->> 'selections' = '7' and d -> 'samples' -> 0 ->> 'text' = 'veux gâteau')
                   and bool_or(d ->> 'deviceId' = 'nadiaphone' and d ->> 'day' = to_char(current_date - 1, 'YYYY-MM-DD'))
                  from usage_of(:'adam', current_date - 30) d),
  'a member cannot write over the day of another device, nor sign a day with another device''s name');
select update_member(:'adam', :'nadia', 1, '{"viewData":true}', null, null, false);
insert into observations (profile_id, created_by, at, utterance, context, partner, result, note)
  values (:'adam', :'eve', now(), 'veux gâteau', 'à table', 'maman', 'compris', 'a insisté');
select test.as_person(:'nadia');
insert into observations (profile_id, created_by, at, utterance, context) values (:'adam', :'nadia', now() - interval '1 hour', 'encore', 'au parc');
update observations set function = 'request';
delete from observations where created_by = :'eve';
reset role;
select test.ok((select count(*) = 2 and bool_and(context is null and partner is null and result is null and context_sealed is not null) from observations),
  'the situation, the partner and the result are sealed like the child''s words');
select test.ok((select function is null from observations where created_by = :'eve'), 'a member changes or deletes her own observations only');
set role authenticated;
select test.as_person(:'eve');
select test.ok((select count(*) = 2 and bool_or(context = 'à table' and partner = 'maman' and result = 'compris' and note = 'a insisté' and utterance = 'veux gâteau')
                  from list_observations(:'adam')), 'the family reads them back');
select test.expect_error(format('update observations set profile_id = %L', :'adam'), 'permission denied for table observations');
select test.ok(true, 'an observation cannot be moved to another child');
-- A member's own file: her observations with the child's words while she may read the follow-up; none once removed.
select test.as_person(:'nadia');
select test.ok((select jsonb_array_length(x -> 'observations') = 1 and x -> 'observations' -> 0 ->> 'utterance' = 'encore' from export_my_data() x), 'her file holds what she wrote');
select test.as_person(:'eve');
select revoke_member(:'adam', :'nadia');
select test.as_person(:'nadia');
select test.ok((select jsonb_array_length(x -> 'observations') = 0 and x::text not like '%encore%' and x::text not like '%au parc%' from export_my_data() x),
  'removed from the team: her file no longer holds what the child said');

-- ───────── 7. Figures for the app's team ─────────
select test.as_person(:'eve');
select (save_profile(:'adam', jsonb_set(jsonb_set(data, '{settings,shareStats}', '"anonymous"'), '{settings,shareTerms}', '3'), version)) from read_profile(:'adam');
select save_feature_day(:'adam', 'evephone', current_date, '{"board":1,"seen:board":1}');
select invite(:'adam', 'rita@example.com', null, 'family', 1, '{}');
select invite(:'adam', 'sarah@clinic.fr', null, 'therapist', 1, '{}');
select test.as_person(:'sarah');
select respond_invitation((select id from invitations where profile_id = :'adam' and status = 'pending' and to_user_id = :'sarah'), true);
select register_device(:'adam', 'sarahphone', 'iPhone', 'companion', 'ios', '1.0.0');
select test.expect_error(format('select save_feature_day(%L, ''sarahphone'', current_date, ''{"board":1}'')', :'adam'), 'forbidden');
select test.expect_error(format('select report_problems(%L, ''[{"kind":"crash","name":"Error"}]'')', :'adam'), 'forbidden');
-- A member of the app's team who has not typed the two-step code is still a member of the app's team.
select test.as_person(:'rita');
select respond_invitation((select id from invitations where profile_id = :'adam' and status = 'pending' and to_user_id = :'rita'), true);
select register_device(:'adam', 'ritaphone', 'iPhone', 'companion', 'ios', '1.0.0');
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select test.expect_error(format('select save_feature_day(%L, ''ritaphone'', current_date, ''{"board":1}'')', :'adam'), 'forbidden');
select test.expect_error(format('select report_problems(%L, ''[{"kind":"crash","name":"Error"}]'')', :'adam'), 'forbidden');
reset role;
select test.ok((select count(*) = 1 from feature_days) and (select count(*) = 0 from error_counts), 'a professional''s or the team''s own use is not counted, whatever the sign-in');
set role authenticated;
select test.as_person(:'rita');
select test.ok((select p -> 'agreed' = 'null' and p -> 'children' = 'null' and not (p ->> 'enough')::boolean from admin_product() p),
  'one family agreed: the back office does not say "1"');
select test.ok((select o -> 'families' -> 'sharing' = 'null' and o -> 'teamwork' -> 'changes30' is not null and (o -> 'families' ->> 'children')::int = 1
                  from admin_overview() o), 'nor how many share; the number of profiles stays');

-- ───────── 8. Names, devices, documents, ceilings ─────────
select test.as_person(:'noname');
select test.ok((select my_name() = '—'), 'a person without a name is not shown by their address');
select test.as_person(:'eve');
select approve_request((select v::uuid from test.ids where k = 'request'), 1, '{}');
reset role;
select test.ok((select display_name = '—' from members where user_id = :'noname')
           and (select count(*) = 0 from notices where text like '%@%') and (select count(*) = 0 from invitations where from_name like '%@%'),
  'no address in the team''s list, in a notice or on an invitation');
select test.ok((select name = 'Tablette salon' and kind = 'secondary' from devices where id = 'tab2dev'), '(the tablet was named when it was linked)');
update devices set revoked = false where id = 'tab2dev';
update members set status = 'active' where user_id = :'tab2';
set role authenticated;
select test.as_tablet(:'tab2');
select test.ok((select name = 'Tablette salon' and kind = 'secondary' and app_version = '1.4.0' from register_device(:'adam', 'tab2dev', 'Android', 'companion', 'android', '1.4.0')),
  'a tablet that opens the board keeps its name and its kind');
-- Two-step sign-in covers a professional's own documents.
reset role;
insert into storage.objects (bucket_id, name, owner) values ('verification-docs', :'sarah' || '/1-diplome.pdf', :'sarah');
insert into auth.mfa_factors (user_id, status) values (:'sarah', 'verified');
set role authenticated;
select test.as_person(:'sarah');
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select test.ok((select count(*) = 0 from storage.objects where bucket_id = 'verification-docs'), 'two-step on, code not typed: her documents are not shown');
select test.expect_error(format('insert into storage.objects (bucket_id, name) values (''verification-docs'', %L)', :'sarah' || '/2-id.pdf'),
  'new row violates row-level security policy for table "objects"');
delete from storage.objects where bucket_id = 'verification-docs';
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select test.ok((select count(*) = 1 from storage.objects where bucket_id = 'verification-docs'), 'code typed: they are there, and nothing was deleted meanwhile');
-- Ceilings.
select test.expect_error(format('update accounts set prefs = jsonb_build_object(''x'', repeat(md5(random()::text), 2000)) where id = %L', :'sarah'), 'too_large');
update accounts set display_name = repeat('a', 300) where id = :'sarah';
select test.ok((select length(display_name) = 80 from accounts where id = :'sarah'), 'an account''s name and preferences have a size');
update accounts set display_name = 'Sarah' where id = :'sarah';
insert into resources (owner_id, kind, title, data) values (:'sarah', 'cards', 'Dentiste', '{}');
reset role;
insert into profiles (owner_id, name, data) values (:'tina', 'Other child', '{"settings":{}}');
select id as other from profiles where name = 'Other child' \gset
set role authenticated;
select test.expect_error(format('update resources set profile_id = %L', :'other'), 'forbidden');
select test.expect_error(format('insert into resources (owner_id, kind, title, data, profile_id) values (%L, ''cards'', ''x'', ''{}'', %L)', :'sarah', :'other'), 'forbidden');
update resources set profile_id = :'adam';
select test.ok((select profile_id = :'adam' from resources), 'a material is tied to a child of one''s own teams only');
reset role;
insert into resources (owner_id, kind, title, data) select :'sarah', 'cards', 'm' || g, '{}' from generate_series(1, 499) g;
insert into rate_log (user_id, kind) select :'eve', 'history' from generate_series(1, 2000);
set role authenticated;
select test.expect_error(format('insert into resources (owner_id, kind, title, data) values (%L, ''cards'', ''one too many'', ''{}'')', :'sarah'), 'too_many');
select test.as_person(:'eve');
select test.expect_error(format('select add_history(%L, ''x'', ''[]'', ''[]'', null)', :'adam'), 'too_many');
select test.ok(true, 'materials per person and changes per day have a ceiling');

-- ───────── 9. The nightly clean-up ─────────
reset role;
delete from rate_log;
insert into feature_days (profile_id, device_id, day, counts) values (:'adam', 'old', current_date - 200, '{}');
insert into error_counts (day, kind, name, at, screen, platform, form, app_version, n) values (current_date - 200, 'crash', 'Error', '', 'board', 'ios', 'tablet', '1.0.0', 1);
insert into rate_log (user_id, kind, at) values (:'eve', 'invite', now() - interval '3 days'), (:'eve', 'invite', now());
insert into ai_calls (user_id, day, n) values (:'eve', current_date - 40, 3);
insert into invitations (direction, profile_id, child_name, from_user_id, from_name, code, role, level, perms, status, created_at) values
  ('invite', :'adam', 'Adam', :'eve', 'Eve', 'OLDOLD01', 'family', 1, '{}', 'pending', now() - interval '61 days'),
  ('invite', :'adam', 'Adam', :'eve', 'Eve', 'OLDOLD02', 'family', 1, '{}', 'pending', now() - interval '40 days');
select retention_daily();
select test.ok((select count(*) = 0 from feature_days where day < current_date - 180) and (select count(*) = 0 from error_counts)
           and (select count(*) = 1 from rate_log) and (select count(*) = 0 from ai_calls),
  'old counters are erased every night (features and problems 180 days, recent actions 2 days, AI calls 30 days)');
select test.ok((select count(*) = 1 and min(code) = 'OLDOLD02' from invitations where code like 'OLDOLD%'),
  'an invitation nobody answered is erased 60 days after it was written');
\echo GAP 3 SCENARIO PASSED
