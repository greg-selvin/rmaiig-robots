alter table public.opportunities add column stage_name_snapshot text;

alter table public.opportunities drop constraint opportunities_robot_id_meetup_id_key;
alter table public.opportunities add constraint opportunities_vendor_robot_meetup_key unique (vendor_id, robot_id, meetup_id);

create or replace function private.protect_company_type() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.entity_type is not distinct from new.entity_type then
    return new;
  end if;

  if new.entity_type = 'distributor_integrator' then
    if exists (select 1 from public.robots where vendor_id = old.id) then
      raise exception 'Reassign this Vendor''s Robots before changing it to a Distributor / Integrator';
    end if;
    if exists (select 1 from public.distributor_vendor_links where vendor_id = old.id) then
      raise exception 'Unlink this Vendor from its Distributors / Integrators before changing its type';
    end if;
  else
    if exists (select 1 from public.distributor_vendor_links where distributor_id = old.id) then
      raise exception 'Unlink associated Vendors before changing this Distributor / Integrator to a Vendor';
    end if;
    update public.distributor_outreach outreach
    set stage_name_snapshot = (select stage.name from public.pipeline_stages stage where stage.id = outreach.stage_id),
        stage_id = null
    where outreach.distributor_id = old.id and outreach.stage_id is not null;
  end if;

  return new;
end $$;

create function private.restore_distributor_outreach_stage() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.distributor_outreach outreach
  set stage_id = (select stage.id from public.pipeline_stages stage
    where stage.workspace_id = new.workspace_id and not stage.archived order by stage.position limit 1)
  where outreach.distributor_id = new.id and outreach.stage_id is null
    and outreach.meetup_name_snapshot is null;
  return new;
end $$;

create trigger restore_distributor_outreach_stage
after update of entity_type on public.vendors
for each row when (old.entity_type is distinct from new.entity_type and new.entity_type = 'distributor_integrator')
execute function private.restore_distributor_outreach_stage();

create function public.convert_vendor_to_distributor(p_company_id uuid, p_destination_vendor_id uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  company public.vendors%rowtype;
  destination public.vendors%rowtype;
  initial_stage_id uuid;
  transferred_robot_ids uuid[];
begin
  select * into company from public.vendors where id = p_company_id for update;
  if company.id is null or coalesce(private.member_role(company.workspace_id), '') not in ('admin', 'member') then
    raise exception 'Company not found or edit access denied';
  end if;
  if company.entity_type <> 'vendor' then
    raise exception 'Company is already a Distributor / Integrator';
  end if;
  if exists (select 1 from public.distributor_vendor_links where vendor_id = company.id) then
    raise exception 'Unlink this Vendor from its Distributors / Integrators first';
  end if;

  if p_destination_vendor_id is not null then
    select * into destination from public.vendors where id = p_destination_vendor_id for update;
    if destination.id is null or destination.id = company.id or destination.workspace_id <> company.workspace_id or destination.entity_type <> 'vendor' then
      raise exception 'Choose another Vendor in the same workspace';
    end if;
  elsif exists (select 1 from public.robots where vendor_id = company.id) then
    raise exception 'Choose a destination Vendor for this company''s Robots';
  end if;

  if p_destination_vendor_id is not null then
    select coalesce(array_agg(id), '{}'::uuid[]) into transferred_robot_ids
    from public.robots where vendor_id = company.id;
    if exists (
      select 1 from public.robots source_robot
      join public.robots destination_robot on destination_robot.vendor_id = destination.id
        and destination_robot.normalized_name = source_robot.normalized_name
      where source_robot.vendor_id = company.id
    ) then raise exception 'Destination Vendor already has a Robot with the same name'; end if;

    update public.opportunities opportunity
    set stage_name_snapshot = coalesce(opportunity.stage_name_snapshot,
      (select stage.name from public.pipeline_stages stage where stage.id = opportunity.stage_id)), stage_id = null
    where opportunity.robot_id = any(transferred_robot_ids)
      and opportunity.vendor_id = company.id and opportunity.stage_id is not null;

    update public.robots set vendor_id = destination.id where vendor_id = company.id;

    select id into initial_stage_id from public.pipeline_stages
    where workspace_id = company.workspace_id and not archived order by position limit 1;

    insert into public.opportunities(workspace_id, vendor_id, robot_id, meetup_id, stage_id)
    select company.workspace_id, destination.id, robot.id, meetup.id, initial_stage_id
    from public.robots robot cross join public.meetups meetup
    where robot.id = any(transferred_robot_ids) and meetup.workspace_id = company.workspace_id
    on conflict (vendor_id, robot_id, meetup_id) do update
      set stage_id = coalesce(public.opportunities.stage_id, excluded.stage_id);
  end if;

  update public.vendors set entity_type = 'distributor_integrator' where id = company.id;

  if p_destination_vendor_id is not null then
    insert into public.distributor_vendor_links(workspace_id, distributor_id, vendor_id)
    values (company.workspace_id, company.id, destination.id)
    on conflict do nothing;
  end if;

  return company.id;
end $$;

revoke all on function public.convert_vendor_to_distributor(uuid, uuid) from public, anon;
grant execute on function public.convert_vendor_to_distributor(uuid, uuid) to authenticated;
