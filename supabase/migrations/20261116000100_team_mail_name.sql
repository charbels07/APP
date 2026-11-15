-- The e-mail about a professional's request now gives the person's name (November 2026)
--
-- Asked by the owner of the app: the team wants to know who applied without opening the back
-- office first. The message now holds the name, the profession and the country.
-- It still holds no document, no e-mail address and no phone number: those stay in the back
-- office. The figures of the week do not change: counts only, never a name.
--
-- Run after 20261116000000_team_mail.sql. Running it twice changes nothing.

create or replace function public.team_mail_application() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  waiting int;
  job text;
begin
  if tg_op = 'UPDATE' and old.status = 'pending' then return null; end if;
  -- One e-mail a day for the same person, 30 a day in all: the rest is seen in the back office.
  if exists (select 1 from team_mail where kind = 'application' and about = new.user_id and created_at > now() - interval '1 day')
     or (select count(*) from team_mail where kind = 'application' and created_at > now() - interval '1 day') >= 30 then
    return null;
  end if;
  select count(*) into waiting from verifications where status = 'pending';
  job := case new.profession
    when 'slp' then 'Speech-language therapist'
    when 'ot' then 'Occupational therapist'
    when 'psychomotor' then 'Psychomotor therapist'
    when 'psychologist' then 'Psychologist'
    when 'teacher' then 'Special education teacher'
    when 'educator' then 'Special educator'
    when 'behaviour' then 'Behaviour analyst'
    when 'other' then 'Other'
    else mail_plain(new.profession, 80) end;
  -- The name goes in the text only, never in the subject (subjects show on a locked screen).
  insert into team_mail (kind, about, subject, body) values ('application', new.user_id,
    'Empower Communication: a professional is waiting for verification',
    concat_ws(E'\n',
      'A professional sent their documents for verification.',
      '',
      '- Name: ' || mail_plain(new.full_name, 120),
      '- Profession: ' || job,
      '- Country: ' || mail_plain(new.country, 80),
      '- Requests waiting for a decision: ' || waiting,
      '',
      'To review it: sign in to the app with your team account. It opens on the back office (Verifications).',
      '',
      'Sent automatically by the app''s server. The documents are not in this message: they are read in the back office only.'));
  return null;
exception when others then
  return null; -- the request itself is never blocked by the e-mail
end $$;
revoke execute on function public.team_mail_application() from public, anon, authenticated;
