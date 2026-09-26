alter table public.vendors add constraint vendors_workspace_id_id_key unique (workspace_id, id);
alter table public.robots add constraint robots_workspace_id_id_key unique (workspace_id, id);

create table public.record_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  vendor_id uuid,
  robot_id uuid,
  body text not null check (length(trim(body)) > 0),
  created_by uuid,
  author_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_legacy boolean not null default false,
  constraint record_notes_one_entity check (num_nonnulls(vendor_id, robot_id) = 1),
  constraint record_notes_vendor_workspace_fkey foreign key (workspace_id, vendor_id) references public.vendors(workspace_id, id) on delete cascade,
  constraint record_notes_robot_workspace_fkey foreign key (workspace_id, robot_id) references public.robots(workspace_id, id) on delete cascade
);

insert into public.record_notes (workspace_id, vendor_id, body, author_name, created_at, updated_at, is_legacy)
select workspace_id, id, manual_notes, 'Unknown author', now(), now(), true
from public.vendors
where nullif(trim(manual_notes), '') is not null;

insert into public.record_notes (workspace_id, robot_id, body, author_name, created_at, updated_at, is_legacy)
select workspace_id, id, manual_notes, 'Unknown author', now(), now(), true
from public.robots
where nullif(trim(manual_notes), '') is not null;

create index record_notes_vendor_created_idx on public.record_notes(workspace_id, vendor_id, created_at desc) where vendor_id is not null;
create index record_notes_robot_created_idx on public.record_notes(workspace_id, robot_id, created_at desc) where robot_id is not null;

create function private.prepare_record_note() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
begin
  if tg_op = 'INSERT' then
    actor_id := (select auth.uid());
    if actor_id is null then raise exception 'Authenticated user required'; end if;
    new.created_by := actor_id;
    select coalesce(
      nullif(trim(p.display_name), ''),
      nullif(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
      nullif(auth.jwt()->>'email', ''),
      'Workspace member'
    ) into new.author_name
    from public.profiles p
    where p.id = actor_id;
    new.author_name := coalesce(new.author_name, nullif(auth.jwt()->>'email', ''), 'Workspace member');
    new.created_at := now();
    new.updated_at := new.created_at;
    new.is_legacy := false;
  else
    new.created_by := old.created_by;
    new.author_name := old.author_name;
    new.created_at := old.created_at;
    new.is_legacy := old.is_legacy;
    new.updated_at := now();
  end if;
  return new;
end
$$;

revoke all on function private.prepare_record_note() from public, anon, authenticated;
create trigger prepare_record_note before insert or update on public.record_notes
for each row execute function private.prepare_record_note();

alter table public.record_notes enable row level security;
create policy record_notes_read on public.record_notes for select to authenticated
using (private.member_role(workspace_id) is not null);
create policy record_notes_insert on public.record_notes for insert to authenticated
with check (private.member_role(workspace_id) in ('admin', 'member') and created_by = (select auth.uid()));
create policy record_notes_update on public.record_notes for update to authenticated
using (private.member_role(workspace_id) in ('admin', 'member') and (created_by = (select auth.uid()) or is_legacy or private.member_role(workspace_id) = 'admin'))
with check (private.member_role(workspace_id) in ('admin', 'member') and (created_by = (select auth.uid()) or is_legacy or private.member_role(workspace_id) = 'admin'));
create policy record_notes_delete on public.record_notes for delete to authenticated
using (private.member_role(workspace_id) in ('admin', 'member') and (created_by = (select auth.uid()) or is_legacy or private.member_role(workspace_id) = 'admin'));

grant select, insert, update, delete on public.record_notes to authenticated;
