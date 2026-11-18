-- Security, second round: two-step sign-in, a fresh proof before what cannot be undone, and what
-- team members read about each other. Each attack must fail.
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-0000000000c1'
\set nadia   '00000000-0000-0000-0000-0000000000c2'
\set zoe     '00000000-0000-0000-0000-0000000000c3'
\set tablet  '00000000-0000-0000-0000-0000000000c4'
\set sami    '00000000-0000-0000-0000-0000000000c5'
\set adam    '00000000-0000-0000-0000-0000000000d1'
\set sess    '00000000-0000-0000-0000-0000000000e1'

truncate test.ids;
delete from admins;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'nadia', 'nadia@example.com', now(), '{"role":"parent","display_name":"Nadia"}'),
  (:'zoe', 'zoe@team.app', now(), '{"role":"parent","display_name":"Zoé"}'),
  (:'sami', 'sami@example.com', now(), '{"role":"parent","display_name":"Sami"}');
insert into auth.users (id, is_anonymous) values (:'tablet', true);
insert into admins (user_id) values (:'zoe');
insert into profiles (id, owner_id, name, age, data) values (:'adam', :'rita', 'Adam', 6,
  '{"boards":{"core":{"cells":[{"concept":"i"}]}},"settings":{"dataCollection":"off","shareStats":"none","pin":"4821"}}');
-- Nadia is a co-parent who manages; Sami a grandfather who only uses the board.
insert into members (profile_id, user_id, display_name, email, role, level, perms) values
  (:'adam', :'nadia', 'Nadia', 'nadia@example.com', 'parent', 3, '{"manager":true}'),
  (:'adam', :'sami', 'Sami', 'sami@example.com', 'family', 1, '{}');
update profiles set connection_code = 'FAMCODE1' where id = :'adam';

set role authenticated;

-- 1. Two-step sign-in turned on: the children's data waits for the code.
reset role;
insert into auth.mfa_factors (user_id, status) values (:'rita', 'verified');
set role authenticated;
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select test.ok((select count(*) = 0 from list_profiles()), 'two-step on, code not typed: no child is listed');
select test.ok((select count(*) = 0 from profiles), 'nor read directly');
select test.ok((select count(*) = 0 from members), 'nor the team');
select test.expect_error(format('select save_profile(%L, ''{}'', 1)', :'adam'), 'forbidden');
select test.expect_error('select delete_account()', 'two_step_needed');
select test.ok((select (my_security() ->> 'twoStep')::boolean and my_security() ->> 'level' = 'aal1'), 'the app learns that the code is owed');
select test.ok((select count(*) = 1 from accounts), 'the account''s own row stays readable, to ask for the code');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select test.ok((select count(*) = 1 from list_profiles()) and (select count(*) = 1 from profiles), 'code typed: the child is back');
-- Nadia has no two-step sign-in: nothing changes for her.
select set_config('request.jwt.claim.sub', :'nadia', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select test.ok((select count(*) = 1 from list_profiles()), 'an account without two-step sign-in is not affected');

-- 2. The app's team: the back office needs the code, the way to it does not.
select set_config('request.jwt.claim.sub', :'zoe', false);
select set_config('request.jwt.claims', '{"aal":"aal1"}', false);
select test.ok((select is_team() and not is_admin()), 'a team member without the code is on the team but not in the back office');
select test.expect_error('select admin_overview()', 'forbidden');
select test.expect_error('select * from admin_verifications()', 'forbidden');
select set_config('request.jwt.claims', '{"aal":"aal2"}', false);
select test.ok((select is_admin()), 'with the code typed, the back office opens');
select admin_overview();
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"aal":"aal2","is_anonymous":true}', false);
select test.ok((select not is_team() and not is_admin()), 'a tablet is never on the team');

-- 3. A fresh proof before what cannot be undone.
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', format('{"aal":"aal2","amr":[{"method":"password","timestamp":%s}]}', extract(epoch from now() - interval '2 hours')::bigint), false);
select test.ok((select not fresh_proof()), 'signed in two hours ago: no fresh proof');
select test.expect_error(format('select create_pairing_code(%L, ''full'')', :'adam'), 'proof_needed');
select test.ok((select count(*) = 1 from create_pairing_code(:'adam', 'use')), 'a use-only code needs no proof');
select test.expect_error('select delete_account()', 'proof_needed');
-- The proof can be a new sign-in session (password again or an e-mailed code)…
reset role;
insert into auth.sessions (id, user_id) values (:'sess', :'rita');
set role authenticated;
select set_config('request.jwt.claims', format('{"aal":"aal2","session_id":"%s","amr":[{"method":"password","timestamp":%s}]}', :'sess', extract(epoch from now() - interval '2 hours')::bigint), false);
select test.ok((select fresh_proof()), 'a sign-in session started just now is a fresh proof');
select test.ok((select count(*) = 1 from create_pairing_code(:'adam', 'full')), 'then a full-access code can be made');
-- …or the authenticator code typed again.
reset role;
update auth.sessions set created_at = now() - interval '1 hour';
insert into auth.mfa_challenges (factor_id, verified_at) select id, now() from auth.mfa_factors where user_id = :'rita';
set role authenticated;
select test.ok((select fresh_proof()), 'an authenticator code typed just now is a fresh proof');
-- A session someone else started does not count, nor a tablet's.
reset role;
delete from auth.mfa_challenges;
insert into auth.sessions (id, user_id) values ('00000000-0000-0000-0000-0000000000e2', :'nadia');
set role authenticated;
select set_config('request.jwt.claims', format('{"aal":"aal2","session_id":"%s","amr":[]}', '00000000-0000-0000-0000-0000000000e2'), false);
select test.ok((select not fresh_proof()), 'another person''s new session is not a proof');
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', format('{"is_anonymous":true,"amr":[{"method":"anonymous","timestamp":%s}]}', extract(epoch from now())::bigint), false);
select test.ok((select not fresh_proof()), 'a tablet has nothing to prove with');

-- 4. What team members read about each other.
select set_config('request.jwt.claim.sub', :'sami', false);
select set_config('request.jwt.claims', '', false);
select test.expect_error('select email from members', 'permission denied for table members');
select test.expect_error('select connection_code from profiles', 'permission denied for table profiles');
select test.expect_error('select * from profiles', 'permission denied for table profiles');
select test.ok((select count(*) = 1 from profiles where name = 'Adam'), 'the board itself is still read');
select test.ok((select count(*) = 2 and count(email) = 1 from list_members(:'adam')), 'the team list shows a use-only member only their own address');
select test.ok((select email = 'sami@example.com' from list_members(:'adam') where user_id = :'sami'), 'their own address is shown');
select set_config('request.jwt.claim.sub', :'nadia', false);
select test.ok((select count(email) = 2 from list_members(:'adam')), 'a manager sees the team''s addresses');
select test.ok((select connection_code(:'adam') = 'FAMCODE1'), 'a manager still gets the family code through its function');
select set_config('request.jwt.claim.sub', :'sami', false);
select test.expect_error(format('select connection_code(%L)', :'adam'), 'forbidden');
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous":true}', false);
select test.ok((select count(*) = 0 from list_members(:'adam')), 'someone off the team gets no list');

select set_config('request.jwt.claims', '', false);
reset role;
do $$ begin raise notice 'SECURITY 2 SCENARIO PASSED'; end $$;
