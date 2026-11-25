-- Gap review of November 2026, batch 6: the app's name in what the server writes (migration 20261123000000).
-- Run after scenario.sql (test.ok / test.expect_error).
\set ON_ERROR_STOP 1

select test.ok((select title from push_words('reminder', 'fr')) = 'Daleth AAC', 'the noon reminder is titled with the app''s full name');
select test.ok((select title from push_words('reminder', 'ar')) = 'Daleth AAC', 'in every language');
select test.ok((select body from push_words('reminder', 'en')) = 'The board has not been opened yet today. A few minutes together make a difference.', 'the words of the reminder did not change');
select test.ok((select title from push_words('idea', 'en')) = 'A new idea to vote on', 'nor those of a new idea');
-- Nobody signed in may call it (only the server's own reminder job writes notifications).
set role authenticated;
select test.expect_error($$ select * from push_words('reminder', 'fr') $$, 'permission denied for function push_words');
reset role;
set role anon;
select test.expect_error($$ select * from push_words('reminder', 'fr') $$, 'permission denied for function push_words');
reset role;
do $$ begin raise notice 'PASSED — the app''s full name in what the server writes'; end $$;
