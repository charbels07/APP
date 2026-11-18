-- The parent's consent kept as a record, data kept no longer than needed, "Download all my data".
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-0000000000b1'
\set eve     '00000000-0000-0000-0000-0000000000b2'
\set sarah   '00000000-0000-0000-0000-0000000000b3'
\set tablet  '00000000-0000-0000-0000-0000000000b4'
\set zoe     '00000000-0000-0000-0000-0000000000b5'
\set sleepy  '00000000-0000-0000-0000-0000000000b6'

truncate test.ids;
delete from admins;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, last_sign_in_at) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}', now()),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}', now()),
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}', now()),
  (:'zoe', 'zoe@team.app', now(), '{"role":"parent","display_name":"Zoé"}', now());
insert into auth.users (id, email, email_confirmed_at, created_at, last_sign_in_at) values
  (:'sleepy', 'sleepy@example.com', now(), now() - interval '3 years', now() - interval '25 months');
insert into auth.users (id, is_anonymous) values (:'tablet', true);
insert into verifications (user_id, full_name, country, profession, status) values (:'sarah', 'Sarah K', 'France', 'slp', 'verified');
insert into admins (user_id) values (:'zoe');

set role authenticated;
-- Requests from the app carry "role": "authenticated" in their token.
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);

-- 1. Consent before a family creates a child's profile.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error(format('insert into profiles (owner_id, name, data) values (%L, ''Adam'', ''{"settings":{}}'')', :'rita'), 'consent_needed');
select test.expect_error('select give_consent(''child_data'', 0)', 'invalid');
select test.expect_error('select give_consent(''marketing'', 1)', 'invalid');
select test.expect_error('insert into consents (user_id, kind, version) values (auth.uid(), ''child_data'', 1)', 'permission denied for table consents');
select give_consent('child_data', 1);
with c as (insert into profiles (owner_id, name, data) values (:'rita', 'Adam', '{"settings":{}}') returning id) insert into test.ids select 'adam', id::text from c;
select test.ok((select count(*) = 1 and min(profile_id::text) = (select v from test.ids where k = 'adam') from consents),
  'with the consent given, the profile is created and the consent names it');
select test.expect_error(format('insert into profiles (owner_id, name, data) values (%L, ''Lina'', ''{"settings":{}}'')', :'rita'), 'consent_needed');
select test.ok(true, 'one consent is for one child: a second child needs it again');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from consents), 'a person reads only their own consents');
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"role":"authenticated","is_anonymous":true}', false);
select test.expect_error('select give_consent(''child_data'', 1)', 'forbidden');
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);

-- A verified professional prepares a profile without it; the parents consent when they take it.
select set_config('request.jwt.claim.sub', :'sarah', false);
with c as (insert into profiles (owner_id, name, data) values (:'sarah', 'Lina', '{"settings":{}}') returning id) insert into test.ids select 'lina', id::text from c;
insert into test.ids select 'linaInv', (invite((select v::uuid from test.ids where k = 'lina'), null, 'Parents', 'parent', 3, '{}')).code;
select test.ok((select count(*) = 1 from profiles), 'a professional prepares a profile without the parents'' consent');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.expect_error(format('select accept_invitation_code(%L)', (select v from test.ids where k = 'linaInv')), 'consent_needed');
select give_consent('child_data', 1);
select accept_invitation_code((select v from test.ids where k = 'linaInv'));
select test.ok((select owner_id = :'eve' from profiles where id = (select v::uuid from test.ids where k = 'lina')), 'with their consent, the parents take the profile');

-- 2. "Download all my data": a fresh proof first, then only what is the person's.
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', format('{"role":"authenticated","amr":[{"method":"password","timestamp":%s}]}', extract(epoch from now() - interval '1 hour')::bigint), false);
select test.expect_error('select export_my_data()', 'proof_needed');
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);
select test.ok((select export_my_data() -> 'account' ->> 'email' = 'rita@example.com'), 'the account is in the file');
select test.ok((select jsonb_array_length(export_my_data() -> 'children') = 1 and export_my_data() -> 'children' -> 0 ->> 'name' = 'Adam'), 'her child''s profile, not Eve''s');
select test.ok((select jsonb_array_length(export_my_data() -> 'consents') = 1), 'and her consent');
select set_config('request.jwt.claim.sub', :'tablet', false);
select set_config('request.jwt.claims', '{"role":"authenticated","is_anonymous":true}', false);
select test.expect_error('select export_my_data()', 'forbidden');
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);

-- 3. Retention: what is old goes; the team only sees counts.
reset role;
insert into usage_days (profile_id, device_id, day, data) values
  ((select v::uuid from test.ids where k = 'adam'), 'ipad', current_date - 800, '{"selections":3}'),
  ((select v::uuid from test.ids where k = 'adam'), 'ipad', current_date - 400, '{"selections":3,"samples":[{"t":"je veux manger"}]}'),
  ((select v::uuid from test.ids where k = 'adam'), 'ipad', current_date - 10, '{"selections":3,"samples":[{"t":"encore"}]}');
