-- Allow a member to leave a project (delete own membership row).
drop policy if exists members_delete_self on public.project_members;
create policy members_delete_self on public.project_members
for delete to authenticated
using (user_id = (select auth.uid()));
