-- Creating a child's profile asks the new row back in the same step. The database then checks
-- the "read" rule on that row, but a rule that looks the profile up again cannot see it yet
-- (it only exists once the step is over), so the creation was refused. The owner check now reads
-- the row itself; team members still go through can_read().
drop policy "read profiles" on public.profiles;
create policy "read profiles" on public.profiles for select to authenticated
  using (owner_id = auth.uid() or can_read(id));
