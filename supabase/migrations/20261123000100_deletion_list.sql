-- The deletion list (storage_purge) is kept as long as the oldest copy of the database (owner's decision,
-- 23 November 2026). The off-site copies are kept 90 days at most (scripts/backup-offsite.sh); before this
-- file a line went 30 days after its files were deleted, so restoring a copy older than that could bring
-- back an account or a profile that had been deleted. A line holds only an ID, a reason and dates.
-- Same nightly clean-up otherwise (copied from 20261122000000_gap_batch3.sql). Safe to run more than once.
create or replace function public.retention_daily() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  out jsonb := '{}'::jsonb;
  n int;
begin
  delete from usage_days where day < current_date - interval '24 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('usageDays', n);
  -- The children's sentences (follow-up level "sentences", sealed) go after 12 months; the counts stay.
  update usage_days set samples_sealed = null where day < current_date - interval '12 months' and samples_sealed is not null;
  get diagnostics n = row_count; out := out || jsonb_build_object('sentences', n);
  delete from history where created_at < now() - interval '24 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('history', n);
  delete from notices where created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('notices', n);
  delete from feedback where created_at < now() - interval '3 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('feedback', n);
  delete from admin_log where created_at < now() - interval '5 years';
  get diagnostics n = row_count; out := out || jsonb_build_object('adminLog', n);
  delete from invitations where status <> 'pending' and created_at < now() - interval '12 months';
  get diagnostics n = row_count; out := out || jsonb_build_object('invitations', n);
  delete from invitations where status = 'pending' and created_at < now() - interval '60 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('invitationsNotAnswered', n);
  delete from feature_days where day < current_date - 180;
  get diagnostics n = row_count; out := out || jsonb_build_object('featureDays', n);
  delete from error_counts where day < current_date - 180;
  get diagnostics n = row_count; out := out || jsonb_build_object('problems', n);
  delete from rate_log where at < now() - interval '2 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('recentActions', n);
  delete from ai_calls where day < current_date - 30;
  delete from ai_budget where day < current_date - 30;
  -- The deletion list outlives the oldest copy of the database (90 days at most, BACKUP_KEEP_DAYS) by a
  -- margin: a restored copy can always be cleaned of what was deleted after it was made.
  delete from storage_purge where done_at < now() - interval '100 days';
  get diagnostics n = row_count; out := out || jsonb_build_object('deletionList', n);
  return out;
end $$;
revoke execute on function public.retention_daily() from public, anon, authenticated;
