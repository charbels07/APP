-- Gap review of November 2026, batch 4: people and rights, tried as the person who would try it.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set eve    '00000000-0000-0000-0000-0000000004a1'
\set nadia  '00000000-0000-0000-0000-0000000004a2'
\set tina   '00000000-0000-0000-0000-0000000004a3'
\set rita   '00000000-0000-0000-0000-0000000004a4'
\set sarah  '00000000-0000-0000-0000-0000000004a5'
\set marc   '00000000-0000-0000-0000-0000000004a6'
\set carl   '00000000-0000-0000-0000-0000000004a7'
\set tab1   '00000000-0000-0000-0000-0000000004b1'

truncate test.ids;
delete from rate_log;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'nadia', 'nadia@example.com', now(), '{"role":"parent","display_name":"Nadia"}'),
  (:'tina', 'tina@example.com', now(), '{"role":"parent","display_name":"Tina"}'),
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'carl', 'carl@example.com', now(), '{"role":"parent","display_name":"Carl"}');
insert into auth.users (id, is_anonymous) values (:'tab1', true);
insert into verifications (user_id, full_name, country, profession, status) values
  (:'sarah', 'Sarah K', 'France', 'slp', 'verified'), (:'marc', 'Marc H', 'Lebanon', 'teacher', 'pending');

