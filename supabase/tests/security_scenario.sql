-- Attacks found by the security review of November 2026: each one must now fail.
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-0000000000b1'
\set sarah   '00000000-0000-0000-0000-0000000000b2'
\set eve     '00000000-0000-0000-0000-0000000000b3'
\set marc    '00000000-0000-0000-0000-0000000000b4'
\set tablet  '00000000-0000-0000-0000-0000000000b5'
\set robot   '00000000-0000-0000-0000-0000000000b6'
\set adam    '00000000-0000-0000-0000-0000000000f2'

grant usage on schema test to anon;
grant execute on all functions in schema test to anon;
truncate test.ids;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}');
insert into auth.users (id, is_anonymous) values (:'tablet', true), (:'robot', true);
insert into verifications (user_id, full_name, country, profession, status) values (:'sarah', 'Sarah K', 'France', 'slp', 'verified');
insert into profiles (id, owner_id, name, age, data) values (:'adam', :'rita', 'Adam', 6,
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"4821"}}');

-- 1. Without signing in, nothing can be called.
set role anon;
select test.expect_error('select list_profiles()', 'permission denied for function list_profiles');
select test.expect_error('select redeem_pairing_code(''ABCDEFGH'', ''d'', ''x'', ''ios'')', 'permission denied for function redeem_pairing_code');
select test.expect_error(format('select cancel_invitation(%L)', :'adam'), 'permission denied for function cancel_invitation');
select test.expect_error('select friendly_code()', 'permission denied for function friendly_code');
select test.ok(true, 'someone who is not signed in cannot call any function');
reset role;
set role authenticated;

-- 2. A professional cannot turn the account into a family account to skip the verification.
select set_config('request.jwt.claim.sub', :'marc', false);
select test.expect_error('update accounts set role = ''parent''', 'permission denied for table accounts');
update accounts set display_name = 'Marc T';
insert into verifications (user_id, full_name, country, profession, documents)
  values (:'marc', 'Marc T', 'Liban', 'teacher', format('[{"name":"c.pdf","kind":"licence","ref":"%s/1-c.pdf"}]', :'marc')::jsonb);
select test.expect_error('update verifications set status = ''verified''', 'permission denied for table verifications');
select test.expect_error('update verifications set documents = ''{"a":1}''', 'invalid');
select test.expect_error(format('update verifications set documents = ''[{"name":"x","kind":"id","ref":"%s/1.pdf"}]''', :'rita'), 'invalid');
select submit_verification();
select test.expect_error('select choose_role(''parent'')', 'forbidden');
select test.ok((select role = 'pro' and display_name = 'Marc T' from accounts), 'the account type cannot be changed by its owner; the name can');
select test.expect_error('select submit_verification()', 'forbidden');
select test.ok(true, 'a request cannot be marked accepted, point at someone else''s file, or be sent twice');

-- 3. "May invite" is not "may give everything"; nobody accepts their own invitation.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into test.ids select 'inv', (invite(:'adam', 'sarah@clinic.fr', 'Sarah', 'therapist', 2, '{"createMaterials":true,"invite":true}')).id::text;
select set_config('request.jwt.claim.sub', :'sarah', false);
select respond_invitation((select v::uuid from test.ids where k = 'inv'), true);
insert into test.ids select 'own', (invite(:'adam', null, 'x', 'therapist', 3, '{"manager":true,"viewData":true,"createMaterials":true,"hack":true}')).code;
select test.ok((select level = 2 and perms = '{"createMaterials":true,"proposeVocabulary":false,"viewData":false,"changeAccess":false,"invite":false,"manageDevices":false,"manager":false}'::jsonb
                  from invitations where code = (select v from test.ids where k = 'own')),
  'an invitation made by a member carries at most what that member holds');
select test.expect_error(format('select accept_invitation_code(%L)', (select v from test.ids where k = 'own')), 'forbidden');
select test.ok((select level = 2 and not (perms ->> 'manager')::boolean from access_of(:'adam')), 'accepting one''s own invitation is refused');

