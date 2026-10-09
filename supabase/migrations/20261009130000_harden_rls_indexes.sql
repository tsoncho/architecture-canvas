-- Harden grants, RLS initplan, search_path, and FK indexes for reliable multi-user sync.

-- Fixed search_path on helper functions
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.generate_join_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRTUVWXY2346789';
  code text;
  i int;
begin
  loop
    code := '';
    for i in 1..3 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    code := code || '-';
    for i in 1..3 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.projects p where upper(p.join_code) = upper(code));
  end loop;
  return code;
end;
$$;

-- Use (select auth.uid()) so RLS plans once per statement (better realtime + sync)
create or replace function public.is_project_member(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_members m
    where m.project_id = p_project_id
      and m.user_id = (select auth.uid())
  );
$$;

drop policy if exists members_update_self on public.project_members;
create policy members_update_self on public.project_members
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Recreate table policies with stable member check (idempotent)
drop policy if exists projects_select on public.projects;
create policy projects_select on public.projects
for select to authenticated
using (public.is_project_member(id));

drop policy if exists projects_update on public.projects;
create policy projects_update on public.projects
for update to authenticated
using (public.is_project_member(id))
with check (public.is_project_member(id));

drop policy if exists members_select on public.project_members;
create policy members_select on public.project_members
for select to authenticated
using (public.is_project_member(project_id));

drop policy if exists nodes_select on public.nodes;
create policy nodes_select on public.nodes
for select to authenticated
using (public.is_project_member(project_id));

drop policy if exists nodes_insert on public.nodes;
create policy nodes_insert on public.nodes
for insert to authenticated
with check (
  public.is_project_member(project_id)
  and (select count(*) from public.nodes n where n.project_id = nodes.project_id) < 300
);

drop policy if exists nodes_update on public.nodes;
create policy nodes_update on public.nodes
for update to authenticated
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

drop policy if exists nodes_delete on public.nodes;
create policy nodes_delete on public.nodes
for delete to authenticated
using (public.is_project_member(project_id));

drop policy if exists edges_select on public.edges;
create policy edges_select on public.edges
for select to authenticated
using (public.is_project_member(project_id));

drop policy if exists edges_insert on public.edges;
create policy edges_insert on public.edges
for insert to authenticated
with check (
  public.is_project_member(project_id)
  and (select count(*) from public.edges e where e.project_id = edges.project_id) < 500
);

drop policy if exists edges_update on public.edges;
create policy edges_update on public.edges
for update to authenticated
using (public.is_project_member(project_id))
with check (public.is_project_member(project_id));

drop policy if exists edges_delete on public.edges;
create policy edges_delete on public.edges
for delete to authenticated
using (public.is_project_member(project_id));

-- Anon must not call project RPCs (only device bootstrap). Authenticated keeps them.
revoke all on function public.create_project(text, text) from public, anon;
revoke all on function public.join_project(text, text) from public, anon;
revoke all on function public.is_project_member(uuid) from public, anon;
grant execute on function public.create_project(text, text) to authenticated;
grant execute on function public.join_project(text, text) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;

-- ensure_device_user stays callable by anon (sign-in bootstrap)
revoke all on function public.ensure_device_user(text, text, text, text) from public;
grant execute on function public.ensure_device_user(text, text, text, text) to anon, authenticated;

-- FK covering indexes (sync/delete performance)
create index if not exists edges_source_node_id_idx on public.edges (source_node_id);
create index if not exists edges_target_node_id_idx on public.edges (target_node_id);
create index if not exists edges_updated_by_idx on public.edges (updated_by);
create index if not exists nodes_parent_group_id_idx on public.nodes (parent_group_id);
create index if not exists nodes_updated_by_idx on public.nodes (updated_by);

-- Keep Realtime payloads complete for peers
alter table public.nodes replica identity full;
alter table public.edges replica identity full;
alter table public.project_members replica identity full;
alter table public.projects replica identity full;
