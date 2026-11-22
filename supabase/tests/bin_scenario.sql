-- The bin (a deleted child's profile kept 30 days) and the board's snapshots.
-- Run after scenario.sql (it uses its test.ok / test.expect_error helpers) on emptied tables.
\set ON_ERROR_STOP 1
\set rita    '00000000-0000-0000-0000-0000000000a1'
\set nadia   '00000000-0000-0000-0000-0000000000a2'
\set sami    '00000000-0000-0000-0000-0000000000a3'
\set eve     '00000000-0000-0000-0000-0000000000a4'
\set adam    '00000000-0000-0000-0000-0000000000a9'

truncate test.ids;
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'rita', 'rita@example.com', now(), '{"role":"parent","display_name":"Rita"}'),
  (:'nadia', 'nadia@example.com', now(), '{"role":"parent","display_name":"Nadia"}'),
  (:'sami', 'sami@example.com', now(), '{"role":"parent","display_name":"Sami"}'),
  (:'eve', 'eve@example.com', now(), '{"role":"parent","display_name":"Eve"}');
insert into profiles (id, owner_id, name, age, data) values (:'adam', :'rita', 'Adam', 6,
  '{"boards":{"core":{"cells":[{"concept":"i"},{"concept":"want"},{"concept":"eat"},{"concept":"drink"},{"concept":"more"},null]},"food":{"cells":[{"concept":"apple"},{"concept":"bread"},{"concept":"milk"},{"concept":"rice"},{"concept":"egg"}]}},"settings":{"dataCollection":"off","shareStats":"none","pin":"4821"}}');
insert into members (profile_id, user_id, display_name, role, level, perms) values
  (:'adam', :'nadia', 'Nadia', 'parent', 3, '{"manager":true}'),
  (:'adam', :'sami', 'Sami', 'family', 3, '{}');

set role authenticated;

