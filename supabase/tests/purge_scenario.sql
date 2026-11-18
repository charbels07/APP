-- Files erased with what they belong to: the queue the database writes for caa-purge.
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set ana     '00000000-0000-0000-0000-0000000000f1'
\set karim   '00000000-0000-0000-0000-0000000000f3'
\set lina    '00000000-0000-0000-0000-0000000000f4'
\set key     'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

truncate test.ids;
delete from storage_purge;
delete from team_mail_config;
insert into team_mail_config (function_url, key) values ('https://abcdefgh.supabase.co/functions/v1/caa-mail', :'key');
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ana', 'ana@example.com', now(), '{"role":"parent","display_name":"Ana"}'),
  (:'karim', 'karim@clinic.fr', now(), '{"role":"pro","display_name":"Karim"}');
insert into profiles (id, owner_id, name, age, data) values (:'lina', :'ana', 'Lina', 5, '{"settings":{}}');
insert into verifications (user_id, full_name, country, profession, documents) values (:'karim', 'Karim B', 'Liban', 'slp',
  format('[{"name":"id.jpg","kind":"id","ref":"%s/1-id.jpg"},{"name":"d.pdf","kind":"diploma","ref":"%s/2-d.pdf"}]', :'karim', :'karim')::jsonb);

-- 1. What is queued.
update verifications set documents = format('[{"name":"d.pdf","kind":"diploma","ref":"%s/2-d.pdf"}]', :'karim')::jsonb where user_id = :'karim';
select test.ok((select count(*) = 1 and min(path) = :'karim' || '/1-id.jpg' and min(reason) = 'document' from storage_purge),
  'a document taken off the list is queued for deletion');
delete from profiles where id = :'lina';
select test.ok((select count(*) = 1 from storage_purge where bucket = 'profile-media' and path = :'lina' || '/' and reason = 'profile'),
  'an erased child''s profile: its photos and recordings folder is queued');
delete from auth.users where id = :'karim';
select test.ok((select count(*) = 1 from storage_purge where bucket = 'verification-docs' and path = :'karim' || '/' and reason = 'account'),
  'an erased account: its documents folder is queued');
select storage_purge_add('profile-media', :'lina' || '/', 'profile');
select test.ok((select count(*) = 3 from storage_purge), 'the same folder is not queued twice while waiting');
select storage_purge_add('profile-media', '../etc/passwd', 'media');
select storage_purge_add('profile-media', :'lina' || '/a/b', 'media');
select test.ok((select count(*) = 3 from storage_purge), 'anything but "<uuid>/" or "<uuid>/<file>" is refused');

-- 2. The app cannot read or drive the queue.
set role authenticated;
select set_config('request.jwt.claim.sub', :'ana', false);
select test.expect_error('select * from storage_purge', 'permission denied for table storage_purge');
select test.expect_error(format('select * from storage_purge_take(%L)', :'key'), 'permission denied for function storage_purge_take');
select test.expect_error(format('select storage_purge_add(''profile-media'', %L, ''media'')', :'lina' || '/'), 'permission denied for function storage_purge_add');
select test.ok(true, 'a signed-in person can neither read the queue, take its work nor add to it');
reset role;

-- 3. The server function, with the database's key only.
set role service_role;
select test.expect_error('select * from storage_purge_take(''bbbb'')', 'forbidden');
select test.ok((select count(*) = 3 from storage_purge_take(:'key')), 'with the key, the waiting work is handed out');
select test.ok((select count(*) = 0 from storage_purge_take(:'key')), 'and not twice in a row');
reset role;
select id as job from storage_purge where reason = 'profile' \gset
set role service_role;
select storage_purge_done(:'key', :'job', null);
reset role;
select test.ok((select done_at is not null from storage_purge where id = :'job'), 'done work is marked done');
select test.ok((select storage_purge_waiting() = 2), 'what is still waiting is counted');

do $$ begin raise notice 'PURGE SCENARIO PASSED'; end $$;