-- A person signed in just now; the same person whose last proof is old; a child's tablet.
create or replace function test.as_person(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{}', false);
$$;
create or replace function test.as_stale(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{"amr":[]}', false);
$$;
-- As the app calls it (the token says "authenticated": the consent checks run).
create or replace function test.as_app(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{"role":"authenticated"}', false);
$$;
create or replace function test.as_tablet(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, false), set_config('request.jwt.claims', '{"is_anonymous":true}', false);
$$;
grant execute on all functions in schema test to authenticated;
set role authenticated;

-- The family: Eve owns Adam's profile; Nadia (family) and Tina (caregiver) join; Sarah is the therapist.
select test.as_person(:'eve');
select give_consent('child_data', 1);
with created as (
  insert into profiles (owner_id, name, age, data) values (:'eve', 'Adam', 6,
    '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"pin":"4821"}}')
  returning id)
insert into test.ids select 'adam', id::text from created;
select v as adam from test.ids where k = 'adam' \gset
insert into test.ids select 'nadia', (invite(:'adam', 'nadia@example.com', 'Nadia', 'family', 1, '{}')).id::text;
insert into test.ids select 'tina', (invite(:'adam', 'tina@example.com', 'Tina', 'caregiver', 1, '{"manager":true}')).id::text;
insert into test.ids select 'sarah', (invite(:'adam', 'sarah@clinic.fr', 'Sarah', 'therapist', 2, '{"createMaterials":true}')).id::text;
select test.ok((select perms -> 'manager' = 'false'::jsonb from invitations where id = (select v::uuid from test.ids where k = 'tina')),
  'an invitation never carries "acts as a parent", whatever was sent');
select test.expect_error(format('select invite(%L, null, null, ''parent'', 3, ''{}'')', :'adam'), 'forbidden');
select test.ok(true, 'a family does not invite a "parent": the second parent is made from the Team page');
select test.as_person(:'nadia');
select respond_invitation((select v::uuid from test.ids where k = 'nadia'), true);
select test.as_person(:'tina');
select respond_invitation((select v::uuid from test.ids where k = 'tina'), true);
select test.as_person(:'sarah');
select respond_invitation((select v::uuid from test.ids where k = 'sarah'), true);

-- ───────── 1. "Acts as a parent": the owner only, after a fresh proof ─────────
select test.as_stale(:'eve');
select test.expect_error(format('select update_member(%L, %L, 1, ''{"manager":true}'', null, null, false)', :'adam', :'nadia'), 'proof_needed');
select test.ok(true, 'making someone a parent asks the owner to prove it is her');
select test.as_person(:'eve');
select test.expect_error(format('select update_member(%L, %L, 2, ''{"manager":true}'', null, null, false)', :'adam', :'sarah'), 'invalid');
select test.ok(true, 'a professional is never made a parent');
select update_member(:'adam', :'nadia', 1, '{"manager":true}', null, null, false);
select test.ok((select role = 'parent' and level = 3 and perms -> 'manager' = 'true'::jsonb and perms -> 'invite' = 'true'::jsonb and perms -> 'viewData' = 'true'::jsonb
                  from members where profile_id = :'adam' and user_id = :'nadia'), 'Nadia acts as a parent: every right of the family');
select test.as_person(:'nadia');
select test.ok((select data -> 'settings' ->> 'pin' = '4821' from read_profile(:'adam')) and manages_team(:'adam'), 'she reads the family''s code and runs the team');
select test.expect_error(format('select update_member(%L, %L, 1, ''{"manager":true}'', null, null, false)', :'adam', :'tina'), 'forbidden');
select test.expect_error(format('select update_member(%L, %L, 3, ''{"manager":false,"invite":false}'', ''family'', null, false)', :'adam', :'nadia'), 'forbidden');
select test.ok(true, 'a co-parent gives nobody the family''s place and does not change her own access');
select update_member(:'adam', :'tina', 1, '{"manageDevices":true}', null, null, false);
select test.ok((select perms -> 'manageDevices' = 'true'::jsonb and perms -> 'manager' = 'false'::jsonb from members where profile_id = :'adam' and user_id = :'tina'),
  'she still sets the other rights of the team');
select test.as_person(:'eve');
select update_member(:'adam', :'tina', 1, '{"manager":true}', null, null, false);
select test.as_person(:'nadia');
select test.expect_error(format('select revoke_member(%L, %L)', :'adam', :'tina'), 'forbidden');
select test.expect_error(format('select cancel_invitation(%L)', (select v from test.ids where k = 'tina')), 'forbidden');
select test.ok(true, 'a co-parent does not remove another parent, not even through the invitation');
select test.as_person(:'eve');
select update_member(:'adam', :'tina', 1, '{"manager":false,"manageDevices":true,"invite":true}', null, null, false);
select test.ok((select role = 'family' and perms -> 'manager' = 'false'::jsonb and perms -> 'invite' = 'false'::jsonb from members where profile_id = :'adam' and user_id = :'tina'),
  'switched off, she stays as a family member without the family''s rights');
select update_member(:'adam', :'tina', 1, '{"manageDevices":true}', 'caregiver', null, false);
select test.expect_error(format('select update_member(%L, %L, 1, ''{}'', ''parent'', null, false)', :'adam', :'tina'), 'invalid');
select test.ok(true, '"parent" is given by the switch only');

-- ───────── 2. "Manage devices" ─────────
select register_device(:'adam', 'evephone', 'Téléphone d''Eve', 'companion', 'ios');
insert into test.ids select 'use1', code from create_pairing_code(:'adam', 'use');
select test.as_tablet(:'tab1');
select redeem_pairing_code((select v from test.ids where k = 'use1'), 'tab1dev', 'Tablette', 'android');
select test.as_person(:'tina');
select test.ok((select count(*) = 2 from devices where profile_id = :'adam'), 'with "manage devices", she sees the child''s devices');
select test.expect_error(format('select create_pairing_code(%L, ''use'')', :'adam'), 'forbidden');
select test.expect_error(format('select create_pairing_code(%L, ''full'')', :'adam'), 'forbidden');
select test.expect_error(format('select revoke_device(%L, ''evephone'')', :'adam'), 'forbidden');
select test.ok(true, 'no code at all (a tablet she linked would outlive her access), and never a parent''s own phone');
select revoke_device(:'adam', 'tab1dev');
reset role;
select test.ok((select revoked from devices where profile_id = :'adam' and id = 'tab1dev')
           and (select status = 'revoked' from members where profile_id = :'adam' and user_id = :'tab1'), 'she removes the child''s tablet');
set role authenticated;
select test.as_person(:'sarah');
select test.ok((select count(*) = 0 from devices where profile_id = :'adam'), 'without that right, no device is shown');
select test.as_person(:'nadia');
select test.expect_error(format('select revoke_device(%L, ''evephone'')', :'adam'), 'forbidden');
select test.ok(true, 'a co-parent does not remove the owner''s own phone');

-- ───────── 3. Professionals on a team are verified professional accounts ─────────
select test.as_person(:'eve');
select test.expect_error(format('select invite(%L, ''rita@example.com'', null, ''teacher'', 1, ''{}'')', :'adam'), 'pro_account_needed');
select test.ok(true, 'an address that belongs to a family''s account is refused for a teacher');
insert into test.ids select 'bycode', (invite(:'adam', null, 'Teacher', 'teacher', 1, '{}')).code;
select test.as_person(:'rita');
select test.expect_error(format('select accept_invitation_code(%L)', (select v from test.ids where k = 'bycode')), 'pro_account_needed');
select test.as_person(:'marc');
select test.expect_error(format('select accept_invitation_code(%L)', (select v from test.ids where k = 'bycode')), 'pro_not_verified');
select test.ok(true, 'a teacher''s code opens nothing for a family''s account, nor for a professional not yet accepted');
select test.as_person(:'eve');
insert into test.ids select 'conn', connection_code(:'adam');
select test.as_person(:'rita');
select test.expect_error(format('select request_connection(%L, ''therapist'', 2, ''{}'', null)', (select v from test.ids where k = 'conn')), 'pro_account_needed');
-- Someone who joined as a teacher with a family's account before this file (written straight in the table).
reset role;
set session_replication_role = replica;
insert into members (profile_id, user_id, display_name, role, level, perms) values (:'adam', :'rita', 'Rita', 'teacher', 1, '{}');
set session_replication_role = default;
set role authenticated;
select test.as_person(:'rita');
select test.ok((select count(*) = 0 from read_profile(:'adam')) and (select count(*) = 0 from list_profiles()), 'her access waits: she no longer opens the board');
select test.as_person(:'eve');
select test.ok((select waiting from list_members(:'adam') where user_id = :'rita'), 'the family sees she is waiting');
select test.ok((select data -> 'boards' ? 'core' from read_profile(:'adam')) and manages_team(:'adam'), 'the child''s board and the family are untouched');
select update_member(:'adam', :'rita', 1, '{}', 'caregiver', null, false);
select test.as_person(:'rita');
select test.ok((select count(*) = 1 from read_profile(:'adam')), 'given another role by the family, she opens it again');
reset role;
select test.ok(public.pro_paid(:'sarah'), 'the place for "has paid" is ready, open for everyone today');
set role authenticated;

-- ───────── 4. A child's name and age ─────────
select test.as_person(:'eve');
insert into test.ids select 'waitinv', (invite(:'adam', 'someone@example.com', null, 'family', 1, '{}')).id::text;
select update_child(:'adam', '  Adam   Junior ', 7);
select test.ok((select name = 'Adam Junior' and age = 7 from profiles where id = :'adam'), 'the parent renames the child and changes the age');
select test.ok((select child_name = 'Adam Junior' from invitations where id = (select v::uuid from test.ids where k = 'waitinv')), 'an invitation still waiting shows the new name');
select test.expect_error(format('select update_child(%L, ''   '', 7)', :'adam'), 'invalid');
select test.expect_error(format('select update_child(%L, ''Adam'', 99)', :'adam'), 'invalid');
select test.as_person(:'tina');
select test.expect_error(format('select update_child(%L, ''Bob'', 3)', :'adam'), 'forbidden');
select test.as_tablet(:'tab1');
select test.expect_error(format('select update_child(%L, ''Bob'', 3)', :'adam'), 'forbidden');
select test.ok(true, 'a member or a tablet does not rename the child');

-- ───────── 5. Asking again after a refusal; leaving a team ─────────
-- A request Nadia left waiting before she joined cannot be approved over her place as a parent.
select test.as_person(:'eve');
reset role;
insert into invitations (direction, profile_id, child_name, from_user_id, from_name, code, role, level, perms, status)
values ('request', :'adam', 'Adam', :'nadia', 'Nadia', 'OLDNADIA', 'family', 1, '{}', 'pending');
set role authenticated;
select test.as_person(:'eve');
select test.expect_error(format('select approve_request((select id from invitations where code = ''OLDNADIA''), 1, ''{}'')'), 'already_member');
select test.ok((select role = 'parent' and perms -> 'manager' = 'true'::jsonb from members where profile_id = :'adam' and user_id = :'nadia'),
  'a request left waiting does not rewrite someone who acts as a parent');
select test.as_person(:'eve');
select revoke_member(:'adam', :'sarah');
select test.as_person(:'sarah');
insert into test.ids select 'req', (request_connection((select v from test.ids where k = 'conn'), 'therapist', 2, '{"manager":true}', 'Bonjour')).id::text;
select test.as_person(:'eve');
select respond_invitation((select v::uuid from test.ids where k = 'req'), false);
select test.as_person(:'sarah');
select test.expect_error(format('select ask_again(%L)', (select v from test.ids where k = 'req')), 'ask_later');
reset role;
update invitations set created_at = now() - interval '8 days' where profile_id = :'adam' and from_user_id = :'sarah';
set role authenticated;
select test.as_person(:'sarah');
insert into test.ids select 'again', (ask_again((select v::uuid from test.ids where k = 'req'))).id::text;
select test.ok((select status = 'pending' and perms -> 'manager' = 'false'::jsonb and message = 'Bonjour' from invitations where id = (select v::uuid from test.ids where k = 'again')),
  'a week after a refusal, she asks again (never with the family''s rights)');
reset role;
update invitations set status = 'declined', created_at = now() - interval '8 days' where profile_id = :'adam' and from_user_id = :'sarah';
insert into invitations (direction, profile_id, child_name, from_user_id, code, role, level, status, created_at)
values ('request', :'adam', 'Adam', :'sarah', 'OLDREQ01', 'therapist', 1, 'declined', now() - interval '60 days');
set role authenticated;
select test.as_person(:'sarah');
select test.expect_error(format('select ask_again(%L)', (select v from test.ids where k = 'req')), 'refused_often');
select test.ok(true, 'after three requests in six months, no more');
reset role;
-- Cancelling her own new requests does not reset the count.
update invitations set status = 'cancelled' where code = 'OLDREQ01';
set role authenticated;
select test.as_person(:'sarah');
select test.expect_error(format('select ask_again(%L)', (select v from test.ids where k = 'req')), 'refused_often');
select test.ok(true, 'a request she cancelled herself still counts');
select test.as_person(:'tina');
select leave_team(:'adam');
select test.ok((select count(*) = 0 from read_profile(:'adam')), 'she leaves the team: the board is no longer hers to open');
select test.expect_error(format('select leave_team(%L)', :'adam'), 'not_found');
select test.as_person(:'eve');
select test.expect_error(format('select leave_team(%L)', :'adam'), 'forbidden');
select test.as_tablet(:'tab1');
select test.expect_error(format('select leave_team(%L)', :'adam'), 'forbidden');
select test.ok(true, 'the owner and a tablet do not "leave"');
select test.as_person(:'eve');
select test.ok((select count(*) = 1 from notices where user_id = :'eve' and text = 'Tina a quitté l''équipe de Adam Junior.'), 'the family is told');

-- ───────── 6. Handing the child to the other parent ─────────
select test.as_stale(:'eve');
select test.expect_error(format('select offer_profile(%L, %L)', :'adam', :'nadia'), 'proof_needed');
select test.as_person(:'eve');
select test.expect_error(format('select offer_profile(%L, %L)', :'adam', :'rita'), 'invalid');
select test.ok(true, 'only someone who acts as a parent can be offered the child');
-- Carl, another family member, is made a parent too: he can read the offer's code, not use it.
insert into test.ids select 'carlinv', (invite(:'adam', 'carl@example.com', 'Carl', 'family', 1, '{}')).id::text;
select test.as_person(:'carl');
select respond_invitation((select v::uuid from test.ids where k = 'carlinv'), true);
select test.as_person(:'eve');
select update_member(:'adam', :'carl', 1, '{"manager":true}', null, null, false);
insert into test.ids select 'offer', (offer_profile(:'adam', :'nadia')).id::text;
select test.as_app(:'carl');
select give_consent('child_data', 1);
select test.expect_error(format('select accept_invitation_code(%L)', (select code from invitations where id = (select v::uuid from test.ids where k = 'offer'))), 'forbidden');
select test.ok(true, 'another co-parent cannot take a profile offered to someone else');
-- An offer ends when its person is no longer a parent.
select test.as_person(:'eve');
insert into test.ids select 'offer2', (offer_profile(:'adam', :'carl')).id::text;
select update_member(:'adam', :'carl', 1, '{"manager":false}', 'family', null, false);
select test.ok((select status = 'cancelled' from invitations where id = (select v::uuid from test.ids where k = 'offer2')), 'switched off, the offer made to him ends');
insert into test.ids select 'offer', (offer_profile(:'adam', :'nadia')).id::text on conflict (k) do update set v = excluded.v;
select test.as_app(:'nadia');
select test.ok((select count(*) >= 1 from notices where user_id = :'nadia' and text like 'Eve vous propose de devenir le parent responsable%'), 'the other parent is asked');
select test.expect_error(format('select respond_invitation(%L, true)', (select v from test.ids where k = 'offer')), 'consent_needed');
select give_consent('child_data', 1);
select respond_invitation((select v::uuid from test.ids where k = 'offer'), true);
reset role;
select test.ok((select owner_id = :'nadia' from profiles where id = :'adam'), 'Nadia is the parent in charge');
select test.ok((select role = 'parent' and perms -> 'manager' = 'true'::jsonb and status = 'active' from members where profile_id = :'adam' and user_id = :'eve')
           and not exists (select 1 from members where profile_id = :'adam' and user_id = :'nadia'), 'Eve stays, acting as a parent');
select test.ok((select data -> 'settings' ->> 'pin' = '4821' from profiles where id = :'adam')
           and (select status = 'active' from members where profile_id = :'adam' and user_id = :'rita'), 'the family''s code and its team are unchanged');
set role authenticated;
select test.as_person(:'eve');
select test.expect_error(format('select offer_profile(%L, %L)', :'adam', :'nadia'), 'forbidden');
select test.expect_error(format('select update_member(%L, %L, 1, ''{"manager":true}'', null, null, false)', :'adam', :'rita'), 'forbidden');
select test.ok(true, 'the one who handed it over no longer decides who is a parent');

-- ───────── 7. Deleting one's account names the children first ─────────
select test.as_person(:'nadia');
select test.ok((select name = 'Adam Junior' and not in_bin and 'Eve' = any (people) and parents -> 0 ->> 'name' = 'Eve' from my_owned_profiles()),
  'the screen can name the child, who loses the board and who could take it');
select test.expect_error('select delete_account()', 'profiles_left');
select test.expect_error('select delete_account(array[null]::uuid[])', 'profiles_left');
select test.ok(true, 'an account that owns a child''s profile is not deleted without naming it');
select test.as_stale(:'nadia');
select test.expect_error(format('select delete_account(array[%L]::uuid[])', :'adam'), 'proof_needed');
select test.as_person(:'nadia');
select delete_account(array[:'adam']::uuid[]);
reset role;
select test.ok(not exists (select 1 from profiles where id = :'adam') and not exists (select 1 from auth.users where id = :'nadia'), 'agreed: the account and the child''s profile are erased');
select test.ok((select count(*) = 1 from notices where user_id = :'eve' and text = 'Le profil de Adam Junior a été effacé : Nadia a supprimé son compte.'),
  'the rest of the team is told');
select 'GAP 4 SCENARIO PASSED';
