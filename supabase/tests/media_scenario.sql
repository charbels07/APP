-- A child's photos and recordings copied through the account (migration 20261118000300):
-- the normal story, then the attacks that must fail.
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-0000000000d1'
\set sarah   '00000000-0000-0000-0000-0000000000d2'
\set paul    '00000000-0000-0000-0000-0000000000d3'
\set eve     '00000000-0000-0000-0000-0000000000d4'
\set marc    '00000000-0000-0000-0000-0000000000d5'
\set tom     '00000000-0000-0000-0000-0000000000d6'
\set zoe     '00000000-0000-0000-0000-0000000000d7'
\set tab     '00000000-0000-0000-0000-0000000000d8'
\set use     '00000000-0000-0000-0000-0000000000d9'
\set adam    '00000000-0000-0000-0000-0000000000e1'
\set lea     '00000000-0000-0000-0000-0000000000e2'
\set noa     '00000000-0000-0000-0000-0000000000e3'

-- How the storage server takes a file: it tries the row as the person (the rules decide, then
-- the try is taken back), stores the file, then writes the row itself with the file's size and
-- kind (no person then, and above the table's rules: only the checks of the database apply).
create function test.server_write(p_name text, p_mime text, p_size bigint, p_owner uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  sub text := current_setting('request.jwt.claim.sub', true);
  claims text := current_setting('request.jwt.claims', true);
begin
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('request.jwt.claims', '', true);
  insert into storage.objects (bucket_id, name, owner, metadata)
  values ('profile-media', p_name, p_owner, jsonb_build_object('size', p_size, 'mimetype', p_mime));
  perform set_config('request.jwt.claim.sub', coalesce(sub, ''), true);
  perform set_config('request.jwt.claims', coalesce(claims, ''), true);
end $$;
create function test.upload(p_child text, p_file text, p_mime text, p_size bigint) returns void
language plpgsql set search_path = public as $$
begin
  begin
    insert into storage.objects (bucket_id, name) values ('profile-media', p_child || '/' || p_file);
    raise exception using errcode = 'TT001';
  exception when sqlstate 'TT001' then null;
  end;
  perform test.server_write(p_child || '/' || p_file, p_mime, p_size, auth.uid());
end $$;
grant execute on function test.server_write(text, text, bigint, uuid) to authenticated;
grant execute on function test.upload(text, text, text, bigint) to authenticated;

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'paul', 'paul@example.com', now(), '{"role":"parent","display_name":"Paul"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'tom', 'tom@example.com', now(), '{"role":"parent","display_name":"Tom"}'),
  (:'zoe', 'zoe@team.app', now(), '{"role":"parent","display_name":"Zoe"}');
insert into auth.users (id, is_anonymous) values (:'tab', true), (:'use', true);
insert into admins (user_id) values (:'zoe');
insert into verifications (user_id, full_name, country, profession, status) values
  (:'sarah', 'Sarah K', 'France', 'slp', 'verified'), (:'marc', 'Marc T', 'Liban', 'teacher', 'verified');
insert into profiles (id, owner_id, name, data) values
  (:'adam', :'rita', 'Adam', '{"settings":{}}'), (:'lea', :'rita', 'Léa', '{"settings":{}}'), (:'noa', :'rita', 'Noa', '{"settings":{}}');
insert into members (profile_id, user_id, display_name, role, level, perms) values
  (:'adam', :'sarah', 'Sarah', 'therapist', 3, '{"manager":false}'),
  (:'adam', :'paul', 'Paul', 'family', 2, '{"manager":false}'),
  (:'adam', :'marc', 'Marc', 'teacher', 3, '{"manager":false}'),
  (:'adam', :'tom', 'Tom', 'caregiver', 3, '{"manager":false}'),
  (:'adam', :'tab', 'iPad', 'device', 3, '{"manager":true}'),
  (:'adam', :'use', 'École', 'device', 1, '{"manager":false}');
select test.ok((select file_size_limit = 3145728 and 'audio/mp4' = any(allowed_mime_types) and not 'application/pdf' = any(allowed_mime_types)
                  from storage.buckets where id = 'profile-media'),
  'the storage server takes pictures and sounds only, 3 MB at most');

set role authenticated;

-- 1. The normal story: the family, the team and the child's tablet send; everyone on the team reads.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.upload(:'adam', '1762000000001_aa11aa.jpg', 'image/jpeg', 180000);
select test.upload(:'adam', '1762000000002_aa11aa.t120-980.m4a', 'audio/mp4', 90000);
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.upload(:'adam', '1762000000003_aa11aa.wav', 'audio/wav', 2500000);
select set_config('request.jwt.claim.sub', :'tab', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.upload(:'adam', '1762000000004_aa11aa.webp', 'image/webp', 20000);
select set_config('request.jwt.claims', '', false);
select test.ok((select count(*) = 4 from storage.objects), 'the child''s tablet with full access sends and reads the child''s files');
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select count(*) = 4 from storage.objects), 'the family sees every photo and recording of the child, a recording keeps its start and stop in its name');
select set_config('request.jwt.claim.sub', :'use', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.ok((select count(*) = 4 from storage.objects), 'a use-only tablet receives them (the child''s words keep their pictures and voices)');
select set_config('request.jwt.claim.sub', :'paul', false);
select set_config('request.jwt.claims', '', false);
select test.ok((select count(*) = 4 from storage.objects), 'a member who may only propose reads them too');
select set_config('request.jwt.claim.sub', :'marc', false);
select test.upload(:'adam', '1762000000005_aa11aa.jpg', 'image/jpeg', 50000);
select test.ok((select count(*) = 5 from storage.objects), 'a verified professional on the team, allowed to change the board, sends');

-- 2. Those who may not change the board cannot send.
select set_config('request.jwt.claim.sub', :'use', false);
select set_config('request.jwt.claims', '{"is_anonymous": true}', false);
select test.expect_error(format('select test.upload(%L, ''1762000000010_bb22bb.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select set_config('request.jwt.claims', '', false);
select test.ok(true, 'a use-only tablet cannot send a file');
select set_config('request.jwt.claim.sub', :'paul', false);
select test.expect_error(format('select test.upload(%L, ''1762000000011_bb22bb.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a member who may only propose cannot send a file');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.ok((select count(*) = 0 from storage.objects), 'a stranger sees none of the child''s files');
select test.expect_error(format('select test.upload(%L, ''1762000000012_bb22bb.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a stranger cannot send into a child''s space, even knowing its number');

-- 3. Someone removed from the team, or a professional no longer verified, gets nothing.
select set_config('request.jwt.claim.sub', :'tom', false);
select test.upload(:'adam', '1762000000013_bb22bb.jpg', 'image/jpeg', 1000);
select set_config('request.jwt.claim.sub', :'rita', false);
select revoke_member(:'adam', :'tom');
select set_config('request.jwt.claim.sub', :'tom', false);
select test.ok((select count(*) = 0 from storage.objects), 'someone removed from the team no longer sees the child''s files');
select test.expect_error(format('select test.upload(%L, ''1762000000014_bb22bb.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'someone removed from the team can no longer send');
reset role;
update verifications set status = 'rejected' where user_id = :'marc';
set role authenticated;
select set_config('request.jwt.claim.sub', :'marc', false);
select test.ok((select count(*) = 0 from storage.objects), 'a professional who is no longer verified sees nothing');
select test.expect_error(format('select test.upload(%L, ''1762000000015_bb22bb.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a professional who is no longer verified cannot send');
select set_config('request.jwt.claim.sub', :'zoe', false);
select test.ok((select count(*) = 0 from storage.objects where bucket_id = 'profile-media'), 'the back office never sees a child''s photos or recordings');

-- 4. Only the names the app gives, only pictures and sounds, never too big.
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error(format('select test.upload(%L, ''1762000000020_cc33cc.pdf'', ''application/pdf'', 1000)', :'adam'), 'invalid');
select test.expect_error(format('select test.upload(%L, ''../%s/1762000000021_cc33cc.jpg'', ''image/jpeg'', 1000)', :'adam', :'lea'), 'invalid');
select test.expect_error(format('select test.upload(%L, ''photo.jpg'', ''image/jpeg'', 1000)', :'adam'), 'invalid');
select test.ok(true, 'a name the app does not give (another kind of file, a path) is refused');
select test.expect_error(format('select test.upload(%L, ''1762000000022_cc33cc.jpg'', ''application/pdf'', 1000)', :'adam'), 'media_type');
select test.expect_error(format('select test.upload(%L, ''1762000000023_cc33cc.jpg'', ''audio/mp4'', 1000)', :'adam'), 'media_type');
select test.expect_error(format('select test.upload(%L, ''1762000000024_cc33cc.m4a'', ''text/html'', 1000)', :'adam'), 'media_type');
select test.ok(true, 'a file that is not the picture or the sound its name says is refused');
select test.expect_error(format('select test.upload(%L, ''1762000000025_cc33cc.jpg'', ''image/jpeg'', 2500000)', :'adam'), 'too_large');
select test.expect_error(format('select test.upload(%L, ''1762000000026_cc33cc.m4a'', ''audio/mp4'', 3500000)', :'adam'), 'too_large');
select test.ok(true, 'a photo above 2 MB or a recording above 3 MB is refused');
select test.ok((select count(*) = 6 from storage.objects), 'nothing refused was kept');

-- 5. Removing: the child's managers only; nobody moves a file.
select set_config('request.jwt.claim.sub', :'sarah', false);
delete from storage.objects where name = :'adam' || '/1762000000001_aa11aa.jpg';
update storage.objects set name = :'lea' || '/1762000000001_aa11aa.jpg' where name = :'adam' || '/1762000000001_aa11aa.jpg';
select set_config('request.jwt.claim.sub', :'use', false);
delete from storage.objects;
select set_config('request.jwt.claim.sub', :'rita', false);
select test.ok((select count(*) = 6 and count(*) filter (where name like :'adam' || '/%') = 6 from storage.objects),
  'a member who is not a manager, or a tablet, cannot remove or move a file');
delete from storage.objects where name = :'adam' || '/1762000000013_bb22bb.jpg';
select test.ok((select count(*) = 5 from storage.objects), 'the family removes a file that was replaced');

-- 6. Fair use: 1500 files and 150 MB per child, 1000 files sent per person per day.
reset role;
select set_config('request.jwt.claim.sub', '', false);
insert into storage.objects (bucket_id, name, metadata)
select 'profile-media', :'lea' || '/' || (1762000001000 + g)::text || '_dd44dd.jpg', '{"size": 1000, "mimetype": "image/jpeg"}'
  from generate_series(1, 1500) g;
insert into storage.objects (bucket_id, name, metadata)
select 'profile-media', :'noa' || '/' || (1762000002000 + g)::text || '_ee55ee.m4a', '{"size": 3145728, "mimetype": "audio/mp4"}'
  from generate_series(1, 50) g;
set role authenticated;
select set_config('request.jwt.claim.sub', :'rita', false);
select test.expect_error(format('select test.upload(%L, ''1762000000030_ff66ff.jpg'', ''image/jpeg'', 1000)', :'lea'), 'media_quota');
select test.ok(true, 'a child''s space holds 1500 files at most');
select test.expect_error(format('select test.upload(%L, ''1762000000031_ff66ff.jpg'', ''image/jpeg'', 1000)', :'noa'), 'media_quota');
select test.ok(true, 'a child''s space holds 150 MB at most (checked again once the size is known)');
select test.upload(:'adam', '1762000000032_ff66ff.jpg', 'image/jpeg', 1000);
select test.ok(true, 'another child''s space is not affected');
reset role;
insert into rate_log (user_id, kind) select :'sarah', 'media' from generate_series(1, 1000);
set role authenticated;
select set_config('request.jwt.claim.sub', :'sarah', false);
select test.expect_error(format('select test.upload(%L, ''1762000000033_ff66ff.jpg'', ''image/jpeg'', 1000)', :'adam'), 'too_many');
select test.ok(true, 'one person sends at most 1000 files a day (sending and removing again and again is stopped)');
reset role;
select test.ok((select count(*) = 3 from rate_log where user_id = :'rita' and kind = 'media' and at > now() - interval '1 hour')
                and (select count(*) = 3 from storage.objects where owner = :'rita'),
  'only a file really taken is counted (a try that the rules refused is not)');

-- 7. Nothing here can be called by someone who is not signed in.
set role anon;
select test.expect_error(format('select can_edit_board(%L)', :'adam'), 'permission denied for function can_edit_board');
select test.expect_error('select media_rules()', 'permission denied for function media_rules');
reset role;

do $$ begin raise notice 'PASSED — a child''s photos and recordings: who sends, who reads, what and how much'; end $$;
