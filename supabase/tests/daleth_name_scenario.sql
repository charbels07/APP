-- The company and the app renamed DALETH / "Daleth AAC" (migration 20261125000000).
-- Run after scenario.sql (test.ok / test.expect_error).
\set ON_ERROR_STOP 1

select test.ok((select title from push_words('reminder', 'en')) = 'Daleth AAC', 'the noon reminder is titled "Daleth AAC"');
select test.ok(not exists (select 1 from pg_proc where proname in ('push_words', 'team_mail_application', 'team_mail_weekly', 'team_mail_test') and prosrc like '%Empower%'),
  'nothing the server writes says the old name');
select test.ok(exists (select 1 from pg_proc where proname = 'team_mail_application' and prosrc like '%Daleth AAC: a professional is waiting for verification%'), 'the request e-mail''s subject');
select test.ok(exists (select 1 from pg_proc where proname = 'team_mail_test' and prosrc like '%Daleth AAC: the team e-mails work%'), 'the test e-mail''s subject');
-- Still not callable by anyone signed in.
set role authenticated;
select test.expect_error($$ select public.team_mail_weekly() $$, 'permission denied for function team_mail_weekly');
select test.expect_error($$ select public.team_mail_test() $$, 'permission denied for function team_mail_test');
reset role;
do $$ begin raise notice 'PASSED — the new name in what the server writes'; end $$;
