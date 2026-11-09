-- File storage (Supabase Storage): two private buckets.
--  verification-docs/<user id>/…   diplomas and licences, only their owner (and the back-office)
--  profile-media/<profile id>/…     a child's photos and recordings, only the child's team

insert into storage.buckets (id, name, public) values
  ('verification-docs', 'verification-docs', false),
  ('profile-media', 'profile-media', false)
on conflict (id) do nothing;

create function public.try_uuid(t text) returns uuid language plpgsql immutable as $$
begin
  return t::uuid;
exception when others then
  return null;
end $$;

create policy "own verification docs: read" on storage.objects for select to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own verification docs: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own verification docs: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'verification-docs' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "profile media: read" on storage.objects for select to authenticated
  using (bucket_id = 'profile-media' and public.can_read(public.try_uuid((storage.foldername(name))[1])));
create policy "profile media: upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-media' and public.can_read(public.try_uuid((storage.foldername(name))[1])));
create policy "profile media: delete" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-media' and public.is_manager(public.try_uuid((storage.foldername(name))[1])));
