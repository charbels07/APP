-- The children's voice (server function "caa-voice"): in French and English, a real child's
-- voice of a speech service says the words and sentences instead of the tablet's voice.
-- Each new phrase is one call (the tablet keeps the sound afterwards), so the calls are counted:
-- per account and per day, and for the whole service, to keep the cost under control.
-- Nothing about what was said is stored.

create table public.voice_calls (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.voice_calls enable row level security;
-- No policy: only count_voice_call (below) touches the table.

create table public.voice_budget (
  day date primary key,
  n int not null default 0
);
alter table public.voice_budget enable row level security;
-- No policy: only count_voice_call touches it.

-- Adds one call for the signed-in account and returns today's total. Same door as the AI helper:
-- a sign-in alone is not enough, the account must look after a child here.
create function public.count_voice_call() returns int
language plpgsql security definer set search_path = public as $$
declare
  total int;
  everyone int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  if not exists (select 1 from profiles where owner_id = auth.uid())
     and not exists (select 1 from members where user_id = auth.uid() and status = 'active') then
    raise exception 'forbidden';
  end if;
  insert into voice_budget (day, n) values (current_date, 1)
  on conflict (day) do update set n = voice_budget.n + 1
  returning n into everyone;
  if everyone > 40000 then raise exception 'voice_busy'; end if;
  insert into voice_calls (user_id, day, n) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set n = voice_calls.n + 1
  returning n into total;
  delete from voice_calls where day < current_date - 30;
  delete from voice_budget where day < current_date - 30;
  return total;
end $$;
revoke execute on function public.count_voice_call() from public, anon;
grant execute on function public.count_voice_call() to authenticated;