-- 4. Removed from the team: the invitations that person prepared stop working.
select set_config('request.jwt.claim.sub', :'rita', false);
select revoke_member(:'adam', :'sarah');
select test.expect_error(format('select revoke_member(%L, %L)', :'adam', :'eve'), 'not_found');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select accept_invitation_code((select v from test.ids where k = 'own')) is null), 'an invitation left behind by a removed member is cancelled');
select test.ok((select count(*) = 0 from profiles), 'no way back in');

-- 5. A connection request cannot carry the family's rights, even hidden.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into test.ids select 'code', connection_code(:'adam');
select set_config('request.jwt.claim.sub', :'eve', false);
insert into test.ids select 'req', (request_connection((select v from test.ids where k = 'code'), 'family', 3, '{"manager":true,"invite":true,"viewData":true}', 'hi')).id::text;
select test.ok((select not (perms ->> 'manager')::boolean and not (perms ->> 'invite')::boolean from invitations where id = (select v::uuid from test.ids where k = 'req')),
  'a request never stores "acts as a parent"');
select test.ok((select (request_connection((select v from test.ids where k = 'code'), 'family', 3, '{}', 'again')).id = (select v::uuid from test.ids where k = 'req')),
  'asking twice does not send the family a second request');
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error(format('select respond_invitation(%L, true)', (select v from test.ids where k = 'req')), 'forbidden');
select approve_request((select v::uuid from test.ids where k = 'req'), 3, '{"manager":true,"createMaterials":true}');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select level = 3 and not (perms ->> 'manager')::boolean and (perms ->> 'createMaterials')::boolean from access_of(:'adam')),
  'approving a request never makes the person a parent, whatever the app sent');

-- 6. An editor (level 3) cannot change what the family decided about data, nor the caregiver code.
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"language","shareStats":"none","pin":"4821"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"usage","shareStats":"anonymous","pin":"4821"}}'), 'consent_protected');
select test.expect_error(format('select save_profile(%L, %L, 1)', :'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[null]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"0000"}}'), 'consent_protected');
select test.ok((select (save_profile(:'adam',
  '{"boards":{"core":{"cells":[{"concept":"i"}]},"food":{"cells":[{"concept":"pizza"}]}},"settings":{"dataCollection":"usage","shareStats":"none","pin":"4821"}}', 1)) ->> 'ok' = 'true'),
  'an editor still edits the board; recording, sharing and the caregiver code stay the family''s');
select test.expect_error('update profiles set data = ''{}''', 'permission denied for table profiles');
select test.expect_error(format('insert into profiles (id, owner_id, name, data) values (%L, %L, ''x'', ''{}'')', :'adam', :'eve'), 'permission denied for table profiles');
select test.ok(true, 'a profile row cannot be rewritten directly, and its identifier cannot be chosen');

-- 7. Tablet codes: 8 letters and digits, and 5 wrong tries then a pause.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into test.ids select 'pair', code from create_pairing_code(:'adam', 'use');
select test.ok((select v ~ '^[A-HJ-NP-Z2-9]{8}$' from test.ids where k = 'pair'), 'a tablet code has 8 letters and digits');
select set_config('request.jwt.claim.sub', :'robot', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.ok((select bool_and(redeem_pairing_code('AAAA' || lpad(g::text, 4, '2'), 'd', 'x', 'ios') is null) from generate_series(1, 5) g), 'five wrong codes: nothing');
select test.expect_error(format('select redeem_pairing_code(%L, ''d'', ''x'', ''ios'')', (select v from test.ids where k = 'pair')), 'too_many');
select test.ok(true, 'after five wrong codes even the right one is refused for a while');
select test.expect_error('select count_ai_call()', 'forbidden');
select test.ok(true, 'a sign-in that looks after no child cannot use the AI helper');
select set_config('request.jwt.claim.sub', :'tablet', false);
select test.ok((select redeem_pairing_code(lower(left(v, 4)) || '-' || right(v, 4), 'school-1', 'Tablette école', 'ios') = :'adam' from test.ids where k = 'pair'),
  'the real tablet links, however the code was typed');
select test.ok((select count_ai_call() = 1), 'a linked tablet can');

-- 8. A use-only tablet writes neither the history nor someone else's figures.
select test.expect_error(format('select add_history(%L, ''x'', ''[]'', ''[]'', null)', :'adam'), 'forbidden');
select test.expect_error(format('select save_usage_day(%L, ''ipad-of-mum'', current_date, ''{"selections":1}'')', :'adam'), 'forbidden');
select test.expect_error(format('select save_usage_day(%L, ''school-1'', current_date - 400, ''{"selections":1}'')', :'adam'), 'invalid');
select save_usage_day(:'adam', 'school-1', current_date, '{"selections":"abc","utterances":4,"modes":{"Adam aime la pizza":5,"core":2},"platform":"ios"}');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select not (data ? 'selections') and data -> 'modes' = '{"core":2}'::jsonb and (data ->> 'utterances')::int = 4 from usage_days),
  'figures keep only numbers and known places: no text travels in them');
