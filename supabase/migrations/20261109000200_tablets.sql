-- Tablets linked with a pairing code sign in "anonymously" (no email, no password).
-- Anyone holding the app's public key could create such an account, so they may only use
-- the child's profile they were linked to: they cannot start anything new on their own
-- (a new profile, an invitation or connection request, a proposal, a resource, a verification).
-- Triggers run even inside the database's own functions, so no path gets around this.

create function public.is_tablet() returns boolean
language sql stable set search_path = public as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false)
$$;

create function public.no_tablets() returns trigger
language plpgsql set search_path = public as $$
begin
  if is_tablet() then raise exception 'forbidden' using detail = 'tablets cannot do this'; end if;
  return new;
end $$;

create trigger no_tablets before insert on public.profiles for each row execute function public.no_tablets();
create trigger no_tablets before insert on public.invitations for each row execute function public.no_tablets();
create trigger no_tablets before insert on public.proposals for each row execute function public.no_tablets();
create trigger no_tablets before insert on public.resources for each row execute function public.no_tablets();
create trigger no_tablets before insert or update on public.verifications for each row execute function public.no_tablets();

revoke execute on function public.no_tablets() from public, anon, authenticated;
