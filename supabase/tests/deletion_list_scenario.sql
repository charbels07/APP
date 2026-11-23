-- The deletion list outlives the oldest copy of the database (migration 20261123000100).
-- Run after scenario.sql (test.ok / test.expect_error) on emptied tables.
\set ON_ERROR_STOP 1
\set gone '00000000-0000-0000-0000-0000000006a1'

delete from storage_purge;
insert into storage_purge (bucket, path, reason, created_at, done_at) values
  ('profile-media', :'gone' || '/', 'profile', now() - interval '89 days', now() - interval '89 days'),
  ('profile-media', '00000000-0000-0000-0000-0000000006a2/', 'account', now() - interval '99 days', now() - interval '99 days'),
  ('profile-media', '00000000-0000-0000-0000-0000000006a3/', 'account', now() - interval '101 days', now() - interval '101 days'),
  ('verification-docs', '00000000-0000-0000-0000-0000000006a4/', 'document', now() - interval '200 days', null);
select test.ok((retention_daily() ->> 'deletionList')::int = 1, 'the nightly clean-up says how many lines of the deletion list it removed');
select test.ok((select count(*) = 1 from storage_purge where path = :'gone' || '/'),
  'a deletion made 89 days ago is still listed: a copy of up to 90 days can be cleaned of it after a restore');
select test.ok((select count(*) = 1 from storage_purge where path like '%06a2/'), 'kept 100 days after its files were deleted');
select test.ok((select count(*) = 0 from storage_purge where path like '%06a3/'), 'then removed (only an ID and dates: nothing of the person)');
select test.ok((select count(*) = 1 from storage_purge where done_at is null), 'a deletion still waiting is never removed, however old');
-- Nobody signed in may run the clean-up.
set role authenticated;
select test.expect_error('select retention_daily()', 'permission denied for function retention_daily');
reset role;
do $$ begin raise notice 'PASSED — the deletion list outlives the oldest copy of the database'; end $$;