insert into history (profile_id, actor_name, summary, ops, inverse, created_at) values
  ((select v::uuid from test.ids where k = 'adam'), 'Rita', 'old', '[]', '[]', now() - interval '25 months'),
  ((select v::uuid from test.ids where k = 'adam'), 'Rita', 'new', '[]', '[]', now());
insert into notices (user_id, kind, text, created_at) values (:'rita', 'access', 'old', now() - interval '13 months'), (:'rita', 'access', 'new', now());
insert into feedback (user_id, kind, text, created_at) values (:'rita', 'other', 'old idea', now() - interval '4 years'), (:'rita', 'other', 'new idea', now());
insert into admin_log (action, created_at) values ('old', now() - interval '6 years'), ('new', now());
select retention_daily();
select test.ok((select count(*) = 2 from usage_days), 'follow-up days older than 24 months are erased');
select test.ok((select count(*) = 1 from usage_days where samples_sealed is not null) and (select samples_sealed is not null from usage_days where day = current_date - 10),
  'the children''s sentences go after 12 months; the counts stay');
select test.ok((select count(*) = 0 from usage_days where data ? 'samples'), 'the sentences are never kept readable in the document');
select test.ok((select position('encore' in encode(samples_sealed, 'escape')) = 0 from usage_days where day = current_date - 10), 'they are sealed (encrypted)');
select test.ok((select count(*) = 1 from history where summary = 'old') = false and (select count(*) = 1 from history where summary = 'new'), 'change history: 24 months');
select test.ok((select count(*) = 1 from notices where user_id = :'rita'), 'notices: 12 months');
select test.ok((select count(*) = 1 from feedback), 'messages to the team: 3 years');
select test.ok((select count(*) = 1 from admin_log where action = 'old') = false, 'the team''s log: 5 years');
set role authenticated;
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error('select admin_retention()', 'forbidden');
select test.expect_error('select retention_daily()', 'permission denied for function retention_daily');
select set_config('request.jwt.claim.sub', :'zoe', false);
select set_config('request.jwt.claims', '{"role":"authenticated","aal":"aal2"}', false);
select test.ok((select (admin_retention() ->> 'inactiveAccounts')::int = 1), 'the team sees how many accounts have not signed in for 24 months (a count)');

-- 4. Sealed sentences and notes: read back only through the functions, by who may see the data.
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);
select test.ok((select bool_or(d -> 'samples' -> 0 ->> 't' = 'encore') from usage_of((select v::uuid from test.ids where k = 'adam'), current_date - 30) d),
  'the family reads the child''s sentences back');
select test.expect_error('select samples_sealed from usage_days', 'permission denied for table usage_days');
insert into observations (profile_id, created_by, author_name, at, utterance, note)
  values ((select v::uuid from test.ids where k = 'adam'), :'rita', 'Rita', now(), 'veux gâteau', 'à table');
select test.ok((select utterance is null and note is null from observations), 'an observation''s texts are not kept readable');
select test.ok((select utterance = 'veux gâteau' and note = 'à table' from list_observations((select v::uuid from test.ids where k = 'adam'))), 'the family reads them back');
update observations set result = 'understood';
select test.ok((select note = 'à table' from list_observations((select v::uuid from test.ids where k = 'adam'))), 'changing another field keeps the texts');
update observations set note = '';
select test.ok((select note is null and utterance = 'veux gâteau' from list_observations((select v::uuid from test.ids where k = 'adam'))), 'an empty text clears it');
select test.expect_error('select note_sealed from observations', 'permission denied for table observations');
select test.expect_error('select key from private.field_keys', 'permission denied for schema private');
select test.expect_error('update observations set note_sealed = ''x''', 'permission denied for table observations');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from list_observations((select v::uuid from test.ids where k = 'adam'))) and
               (select count(*) = 0 from usage_of((select v::uuid from test.ids where k = 'adam'), current_date - 30)), 'someone else reads nothing');
select set_config('request.jwt.claim.sub', :'zoe', false);
select set_config('request.jwt.claims', '{"role":"authenticated","aal":"aal2"}', false);

-- 5. A message to every family, from the team only.
select test.expect_error('select admin_broadcast(''x'', '''', ''y'')', 'invalid');
select test.ok((select admin_broadcast('Maintenance ce soir.', 'Maintenance tonight.', 'صيانة الليلة.') = 5), 'the team writes one message: every account (not the tablets) gets it');
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', '{"role":"authenticated"}', false);
select test.ok((select count(*) = 1 from notices where text = 'Maintenance ce soir.'), 'in its own menu language');
select test.expect_error('select admin_broadcast(''a'', ''b'', ''c'')', 'forbidden');
reset role;
select set_config('request.jwt.claims', '', false);
select test.ok((select admin_broadcast('Retour à la normale.', 'Back to normal.', 'عاد كل شيء طبيعيًا.') = 5), 'from the dashboard''s SQL editor (no sign-in token) it works too');
set role authenticated;

select set_config('request.jwt.claims', '', false);
reset role;
do $$ begin raise notice 'PRIVACY SCENARIO PASSED'; end $$;
