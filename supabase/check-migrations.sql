-- Which database files have run on this project?
-- Paste the whole file in Supabase → SQL Editor → New query → Run. It only reads: it changes nothing.
-- Each line says "done" or "TO RUN". Run the "TO RUN" files in the order shown (oldest first).
-- (The files are run by hand, so Supabase's own migration list stays empty: this looks for what
-- each file creates instead.)

with fn(schema_name, name) as (
  select n.nspname, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
)
select file,
       case when ok then 'done' else 'TO RUN' end as status
from (values
  ('20261109000000_init.sql',               to_regclass('public.profiles') is not null),
  ('20261109000100_storage.sql',            exists (select 1 from fn where schema_name = 'public' and name = 'try_uuid')),
  ('20261109000200_tablets.sql',            exists (select 1 from fn where schema_name = 'public' and name = 'is_tablet')),
  ('20261109000300_profile_owner_read.sql', exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles'
                                                    and policyname = 'read profiles' and qual ilike '%owner%')),
  ('20261111000000_usage_data.sql',         to_regclass('public.usage_days') is not null),
  ('20261111000100_ai_calls.sql',           to_regclass('public.ai_calls') is not null),
  ('20261113000000_backoffice.sql',         to_regclass('public.admins') is not null),
  ('20261114000000_security.sql',           to_regclass('public.rate_log') is not null),
  ('20261115000000_pro_profiles.sql',       exists (select 1 from fn where schema_name = 'public' and name = 'pro_profile_rules')),
  ('20261116000000_team_mail.sql',          to_regclass('public.team_mail') is not null),
  ('20261116000100_team_mail_name.sql',     exists (select 1 from pg_proc where proname = 'team_mail_application' and prosrc like '%- Name: %')),
  ('20261117000000_product.sql',            to_regclass('public.feature_days') is not null),
  ('20261118000000_security_2.sql',         exists (select 1 from fn where schema_name = 'public' and name = 'fresh_proof')),
  ('20261118000100_storage_purge.sql',      to_regclass('public.storage_purge') is not null),
  ('20261118000200_bin_snapshots.sql',      to_regclass('public.profile_snapshots') is not null),
  ('20261118000300_media_sync.sql',         exists (select 1 from fn where schema_name = 'public' and name = 'media_name_ok')),
  ('20261118000400_product_more.sql',       exists (select 1 from fn where schema_name = 'public' and name = 'product_terms')),
  ('20261118000500_privacy.sql',            to_regclass('public.consents') is not null),
  ('20261120000000_push.sql',               to_regclass('public.push_subs') is not null),
  ('20261122000000_gap_batch3.sql',         exists (select 1 from fn where schema_name = 'public' and name = 'manages_team')),
  ('20261122000100_gap_batch4.sql',         exists (select 1 from fn where schema_name = 'public' and name = 'offer_profile')),
  ('20261122000200_gap_batch5.sql',         exists (select 1 from fn where schema_name = 'public' and name = 'media_in_use')),
  ('20261123000000_app_name.sql',           exists (select 1 from pg_proc where proname = 'push_words' and prosrc like '%Empower Communication%')),
  ('20261123000100_deletion_list.sql',      exists (select 1 from pg_proc where proname = 'retention_daily' and prosrc like '%100 days%'))
) as t(file, ok)
order by file;
