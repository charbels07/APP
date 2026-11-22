-- Gap review of November 2026, batch 5: a child's photos and recordings stay while something
-- points to them, and a professional's proposal brings its pictures (migration 20261122000200).
-- Run after scenario.sql and media_scenario.sql (test.ok / test.expect_error / test.upload) on emptied tables.
\set ON_ERROR_STOP 1
\set eve    '00000000-0000-0000-0000-0000000005a1'
\set sarah  '00000000-0000-0000-0000-0000000005a2'
\set paul   '00000000-0000-0000-0000-0000000005a3'
\set marc   '00000000-0000-0000-0000-0000000005a4'
\set zed    '00000000-0000-0000-0000-0000000005a5'
\set use    '00000000-0000-0000-0000-0000000005b1'
\set adam   '00000000-0000-0000-0000-0000000005c1'

delete from rate_log;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}'),
  (:'sarah', 'sarah@clinic.fr', now(), '{"role":"pro","display_name":"Sarah"}'),
  (:'paul', 'paul@example.com', now(), '{"role":"parent","display_name":"Paul"}'),
  (:'marc', 'marc@school.lb', now(), '{"role":"pro","display_name":"Marc"}'),
  (:'zed', 'zed@example.com', now(), '{"role":"parent","display_name":"Zed"}');
insert into auth.users (id, is_anonymous) values (:'use', true);
insert into verifications (user_id, full_name, country, profession, status) values
  (:'sarah', 'Sarah K', 'France', 'slp', 'verified'), (:'marc', 'Marc T', 'Liban', 'teacher', 'verified');
insert into profiles (id, owner_id, name, data) values
  (:'adam', :'eve', 'Adam', '{"settings":{},"overrides":{"pomme":{"symbol":{"kind":"media","name":"1762000000001_aa11aa.jpg"}}}}');
insert into members (profile_id, user_id, display_name, role, level, perms) values
  -- a therapist who proposes words; a teacher who may only use the board; a family member who proposes nothing
  (:'adam', :'sarah', 'Sarah', 'therapist', 2, '{"proposeVocabulary":true,"createMaterials":true}'),
  (:'adam', :'marc', 'Marc', 'teacher', 1, '{}'),
  (:'adam', :'paul', 'Paul', 'family', 2, '{"manager":false}'),
  (:'adam', :'use', 'École', 'device', 1, '{}');

-- Six files of Adam, all sent 40 days ago (old enough to go if nothing points to them).
reset role;
insert into storage.objects (bucket_id, name, owner, metadata, created_at)
select 'profile-media', :'adam' || '/' || f, :'eve', '{"size": 1000, "mimetype": "image/jpeg"}', now() - interval '40 days'
  from unnest(array['1762000000001_aa11aa.jpg', '1762000000002_aa11aa.jpg', '1762000000003_aa11aa.jpg',
                    '1762000000004_aa11aa.jpg', '1762000000005_aa11aa.jpg', '1762000000006_aa11aa.jpg']) f;
-- 2: in an earlier version of the board; 3: replaced 10 days ago (in the history); 4: in a proposal waiting;
-- 5: replaced 40 days ago (the history is older than 30 days); 6: used by nothing.
insert into profile_snapshots (profile_id, data, version, reason)
values (:'adam', '{"overrides":{"chat":{"symbol":{"kind":"media","name":"1762000000002_aa11aa.jpg"}}}}', 1, 'weekly');
insert into history (profile_id, actor_id, summary, ops, inverse, created_at) values
  (:'adam', :'eve', '', '[{"path":["override","lait"],"before":{"symbol":{"kind":"media","name":"1762000000003_aa11aa.jpg"}},"after":null}]', '[]', now() - interval '10 days'),
  (:'adam', :'eve', '', '[{"path":["override","eau"],"before":{"symbol":{"kind":"media","name":"1762000000005_aa11aa.jpg"}},"after":null}]', '[]', now() - interval '40 days');
insert into proposals (profile_id, child_name, author_id, author_role, title, ops, base_version, status)
values (:'adam', 'Adam', :'sarah', 'therapist', 'Nouveau mot',
        '[{"path":["override","bus"],"after":{"symbol":{"kind":"media","name":"1762000000004_aa11aa.jpg"}}}]', 1, 'pending');

