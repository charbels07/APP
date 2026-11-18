-- Minimal stand-in for Supabase's auth system, to test the migrations on a plain PostgreSQL.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  email_confirmed_at timestamptz,
  phone_confirmed_at timestamptz,
  is_anonymous boolean not null default false,
  raw_user_meta_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
-- The signed-in person's token; a tablet's says "is_anonymous": true. Unless a test says otherwise,
-- the token has passed the two-step check ("aal2", as a team member's once the code is typed) and
-- the person signed in just now (the "amr" list: how and when).
create function auth.jwt() returns jsonb language sql stable as $$
  select jsonb_build_object('aal', 'aal2', 'amr', jsonb_build_array(jsonb_build_object('method', 'password', 'timestamp', extract(epoch from now())::bigint)))
      || coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
-- Two-step sign-in (authenticator app) and sign-in sessions, as Supabase keeps them.
create table auth.mfa_factors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  factor_type text not null default 'totp',
  status text not null default 'unverified',
  created_at timestamptz not null default now()
);
create table auth.mfa_challenges (
  id uuid primary key default gen_random_uuid(),
  factor_id uuid not null references auth.mfa_factors (id) on delete cascade,
  created_at timestamptz not null default now(),
  verified_at timestamptz
);
create table auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create function auth.email() returns text language sql stable security definer as $$
  select email from auth.users where id = auth.uid() $$;
grant usage on schema auth to anon, authenticated;
grant usage on schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
