alter table public.vendors add column entity_type text not null default 'vendor'
  check (entity_type in ('vendor', 'distributor_integrator'));

create table public.distributor_vendor_links (
  workspace_id uuid not null references public.workspaces(id),
  distributor_id uuid not null references public.vendors(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (distributor_id, vendor_id),
  check (distributor_id <> vendor_id)
);
create index distributor_vendor_links_vendor_idx on public.distributor_vendor_links(workspace_id, vendor_id);

create table public.distributor_outreach (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  distributor_id uuid not null references public.vendors(id) on delete cascade,
  meetup_id uuid references public.meetups(id) on delete set null,
  meetup_name_snapshot text,
  stage_id uuid references public.pipeline_stages(id),
  board_position numeric not null default 0,
  owner_id uuid references auth.users(id),
  collaborator_ids uuid[] not null default '{}',
  outreach_summary text,
  next_action text,
  next_action_date date,
  last_interaction_at timestamptz,
  outcome text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index distributor_outreach_board_idx on public.distributor_outreach(workspace_id, meetup_id, stage_id, board_position);
create unique index distributor_outreach_meetup_unique on public.distributor_outreach(distributor_id, meetup_id) where meetup_id is not null;
create unique index distributor_outreach_no_meetup_unique on public.distributor_outreach(distributor_id) where meetup_id is null and meetup_name_snapshot is null;

create table public.distributor_robot_selections (
  workspace_id uuid not null references public.workspaces(id),
  outreach_id uuid not null references public.distributor_outreach(id) on delete cascade,
  robot_id uuid not null references public.robots(id),
  selected_at timestamptz not null default now(),
  primary key (outreach_id, robot_id)
);
create index distributor_robot_selections_robot_idx on public.distributor_robot_selections(workspace_id, robot_id);

create table public.distributor_interactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id),
  outreach_id uuid not null references public.distributor_outreach(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete set null,
  interaction_type text not null,
  occurred_at timestamptz not null default now(),
  team_member_id uuid references auth.users(id),
  direction text,
  subject text,
  summary text,
  full_notes text,
  outcome text,
  follow_up_date date,
  email_template_id uuid references public.email_templates(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index distributor_interactions_outreach_idx on public.distributor_interactions(outreach_id, occurred_at desc);

create function private.validate_distributor_reference() returns trigger
language plpgsql set search_path = '' as $$
declare company public.vendors%rowtype;
related public.vendors%rowtype;
outreach public.distributor_outreach%rowtype;
begin
  if tg_table_name = 'robots' then
    select * into company from public.vendors where id = new.vendor_id;
    if company.entity_type <> 'vendor' then raise exception 'Robots must belong to a Vendor'; end if;
  elsif tg_table_name = 'distributor_vendor_links' then
    select * into company from public.vendors where id = new.distributor_id;
    select * into related from public.vendors where id = new.vendor_id;
    if company.workspace_id is distinct from new.workspace_id or company.entity_type <> 'distributor_integrator'
       or related.workspace_id is distinct from new.workspace_id or related.entity_type <> 'vendor'
    then raise exception 'Distributor and Vendor must belong to this workspace'; end if;
  elsif tg_table_name = 'distributor_outreach' then
    select * into company from public.vendors where id = new.distributor_id;
    if company.workspace_id is distinct from new.workspace_id or company.entity_type <> 'distributor_integrator'
       or (new.meetup_id is not null and not exists (select 1 from public.meetups where id = new.meetup_id and workspace_id = new.workspace_id))
       or (new.stage_id is not null and not exists (select 1 from public.pipeline_stages where id = new.stage_id and workspace_id = new.workspace_id))
    then raise exception 'Invalid Distributor / Integrator outreach reference'; end if;
  elsif tg_table_name = 'distributor_robot_selections' then
    select * into outreach from public.distributor_outreach where id = new.outreach_id;
    if outreach.workspace_id is distinct from new.workspace_id or not exists (
      select 1 from public.robots r where r.id = new.robot_id and r.workspace_id = new.workspace_id
        and exists (select 1 from public.distributor_vendor_links l
          where l.distributor_id = outreach.distributor_id and l.vendor_id = r.vendor_id and l.workspace_id = new.workspace_id)
    ) then raise exception 'Robot is not linked to this Distributor / Integrator'; end if;
  elsif tg_table_name = 'distributor_interactions' then
    select * into outreach from public.distributor_outreach where id = new.outreach_id;
    if outreach.workspace_id is distinct from new.workspace_id
       or (new.contact_id is not null and not exists (
         select 1 from public.contacts where id = new.contact_id and workspace_id = new.workspace_id and vendor_id = outreach.distributor_id))
       or (new.email_template_id is not null and not exists (
         select 1 from public.email_templates where id = new.email_template_id and workspace_id = new.workspace_id))
    then raise exception 'Invalid Distributor / Integrator interaction reference'; end if;
  end if;
  return new;
end $$;

create function private.protect_company_type() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.entity_type is distinct from new.entity_type and (
    exists (select 1 from public.robots where vendor_id = old.id)
    or exists (select 1 from public.distributor_vendor_links where distributor_id = old.id or vendor_id = old.id)
    or exists (select 1 from public.distributor_outreach where distributor_id = old.id)
  ) then raise exception 'Cannot change company type while it has linked records'; end if;
  return new;
end $$;
create trigger protect_company_type before update of entity_type on public.vendors
for each row execute function private.protect_company_type();

create function private.seed_distributor_outreach() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name = 'vendors' then
    if new.entity_type = 'distributor_integrator' then
      insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
      select new.workspace_id, new.id, m.id,
        (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1)
      from public.meetups m where m.workspace_id = new.workspace_id;
      insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
      values (new.workspace_id, new.id, null,
        (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1));
    end if;
  elsif tg_table_name = 'meetups' then
    insert into public.distributor_outreach(workspace_id, distributor_id, meetup_id, stage_id)
    select new.workspace_id, v.id, new.id,
      (select id from public.pipeline_stages where workspace_id = new.workspace_id and not archived order by position limit 1)
    from public.vendors v where v.workspace_id = new.workspace_id and v.entity_type = 'distributor_integrator';
  end if;
  return new;
end $$;
create trigger seed_distributor_outreach_for_vendor after insert or update of entity_type on public.vendors
for each row execute function private.seed_distributor_outreach();
create trigger seed_distributor_outreach_for_meetup after insert on public.meetups
for each row execute function private.seed_distributor_outreach();

create function private.snapshot_deleted_distributor_meetup() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.distributor_outreach set meetup_name_snapshot = old.name
  where meetup_id = old.id;
  return old;
end $$;
create trigger snapshot_deleted_distributor_meetup before delete on public.meetups
for each row execute function private.snapshot_deleted_distributor_meetup();

create trigger robot_vendor_type before insert or update of vendor_id on public.robots
for each row execute function private.validate_distributor_reference();
create trigger distributor_link_reference before insert or update on public.distributor_vendor_links
for each row execute function private.validate_distributor_reference();
create trigger distributor_outreach_reference before insert or update on public.distributor_outreach
for each row execute function private.validate_distributor_reference();
create trigger distributor_robot_reference before insert or update on public.distributor_robot_selections
for each row execute function private.validate_distributor_reference();
create trigger distributor_interaction_reference before insert or update on public.distributor_interactions
for each row execute function private.validate_distributor_reference();

create function private.record_distributor_stage_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.stage_id is distinct from new.stage_id then
    insert into public.audit_events(workspace_id, entity_type, entity_id, action, before_data, after_data, actor_id)
    values (new.workspace_id, 'distributor_outreach', new.id, 'stage_changed',
      jsonb_build_object('stage_id', old.stage_id, 'stage_name', (select name from public.pipeline_stages where id = old.stage_id)),
      jsonb_build_object('stage_id', new.stage_id, 'stage_name', (select name from public.pipeline_stages where id = new.stage_id)), auth.uid());
  end if;
  return new;
end $$;
create trigger record_distributor_stage_change after update of stage_id on public.distributor_outreach
for each row execute function private.record_distributor_stage_change();

create function private.prevent_delete_distributor_stage() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.distributor_outreach where stage_id = old.id) then
    raise exception 'Move all Distributor / Integrator Outreach records out of this stage before deleting it';
  end if;
  return old;
end $$;
create trigger prevent_delete_distributor_stage before delete on public.pipeline_stages
for each row execute function private.prevent_delete_distributor_stage();

do $$
declare table_name text;
begin
  foreach table_name in array array['distributor_vendor_links', 'distributor_outreach', 'distributor_robot_selections', 'distributor_interactions'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (private.member_role(workspace_id) is not null)', table_name || '_read', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.member_role(workspace_id) in (''admin'', ''member''))', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (private.member_role(workspace_id) in (''admin'', ''member'')) with check (private.member_role(workspace_id) in (''admin'', ''member''))', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for delete to authenticated using (private.member_role(workspace_id) in (''admin'', ''member''))', table_name || '_delete', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end $$;
