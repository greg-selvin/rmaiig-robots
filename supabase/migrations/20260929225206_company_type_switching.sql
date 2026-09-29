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
  elsif exists (select 1 from public.distributor_vendor_links where distributor_id = old.id) then
    raise exception 'Unlink associated Vendors before changing this Distributor / Integrator to a Vendor';
  end if;

  return new;
end $$;

create or replace function private.seed_distributor_outreach() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'vendors' then
    if new.entity_type = 'distributor_integrator' then
      insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
      select new.workspace_id, new.id, m.id,
        (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1)
      from public.meetups m where m.workspace_id = new.workspace_id
      on conflict do nothing;

      insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
      values (new.workspace_id, new.id, null,
        (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1))
      on conflict do nothing;
    end if;
  elsif tg_table_name = 'meetups' then
    insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
    select new.workspace_id, v.id, new.id,
      (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1)
    from public.vendors v where v.workspace_id = new.workspace_id and v.entity_type = 'distributor_integrator'
    on conflict do nothing;
  end if;
  return new;
end $$;

create function private.audit_company_type_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_events(workspace_id, entity_type, entity_id, action, before_data, after_data, actor_id)
  values (new.workspace_id, 'company', new.id, 'type_changed',
    jsonb_build_object('entity_type', old.entity_type),
    jsonb_build_object('entity_type', new.entity_type), auth.uid());
  return new;
end $$;

create trigger audit_company_type_change
after update of entity_type on public.vendors
for each row when (old.entity_type is distinct from new.entity_type)
execute function private.audit_company_type_change();
