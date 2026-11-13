\set ON_ERROR_STOP 1
\set rita  '00000000-0000-0000-0000-0000000000a1'
\set eve   '00000000-0000-0000-0000-0000000000a2'
\set zoe   '00000000-0000-0000-0000-0000000000a3'
insert into auth.users (id, email, email_confirmed_at) values (:'rita', 'r@x.com', now()), (:'eve', 'e@x.com', now()), (:'zoe', 'z@x.com', now());
insert into admins (user_id) values (:'zoe');
insert into profiles (id, owner_id, name, data) values ('00000000-0000-0000-0000-0000000000f1', :'rita', 'Adam', '{}');
set role authenticated;
select set_config('request.jwt.claim.sub', :'rita', false);
insert into storage.objects (bucket_id, name) values ('verification-docs', :'rita' || '/diplome.pdf');
insert into storage.objects (bucket_id, name) values ('profile-media', '00000000-0000-0000-0000-0000000000f1/photo.jpg');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from storage.objects), 'nobody else sees diplomas or a child''s photos');
select test.expect_error(format('insert into storage.objects (bucket_id, name) values (''verification-docs'', %L)', :'rita' || '/fake.pdf'),
  'new row violates row-level security policy for table "objects"');
select test.expect_error('insert into storage.objects (bucket_id, name) values (''profile-media'', ''00000000-0000-0000-0000-0000000000f1/x.jpg'')',
  'new row violates row-level security policy for table "objects"');
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select count(*) = 2 from storage.objects), 'the owner sees her own files');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select count(*) = 1 and bool_and(bucket_id = 'verification-docs') from storage.objects),
  'the back office reads the certificates, and never a child''s photos');
reset role;
\echo STORAGE SCENARIO PASSED