select test.ok((select count(*) = 1 from notices where kind = 'access' and text like '%Tablette école%'), 'the family is told when a device is linked');

-- 9. Notes: read by those allowed, changed only by their author or the family; the signature is the database's.
insert into observations (profile_id, created_by, author_name, at, note) values (:'adam', :'rita', 'Someone else', now(), 'note de Rita');
select test.ok((select author_name = 'Rita' from observations), 'a note is signed by the database');
select update_member(:'adam', :'eve', 1, '{"viewData":true}', null, null, false);
select set_config('request.jwt.claim.sub', :'eve', false);
update observations set note = 'changed';
delete from observations;
select test.ok((select count(*) = 1 and bool_and(note = 'note de Rita') from observations), 'someone who may see the data cannot rewrite or delete another person''s note');

-- 10. A material shared "to edit" cannot be taken.
select set_config('request.jwt.claim.sub', :'rita', false);
insert into resources (owner_id, owner_name, kind, title, data) values (:'rita', 'Empower Communication', 'tla', 'Dentiste', '{}');
select test.ok((select owner_name = 'Rita' from resources), 'a material is signed by the database');
select share_resource((select id from resources), 'eve@example.com', null, 'edit');
select set_config('request.jwt.claim.sub', :'eve', false);
update resources set title = 'Dentiste 2';
select test.expect_error('update resources set owner_id = auth.uid()', 'permission denied for table resources');
select test.ok((select title = 'Dentiste 2' and owner_id = :'rita' from resources), 'an edit share changes the content, not the owner');

-- 11. A decided proposal cannot be reopened by its author; calls without a person are refused.
select set_config('request.jwt.claim.sub', :'rita', false);
select update_member(:'adam', :'eve', 2, null, null, null, false);
select set_config('request.jwt.claim.sub', :'eve', false);
insert into test.ids select 'prop', (create_proposal(:'adam', 'Ajouter', null, '[]', 2)).id::text;
select set_config('request.jwt.claim.sub', :'rita', false);
select set_proposal_status((select v::uuid from test.ids where k = 'prop'), 'approved', null);
select set_config('request.jwt.claim.sub', :'eve', false);
select test.expect_error(format('select update_proposal(%L, ''x'', null, ''[]'', 2)', (select v from test.ids where k = 'prop')), 'forbidden');
select test.expect_error(format('select set_proposal_status(%L, ''withdrawn'', null)', (select v from test.ids where k = 'prop')), 'forbidden');
select set_config('request.jwt.claim.sub', '', false);
select test.expect_error(format('select set_proposal_status(%L, ''withdrawn'', ''x'')', (select v from test.ids where k = 'prop')), 'unauthorized');
select test.expect_error(format('select cancel_invitation(%L)', (select v from test.ids where k = 'req')), 'unauthorized');
select test.ok(true, 'a decided proposal stays decided; a call that names nobody is refused');

-- 12. Files: documents are uploaded by real accounts only.
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.expect_error(format('insert into storage.objects (bucket_id, name) values (''verification-docs'', %L)', :'tablet' || '/x.pdf'),
  'new row violates row-level security policy for table "objects"');
select set_config('request.jwt.claims', '', false);
reset role;
select test.ok((select file_size_limit = 10485760 and 'application/pdf' = any(allowed_mime_types) from storage.buckets where id = 'verification-docs'),
  'documents: pictures or PDF, 10 MB at most; a tablet sign-in cannot upload any');
\echo SECURITY SCENARIO PASSED
