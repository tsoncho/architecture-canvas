-- Full row data in Realtime UPDATE/DELETE payloads (needed for reliable peer sync)
alter table public.nodes replica identity full;
alter table public.edges replica identity full;
alter table public.project_members replica identity full;
alter table public.projects replica identity full;
