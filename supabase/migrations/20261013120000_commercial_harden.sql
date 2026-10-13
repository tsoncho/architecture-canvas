-- Commercial harden: CSPRNG join codes, atomic join, field limits, join_code immutability.

-- Cryptographically stronger join codes (gen_random_bytes via pgcrypto)
create or replace function public.generate_join_code()
returns text
language plpgsql
set search_path = public, extensions
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRTUVWXY2346789';
  alphabet_len int := length(alphabet);
  code text;
  i int;
  b int;
begin
  loop
    code := '';
    for i in 1..3 loop
      -- Reject bytes that would bias modulo alphabet_len (29)
      loop
        b := get_byte(gen_random_bytes(1), 0);
        exit when b < (256 - (256 % alphabet_len));
      end loop;
      code := code || substr(alphabet, 1 + (b % alphabet_len), 1);
    end loop;
    code := code || '-';
    for i in 1..3 loop
      loop
        b := get_byte(gen_random_bytes(1), 0);
        exit when b < (256 - (256 % alphabet_len));
      end loop;
      code := code || substr(alphabet, 1 + (b % alphabet_len), 1);
    end loop;
    exit when not exists (
      select 1 from public.projects p where upper(p.join_code) = upper(code)
    );
  end loop;
  return code;
end;
$$;

-- Prevent members from rewriting join codes or project ids
create or replace function public.projects_guard_immutable_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Project id cannot be changed';
  end if;
  if new.join_code is distinct from old.join_code then
    raise exception 'Join code cannot be changed';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'created_at cannot be changed';
  end if;
  new.name := left(trim(new.name), 120);
  if length(new.name) = 0 then
    raise exception 'Project name required';
  end if;
  return new;
end;
$$;

drop trigger if exists projects_guard_immutable_fields on public.projects;
create trigger projects_guard_immutable_fields
before update on public.projects
for each row execute function public.projects_guard_immutable_fields();

-- Length / sanity constraints (additive; existing rows should already fit)
alter table public.projects
  drop constraint if exists projects_name_length;
alter table public.projects
  add constraint projects_name_length check (char_length(name) between 1 and 120);

alter table public.project_members
  drop constraint if exists members_display_name_length;
alter table public.project_members
  add constraint members_display_name_length check (char_length(display_name) between 1 and 80);

alter table public.nodes
  drop constraint if exists nodes_name_length;
alter table public.nodes
  add constraint nodes_name_length check (char_length(name) <= 120);

alter table public.nodes
  drop constraint if exists nodes_technology_length;
alter table public.nodes
  add constraint nodes_technology_length check (char_length(technology) <= 120);

alter table public.nodes
  drop constraint if exists nodes_description_length;
alter table public.nodes
  add constraint nodes_description_length check (char_length(description) <= 4000);

alter table public.edges
  drop constraint if exists edges_label_length;
alter table public.edges
  add constraint edges_label_length check (char_length(label) <= 120);

-- Truncate + validate on create/join
create or replace function public.create_project(p_name text, p_display_name text)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  new_project public.projects;
  v_name text := left(trim(coalesce(p_name, '')), 120);
  v_display text := left(trim(coalesce(p_display_name, '')), 80);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(v_name) = 0 then
    raise exception 'Project name required';
  end if;
  if length(v_display) = 0 then
    raise exception 'Display name required';
  end if;

  insert into public.projects (name, join_code)
  values (v_name, public.generate_join_code())
  returning * into new_project;

  insert into public.project_members (project_id, user_id, display_name)
  values (new_project.id, auth.uid(), v_display);

  return new_project;
end;
$$;

create or replace function public.join_project(p_code text, p_display_name text)
returns public.projects
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.projects;
  member_count int;
  v_code text := upper(replace(trim(coalesce(p_code, '')), ' ', ''));
  v_display text := left(trim(coalesce(p_display_name, '')), 80);
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if length(v_display) = 0 then
    raise exception 'Display name required';
  end if;
  if v_code !~ '^[A-Z2-9]{3}-[A-Z2-9]{3}$' then
    raise exception 'Invalid join code';
  end if;

  select * into target
  from public.projects
  where upper(join_code) = v_code
  limit 1;

  if target.id is null then
    -- Same message for missing vs malformed lookup results (no project metadata leak)
    raise exception 'Invalid join code';
  end if;

  -- Serialize concurrent joins for this project (prevents 4th seat race)
  perform pg_advisory_xact_lock(hashtextextended(target.id::text, 0));

  if exists (
    select 1
    from public.project_members
    where project_id = target.id and user_id = auth.uid()
  ) then
    update public.project_members
    set display_name = v_display, last_seen_at = now()
    where project_id = target.id and user_id = auth.uid();
    return target;
  end if;

  select count(*) into member_count
  from public.project_members
  where project_id = target.id;

  if member_count >= 3 then
    raise exception 'Project is currently full';
  end if;

  insert into public.project_members (project_id, user_id, display_name)
  values (target.id, auth.uid(), v_display);

  return target;
end;
$$;

revoke all on function public.create_project(text, text) from public, anon;
revoke all on function public.join_project(text, text) from public, anon;
grant execute on function public.create_project(text, text) to authenticated;
grant execute on function public.join_project(text, text) to authenticated;