-- 1. Snapshots: once a week, and before a big change.
select set_config('request.jwt.claim.sub', :'rita', false);
select save_profile(:'adam', jsonb_set((select data from read_profile(:'adam')), '{settings,pin}', '"4822"'), 1);
reset role;
select test.ok((select count(*) = 1 and min(reason) = 'weekly' and min(version) = 1 from profile_snapshots), 'the first change of the week keeps the board as it was');
set role authenticated;
select save_profile(:'adam', jsonb_set((select data from read_profile(:'adam')), '{settings,lang}', '"fr"'), 2);
reset role;
select test.ok((select count(*) = 1 from profile_snapshots), 'a small change the same week keeps nothing more');
set role authenticated;
select save_profile(:'adam', (select data from read_profile(:'adam')) #- '{boards,food}', 3);
reset role;
select test.ok((select count(*) = 2 from profile_snapshots where reason = 'big_change' or reason = 'weekly'), 'an activity board gone: the board is kept before the change');
select test.ok((select word_count(data) = 10 from profile_snapshots where reason = 'big_change'), 'that copy still has the board that was removed');
set role authenticated;

-- Who sees and uses them: the family and the team's managers; never the content in the list.
select test.ok((select count(*) = 2 and min(words) = 10 from list_snapshots(:'adam')), 'the family lists the copies (when, why, how many words)');
select set_config('request.jwt.claim.sub', :'sami', false);
select test.expect_error(format('select * from list_snapshots(%L)', :'adam'), 'forbidden');
select test.expect_error('select * from profile_snapshots', 'permission denied for table profile_snapshots');
reset role;
select id as anysnap from profile_snapshots limit 1 \gset
set role authenticated;
select test.expect_error(format('select restore_snapshot(%L)', :'anysnap'), 'forbidden');
select test.ok(true, 'a member who does not manage the team can neither list, read nor put back a copy');
select set_config('request.jwt.claim.sub', :'eve', false);
select test.expect_error(format('select take_snapshot(%L)', :'adam'), 'forbidden');

-- Putting one back: the board as it is now is kept first; the family's choices stay.
select set_config('request.jwt.claim.sub', :'nadia', false);
reset role;
select id as snap from profile_snapshots where reason = 'big_change' \gset
set role authenticated;
select test.ok((select restore_snapshot(:'snap') = 5), 'a manager puts a copy back: it becomes a new version');
select test.ok((select data -> 'boards' ? 'food' and data -> 'settings' ->> 'pin' = '4822' from read_profile(:'adam')),
  'the removed board is back; the caregiver code chosen since stays');
reset role;
select test.ok((select count(*) = 1 from profile_snapshots where reason = 'before_restore' and not (data -> 'boards' ? 'food')),
  'the board as it was before putting back is kept (it can be undone)');
select test.ok((select count(*) = 3 from profile_snapshots), 'putting back does not keep the board twice');
select test.ok((select count(*) = 1 from history where summary like 'restore:%'), 'the history says a copy was put back');
set role authenticated;
select take_snapshot(:'adam');
select take_snapshot(:'adam'); select take_snapshot(:'adam'); select take_snapshot(:'adam'); select take_snapshot(:'adam');
select take_snapshot(:'adam'); select take_snapshot(:'adam'); select take_snapshot(:'adam'); select take_snapshot(:'adam');
select test.ok((select count(*) = 10 from list_snapshots(:'adam')), 'ten copies are kept, the oldest go');

-- 2. The bin.
select set_config('request.jwt.claim.sub', :'rita', false);
select set_config('request.jwt.claims', format('{"amr":[{"method":"password","timestamp":%s}]}', extract(epoch from now() - interval '1 hour')::bigint), false);
select test.expect_error(format('select delete_profile(%L)', :'adam'), 'proof_needed');
select set_config('request.jwt.claims', '', false);
select set_config('request.jwt.claim.sub', :'nadia', false);
select test.expect_error(format('select delete_profile(%L)', :'adam'), 'forbidden');
select set_config('request.jwt.claim.sub', :'rita', false);
delete from profiles where id = :'adam';
select test.ok((select count(*) = 1 from profiles where id = :'adam'), 'the direct door does not delete: deleting goes through the bin');
select test.ok((select delete_profile(:'adam') > now() + interval '29 days'), 'the family deletes: kept 30 days');
select test.ok((select count(*) = 0 from list_profiles()), 'the profile leaves the family''s list');
select test.ok((select count(*) = 1 and min(name) = 'Adam' from list_bin()), 'and is in the family''s bin');
select test.expect_error(format('select save_profile(%L, ''{}'', 5)', :'adam'), 'forbidden');
select test.expect_error(format('select connection_code(%L)', :'adam'), 'forbidden');
update profiles set name = 'X' where id = :'adam';
select test.ok((select name = 'Adam' from profiles where id = :'adam'), 'a profile in the bin cannot be renamed');
select set_config('request.jwt.claim.sub', :'nadia', false);
select test.ok((select count(*) = 0 from list_profiles()) and (select count(*) = 0 from profiles), 'the team no longer sees it');
select test.ok((select count(*) = 0 from list_bin()), 'nor the bin, which is the family''s');
select test.expect_error(format('select restore_profile(%L)', :'adam'), 'forbidden');
select set_config('request.jwt.claim.sub', :'rita', false);
select restore_profile(:'adam');
select test.ok((select count(*) = 1 from list_profiles()), 'put back: the board is there again');
select set_config('request.jwt.claim.sub', :'nadia', false);
select test.ok((select count(*) = 1 from list_profiles()), 'for the team too');

-- After 30 days: erased for good, its files queued for deletion.
select set_config('request.jwt.claim.sub', :'rita', false);
select delete_profile(:'adam');
reset role;
update profiles set deleted_at = now() - interval '31 days' where id = :'adam';
select test.ok((select erase_old_bin() = 1), 'after 30 days the profile is erased');
select test.ok((select count(*) = 0 from profiles) and (select count(*) = 0 from members) and (select count(*) = 0 from profile_snapshots),
  'with its team and its copies');
select test.ok((select count(*) = 1 from storage_purge where path = :'adam' || '/'), 'and its photos and recordings are queued for deletion');
set role authenticated;
select test.expect_error('select erase_old_bin()', 'permission denied for function erase_old_bin');
reset role;

do $$ begin raise notice 'BIN SCENARIO PASSED'; end $$;
