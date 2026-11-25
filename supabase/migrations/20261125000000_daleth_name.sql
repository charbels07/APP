-- The company is now DALETH and the app "Daleth AAC" (owner's decision, 25 November 2026).
-- What the server writes with the app's name: the noon reminder's title and the subjects of the
-- team's e-mails. Same words otherwise; still no name and no word of the child.
-- Run after 20261123000000_app_name.sql. Safe to run more than once. Until it has run, these texts
-- still say "Empower Communication" (nothing else changes).

create or replace function public.push_words(p_kind text, p_lang text) returns table (title text, body text)
language sql immutable as $$
  select case p_kind
           when 'reminder' then 'Daleth AAC'
           else case p_lang when 'en' then 'A new idea to vote on' when 'ar' then 'فكرة جديدة للتصويت' else 'Une nouvelle idée à voter' end
         end,
         case p_kind
           when 'reminder' then case p_lang
             when 'en' then 'The board has not been opened yet today. A few minutes together make a difference.'
             when 'ar' then 'لم يُفتح اللوح اليوم بعد. بضع دقائق معًا تُحدث فرقًا.'
             else 'Le tableau n’a pas encore été ouvert aujourd’hui. Quelques minutes ensemble font la différence.' end
           else ''
         end
$$;
revoke execute on function public.push_words(text, text) from public, anon, authenticated;

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
    'Daleth AAC: a professional is waiting for verification',
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

create or replace function public.team_mail_weekly() returns void
language plpgsql security definer set search_path = public as $$
declare
  f jsonb;
begin
  if exists (select 1 from team_mail where kind = 'weekly' and created_at > now() - interval '6 days') then return; end if;
  f := team_week_figures();
  insert into team_mail (kind, subject, body) values ('weekly',
    'Daleth AAC: figures of the week (' || to_char((f ->> 'from')::date, 'FMDD Mon') || ' - ' || to_char((f ->> 'to')::date, 'FMDD Mon') || ')',
    team_week_text(f));
end $$;
revoke execute on function public.team_mail_weekly() from public, anon, authenticated, service_role;

create or replace function public.team_mail_test() returns text
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from team_mail_config) then
    return 'Not connected yet. First run: select public.team_mail_connect(''https://YOUR-PROJECT.supabase.co'');';
  end if;
  insert into team_mail (kind, subject, body) values ('test', 'Daleth AAC: the team e-mails work',
    concat_ws(E'\n', 'This is a test.', '',
      'From now on this mailbox receives:',
      '- a message when a professional sends their documents for verification;',
      '- the figures of the week, every Monday morning.'));
  return 'A test e-mail was written. It should arrive within a minute. If not: select * from public.team_mail_check();';
end $$;
revoke execute on function public.team_mail_test() from public, anon, authenticated, service_role;
