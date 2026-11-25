-- "Download all my data": the file's label says Daleth AAC (owner's decision, 25 November 2026).
-- Only the label changes ('daleth-aac/export-1'); what the file holds, who may download it and the fresh
-- proof it asks are the same as in 20261122000000_gap_batch3.sql. Safe to run more than once.
-- Until it has run, the label inside the file still says 'empower-communication/export-1'.

create or replace function public.export_my_data() returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
  mine uuid[];
  pro boolean;
begin
  if me is null or is_tablet() then raise exception 'forbidden'; end if;
  if not mfa_ok() then raise exception 'two_step_needed'; end if;
  if not fresh_proof() then raise exception 'proof_needed'; end if;
  perform rate_limit('export', 10, interval '1 day');
  pro := is_pro(me);
  select coalesce(array_agg(id), '{}') into mine from profiles where owner_id = me and pro_cleared(me);
  return jsonb_build_object(
    'exportedAt', now(),
    'format', 'daleth-aac/export-1',
    'account', (select jsonb_build_object('id', u.id, 'email', u.email, 'phone', u.phone, 'createdAt', u.created_at,
                                          'lastSignInAt', u.last_sign_in_at, 'type', a.role, 'name', a.display_name, 'preferences', a.prefs)
                  from auth.users u left join accounts a on a.id = u.id where u.id = me),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) - 'user_id' order by c.accepted_at), '[]') from consents c where c.user_id = me),
    'children', (select coalesce(jsonb_agg(case when pro then to_jsonb(p) || jsonb_build_object('data', no_code(p.data)) else to_jsonb(p) end
                                           order by p.name), '[]') from profiles p where p.id = any (mine)),
    'teams', (select coalesce(jsonb_agg(to_jsonb(m) order by m.created_at), '[]') from members m where m.profile_id = any (mine) or m.user_id = me),
    'invitations', (select coalesce(jsonb_agg(to_jsonb(i) order by i.created_at), '[]') from invitations i
                     where i.profile_id = any (mine) or i.from_user_id = me or i.to_user_id = me),
    'proposals', (select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at), '[]') from proposals x where x.profile_id = any (mine) or x.author_id = me),
    'history', (select coalesce(jsonb_agg(to_jsonb(h) order by h.created_at), '[]') from history h where h.profile_id = any (mine)),
    'devices', (select coalesce(jsonb_agg(to_jsonb(d) order by d.created_at), '[]') from devices d where d.profile_id = any (mine) or d.user_id = me),
    'followUpDays', (select coalesce(jsonb_agg(jsonb_build_object('profileId', u.profile_id, 'device', u.device_id, 'day', u.day)
                                                || u.data || case when u.samples_sealed is null then '{}'::jsonb
                                                                  else jsonb_build_object('samples', private.unseal(u.samples_sealed)::jsonb) end
                                                order by u.day), '[]')
                       from usage_days u where u.profile_id = any (mine)),
    'observations', (select coalesce(jsonb_agg(to_jsonb(o) - 'utterance_sealed' - 'note_sealed' - 'context_sealed' - 'partner_sealed' - 'result_sealed'
                                               || jsonb_build_object('utterance', private.unseal(o.utterance_sealed), 'note', private.unseal(o.note_sealed),
                                                                     'context', private.unseal(o.context_sealed), 'partner', private.unseal(o.partner_sealed),
                                                                     'result', private.unseal(o.result_sealed))
                                               order by o.at), '[]')
                       from observations o where o.profile_id = any (mine) or (o.created_by = me and can_view_data(o.profile_id))),
    'featureCounts', (select coalesce(jsonb_agg(to_jsonb(f) order by f.day), '[]') from feature_days f where f.profile_id = any (mine)),
    'boardCopies', (select coalesce(jsonb_agg(jsonb_build_object('profileId', s.profile_id, 'createdAt', s.created_at, 'reason', s.reason,
                                                                 'board', case when pro then no_code(s.data) else s.data end) order by s.created_at), '[]')
                      from profile_snapshots s where s.profile_id = any (mine)),
    'notices', (select coalesce(jsonb_agg(to_jsonb(n) order by n.created_at), '[]') from notices n where n.user_id = me),
    'verification', (select to_jsonb(v) from verifications v where v.user_id = me),
    'materials', (select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]') from resources r where r.owner_id = me),
    'messagesToTheTeam', (select coalesce(jsonb_agg(to_jsonb(f) - 'user_id' order by f.created_at), '[]') from feedback f where f.user_id = me),
    'votes', (select coalesce(jsonb_agg(jsonb_build_object('idea', r.title, 'at', v.created_at)), '[]')
                from roadmap_votes v join roadmap r on r.id = v.item_id where v.user_id = me),
    'notificationDevices', (select coalesce(jsonb_agg(jsonb_build_object('since', s.created_at, 'lastOpened', s.seen_at, 'language', s.lang, 'timeZone', s.tz,
                                                                         'service', substring(s.endpoint from '^https://([^/]+)/'),
                                                                         'lastReminder', s.reminded_on) order by s.created_at), '[]')
                              from push_subs s where s.user_id = me),
    'boardLastOpened', (select coalesce(jsonb_agg(jsonb_build_object('profileId', v.profile_id, 'at', v.seen_at)), '[]')
                          from profile_seen v where v.profile_id = any (mine)),
    'notIncluded', 'Photos and recordings: they are files, kept in the app (each device, and the private storage of the child''s profile). Sign-in records kept by the sign-in service are given on request.');
end $$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
