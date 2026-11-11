-- Communication data ("Suivi"): what the child's devices record, only with the family's consent
-- (profile setting dataCollection: off / usage / vocabulary / language), and adults' observations.
-- Seen by the family and the people they allow ("viewData" permission). The app's team only
-- gets anonymous figures (no name, no words) for children whose family chose shareStats = anonymous.

create table public.usage_days (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  device_id text not null,
  day date not null,
  data jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (profile_id, device_id, day)
);
alter table public.usage_days enable row level security;

create table public.observations (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  author_name text not null default '',
  at timestamptz not null,
  sample_t bigint,
  utterance text,
  function text,
  context text,
  partner text,
  autonomy text check (autonomy in ('spontaneous', 'prompted', 'modelled')),
  result text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.observations (profile_id, at desc);
alter table public.observations enable row level security;

-- The family, and the people they allowed to see the data.
create function public.can_view_data(p_profile uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select a.owner or coalesce((a.perms ->> 'manager')::boolean, false) or coalesce((a.perms ->> 'viewData')::boolean, false)
                   from public.access_of(p_profile) a), false)
$$;

-- A device of the child's team saves its day; only what the family's consent allows is kept.
create function public.save_usage_day(p_id uuid, p_dev text, p_day date, p_data jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare
  lvl text;
  d jsonb := p_data;
begin
  if not can_read(p_id) then raise exception 'forbidden'; end if;
  select coalesce(data -> 'settings' ->> 'dataCollection', 'off') into lvl from profiles where id = p_id;
  if lvl is null or lvl not in ('usage', 'vocabulary', 'language') then raise exception 'forbidden'; end if;
  if lvl = 'usage' then d := d - 'concepts' - 'searched' - 'samples'; end if;
  if lvl = 'vocabulary' then d := d - 'samples'; end if;
  d := jsonb_set(d, '{level}', to_jsonb(lvl));
  insert into usage_days (profile_id, device_id, day, data, updated_at)
  values (p_id, p_dev, p_day, d, now())
  on conflict (profile_id, device_id, day) do update set data = excluded.data, updated_at = now();
end $$;

create policy "read usage" on public.usage_days for select to authenticated using (can_view_data(profile_id));
-- The family (or a team manager) can erase everything recorded.
create policy "erase usage" on public.usage_days for delete to authenticated using (is_manager(profile_id));

create policy "read observations" on public.observations for select to authenticated using (can_view_data(profile_id));
create policy "add observations" on public.observations for insert to authenticated
  with check (can_view_data(profile_id) and created_by = auth.uid());
create policy "edit observations" on public.observations for update to authenticated
  using (can_view_data(profile_id)) with check (can_view_data(profile_id));
create policy "delete observations" on public.observations for delete to authenticated using (can_view_data(profile_id));
create trigger no_tablets before insert on public.observations for each row execute function public.no_tablets();

-- For the app's team (Supabase dashboard; later the back-office): anonymous daily figures.
-- No name, no words, no sentences; a scrambled id instead of the child's; only with consent.
create view public.research_usage as
select md5(u.profile_id::text || ':caa-research') as child,
       p.age,
       u.day,
       u.data ->> 'platform' as platform,
       u.data ->> 'level' as level,
       jsonb_array_length(coalesce(u.data -> 'sessions', '[]'::jsonb)) as sessions,
       round(coalesce((select sum((s ->> 'activeMs')::numeric) from jsonb_array_elements(coalesce(u.data -> 'sessions', '[]'::jsonb)) s), 0) / 60000.0, 1) as active_minutes,
       coalesce((u.data ->> 'selections')::int, 0) as selections,
       coalesce((u.data ->> 'utterances')::int, 0) as utterances,
       coalesce((u.data -> 'stats' ->> 'distinctConcepts')::int, 0) as distinct_words,
       coalesce((u.data -> 'stats' ->> 'len1')::int, 0) as one_word_utterances,
       coalesce((u.data -> 'stats' ->> 'len2')::int, 0) as two_word_utterances,
       coalesce((u.data -> 'stats' ->> 'len3plus')::int, 0) as longer_utterances,
       u.data -> 'modes' as selections_by_place,
       u.data -> 'hours' as selections_by_hour
  from public.usage_days u
  join public.profiles p on p.id = u.profile_id
 where p.data -> 'settings' ->> 'shareStats' = 'anonymous';
revoke all on public.research_usage from public, anon, authenticated;

revoke execute on function public.can_view_data(uuid) from public, anon;
