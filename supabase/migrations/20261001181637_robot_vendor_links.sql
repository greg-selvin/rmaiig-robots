create table public.robot_company_links (
  workspace_id uuid not null references public.workspaces(id),
  robot_id uuid not null,
  vendor_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (robot_id, vendor_id),
  constraint robot_company_links_robot_id_fkey foreign key (workspace_id, robot_id) references public.robots(workspace_id, id) on delete cascade,
  constraint robot_company_links_vendor_id_fkey foreign key (workspace_id, vendor_id) references public.vendors(workspace_id, id) on delete cascade
);

insert into public.robot_company_links(workspace_id, robot_id, vendor_id)
select workspace_id, id, vendor_id from public.robots
on conflict do nothing;

create index robot_company_links_vendor_idx on public.robot_company_links(workspace_id, vendor_id);

create function private.validate_robot_vendor_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  if not exists (
    select 1 from public.robots r join public.vendors v on v.id = new.vendor_id
    where r.id = new.robot_id and r.workspace_id = new.workspace_id
      and v.workspace_id = new.workspace_id
  ) then raise exception 'Robot and Vendor must belong to this workspace'; end if;
  return new;
end $$;

create trigger robot_company_link_reference before insert or update on public.robot_company_links
for each row execute function private.validate_robot_vendor_link();

create function private.seed_robot_vendor_link() returns trigger
language plpgsql set search_path = '' as $$
begin
  insert into public.robot_company_links(workspace_id, robot_id, vendor_id)
  values (new.workspace_id, new.id, new.vendor_id)
  on conflict do nothing;
  return new;
end $$;

create trigger seed_robot_company_link after insert on public.robots
for each row execute function private.seed_robot_vendor_link();

drop trigger distributor_robot_reference on public.distributor_robot_selections;
create function private.validate_distributor_robot_selection() returns trigger
language plpgsql set search_path = '' as $$
declare outreach public.distributor_outreach%rowtype;
begin
  select * into outreach from public.distributor_outreach where id = new.outreach_id;
  if outreach.workspace_id is distinct from new.workspace_id or not exists (
    select 1 from public.robots r where r.id = new.robot_id and r.workspace_id = new.workspace_id
      and (
        exists (select 1 from public.robot_company_links l where l.robot_id = r.id and l.vendor_id = outreach.distributor_id)
        or exists (select 1 from public.distributor_vendor_links d
          join public.robot_company_links l on l.vendor_id = d.vendor_id and l.robot_id = r.id
          where d.distributor_id = outreach.distributor_id and d.workspace_id = new.workspace_id)
      )
  ) then raise exception 'Robot is not associated with this Distributor / Integrator'; end if;
  return new;
end $$;

create trigger distributor_robot_reference before insert or update on public.distributor_robot_selections
for each row execute function private.validate_distributor_robot_selection();

alter table public.robot_company_links enable row level security;
create policy robot_company_links_read on public.robot_company_links for select to authenticated
using (private.member_role(workspace_id) is not null);
create policy robot_company_links_insert on public.robot_company_links for insert to authenticated
with check (private.member_role(workspace_id) in ('admin', 'member'));
create policy robot_company_links_update on public.robot_company_links for update to authenticated
using (private.member_role(workspace_id) in ('admin', 'member'))
with check (private.member_role(workspace_id) in ('admin', 'member'));
create policy robot_company_links_delete on public.robot_company_links for delete to authenticated
using (private.member_role(workspace_id) in ('admin', 'member'));
grant select, insert, update, delete on public.robot_company_links to authenticated;
