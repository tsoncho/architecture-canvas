-- Architecture Canvas initial schema
create extension if not exists pgcrypto;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_join_code_format check (join_code ~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$')
);

create unique index projects_join_code_unique on public.projects (upper(join_code));

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_members_user_id_idx on public.project_members (user_id);
create index project_members_project_id_idx on public.project_members (project_id);

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null,
  name text not null default '',
  description text not null default '',
  technology text not null default '',
  color text not null default '#64748b',
  position_x double precision not null default 0,
  position_y double precision not null default 0,
  width double precision not null default 200,
  height double precision not null default 80,
  z_index integer not null default 0,
  parent_group_id uuid references public.nodes(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint nodes_type_check check (type in (
    'application','service','database','api','server','queue','external','user','group','text'
  ))
);

create index nodes_project_id_idx on public.nodes (project_id);

create table public.edges (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  source_node_id uuid not null references public.nodes(id) on delete cascade,
  target_node_id uuid not null references public.nodes(id) on delete cascade,
  label text not null default '',
  edge_type text not null default 'default',
  style jsonb not null default '{}'::jsonb,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index edges_project_id_idx on public.edges (project_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at before update on public.projects
for each row execute function public.set_updated_at();
create trigger nodes_set_updated_at before update on public.nodes
for each row execute function public.set_updated_at();
create trigger edges_set_updated_at before update on public.edges
for each row execute function public.set_updated_at();

create or replace function public.is_project_member(p_project_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members m
    where m.project_id = p_project_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.generate_join_code()
returns text language plpgsql as $$
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

create or replace function public.create_project(p_name text, p_display_name text)
returns public.projects language plpgsql security definer set search_path = public as $$
declare new_project public.projects;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(trim(p_name)) = 0 then raise exception 'Project name required'; end if;
  if length(trim(p_display_name)) = 0 then raise exception 'Display name required'; end if;
  insert into public.projects (name, join_code)
  values (trim(p_name), public.generate_join_code())
  returning * into new_project;
  insert into public.project_members (project_id, user_id, display_name)
  values (new_project.id, auth.uid(), trim(p_display_name));
  return new_project;
end;
$$;

create or replace function public.join_project(p_code text, p_display_name text)
returns public.projects language plpgsql security definer set search_path = public as $$
declare target public.projects; member_count int;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(trim(p_display_name)) = 0 then raise exception 'Display name required'; end if;
  select * into target from public.projects
  where upper(join_code) = upper(replace(trim(p_code), ' ', '')) limit 1;
  if target.id is null then raise exception 'Project not found'; end if;
  if exists (select 1 from public.project_members where project_id = target.id and user_id = auth.uid()) then
    update public.project_members
    set display_name = trim(p_display_name), last_seen_at = now()
    where project_id = target.id and user_id = auth.uid();
    return target;
  end if;
  select count(*) into member_count from public.project_members where project_id = target.id;
  if member_count >= 3 then raise exception 'Project is currently full'; end if;
  insert into public.project_members (project_id, user_id, display_name)
  values (target.id, auth.uid(), trim(p_display_name));
  return target;
end;
$$;

alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.nodes enable row level security;
alter table public.edges enable row level security;

create policy projects_select on public.projects for select to authenticated
using (public.is_project_member(id));
create policy projects_update on public.projects for update to authenticated
using (public.is_project_member(id)) with check (public.is_project_member(id));
create policy members_select on public.project_members for select to authenticated
using (public.is_project_member(project_id));
create policy members_update_self on public.project_members for update to authenticated
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy nodes_select on public.nodes for select to authenticated
using (public.is_project_member(project_id));
create policy nodes_insert on public.nodes for insert to authenticated
with check (
  public.is_project_member(project_id)
  and (select count(*) from public.nodes n where n.project_id = nodes.project_id) < 300
);
create policy nodes_update on public.nodes for update to authenticated
using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy nodes_delete on public.nodes for delete to authenticated
using (public.is_project_member(project_id));
create policy edges_select on public.edges for select to authenticated
using (public.is_project_member(project_id));
create policy edges_insert on public.edges for insert to authenticated
with check (
  public.is_project_member(project_id)
  and (select count(*) from public.edges e where e.project_id = edges.project_id) < 500
);
create policy edges_update on public.edges for update to authenticated
using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy edges_delete on public.edges for delete to authenticated
using (public.is_project_member(project_id));

alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.project_members;
alter publication supabase_realtime add table public.nodes;
alter publication supabase_realtime add table public.edges;

grant usage on schema public to authenticated;
grant select, update on public.projects to authenticated;
grant select, update on public.project_members to authenticated;
grant select, insert, update, delete on public.nodes to authenticated;
grant select, insert, update, delete on public.edges to authenticated;
grant execute on function public.create_project(text, text) to authenticated;
grant execute on function public.join_project(text, text) to authenticated;
grant execute on function public.is_project_member(uuid) to authenticated;
