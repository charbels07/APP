-- How many times each account used the AI helper today (server function "caa-ai"):
-- a daily limit keeps the cost under control. Nothing about the request is stored.

create table public.ai_calls (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null default current_date,
  n int not null default 0,
  primary key (user_id, day)
);
alter table public.ai_calls enable row level security;
-- No policy: only count_ai_call (below) touches the table.

-- Adds one call for the signed-in account and returns today's total.
create function public.count_ai_call() returns int
language plpgsql security definer set search_path = public as $$
declare
  total int;
begin
  if auth.uid() is null then raise exception 'unauthorized'; end if;
  insert into ai_calls (user_id, day, n) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set n = ai_calls.n + 1
  returning n into total;
  delete from ai_calls where day < current_date - 30;
  return total;
end $$;
revoke execute on function public.count_ai_call() from public, anon;
grant execute on function public.count_ai_call() to authenticated;
