-- Gap review of November 2026, batch 6 (Q51): the app is called "Empower Communication" everywhere,
-- the title of the noon reminder included. Same words otherwise; still no name and no word of the child.
-- Safe to run more than once. Until it has run, the reminder's title stays "Empower".
create or replace function public.push_words(p_kind text, p_lang text) returns table (title text, body text)
language sql immutable as $$
  select case p_kind
           when 'reminder' then 'Empower Communication'
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