set role authenticated;

-- 1. What still points to a file.
select test.as_person(:'eve');
select test.ok((select media_in_use(:'adam') @> array['1762000000001_aa11aa.jpg', '1762000000002_aa11aa.jpg',
                                                      '1762000000003_aa11aa.jpg', '1762000000004_aa11aa.jpg']
                and not media_in_use(:'adam') && array['1762000000005_aa11aa.jpg', '1762000000006_aa11aa.jpg']),
  'the board, its earlier versions, 30 days of history and the proposals waiting are what still uses a file');
select test.as_person(:'zed');
select test.ok((select media_in_use(:'adam') = '{}'::text[]), 'a stranger learns nothing about a child''s files');

-- 2. The family removes only what nothing points to, sent more than 30 days ago.
select test.as_person(:'eve');
delete from storage.objects where name like :'adam' || '/%';
select test.ok((select array_agg(split_part(name, '/', 2) order by name) = array['1762000000001_aa11aa.jpg', '1762000000002_aa11aa.jpg',
                                                                                  '1762000000003_aa11aa.jpg', '1762000000004_aa11aa.jpg']
                  from storage.objects where name like :'adam' || '/%'),
  'removing everything leaves what the board, an earlier version, "Undo" or a waiting proposal still needs');
select test.upload(:'adam', '1762000000007_bb22bb.jpg', 'image/jpeg', 1000);
delete from storage.objects where name = :'adam' || '/1762000000007_bb22bb.jpg';
select test.ok((select count(*) = 1 from storage.objects where name = :'adam' || '/1762000000007_bb22bb.jpg'),
  'a file sent today is never removed, even if no word uses it yet (a change on its way from another device)');
reset role;
update proposals set status = 'declined' where profile_id = :'adam';
set role authenticated;
select test.as_person(:'eve');
delete from storage.objects where name = :'adam' || '/1762000000004_aa11aa.jpg';
select test.ok((select count(*) = 0 from storage.objects where name = :'adam' || '/1762000000004_aa11aa.jpg'),
  'once the proposal is declined, its picture can go');
select test.as_person(:'paul');
delete from storage.objects where name like :'adam' || '/%';
select test.ok((select count(*) = 4 from storage.objects where name like :'adam' || '/%'), 'someone who is not a manager still removes nothing');

-- 3. A professional's proposal brings its pictures; those who may only use the board still send nothing.
select test.as_person(:'sarah');
select test.upload(:'adam', '1762000000010_cc33cc.jpg', 'image/jpeg', 1000);
select test.ok((select count(*) = 1 from storage.objects where name = :'adam' || '/1762000000010_cc33cc.jpg'),
  'a checked therapist who may propose words sends the picture of her proposal');
select test.as_person(:'marc');
select test.expect_error(format('select test.upload(%L, ''1762000000011_cc33cc.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a member who may only use the board cannot send');
select test.as_person(:'paul');
select test.expect_error(format('select test.upload(%L, ''1762000000012_cc33cc.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a member who proposes neither words nor materials cannot send');
select set_config('request.jwt.claim.sub', :'use', false), set_config('request.jwt.claims', '{"is_anonymous":true}', false);
select test.expect_error(format('select test.upload(%L, ''1762000000013_cc33cc.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a use-only tablet still cannot send');
select set_config('request.jwt.claim.sub', '', false), set_config('request.jwt.claims', '', false);
reset role;
update verifications set status = 'rejected' where user_id = :'sarah';
set role authenticated;
select test.as_person(:'sarah');
select test.expect_error(format('select test.upload(%L, ''1762000000014_cc33cc.jpg'', ''image/jpeg'', 1000)', :'adam'),
  'new row violates row-level security policy for table "objects"');
select test.ok(true, 'a professional whose acceptance was withdrawn cannot send');

-- 4. Nothing here for someone not signed in.
set role anon;
select test.expect_error(format('select media_in_use(%L)', :'adam'), 'permission denied for function media_in_use');
select test.expect_error(format('select can_send_media(%L)', :'adam'), 'permission denied for function can_send_media');
reset role;

do $$ begin raise notice 'PASSED — a child''s files stay while something points to them; a proposal brings its pictures'; end $$;
