create table public.organization_types (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null unique,
  position integer not null default 0
);
create table public.ecosystem_roles (
  key text primary key check (key ~ '^[a-z][a-z0-9_]*$'),
  label text not null unique,
  position integer not null default 0
);
insert into public.organization_types(key,label,position) values
('company','Company',0),('government_agency','Government Agency',1),('university','University',2),
('research_institute','Research Institute',3),('investment_firm','Investment Firm',4),
('nonprofit','Nonprofit',5),('industry_association','Industry Association',6),('other','Other',7);
insert into public.ecosystem_roles(key,label,position) values
('vendor','Vendor',0),('distributor','Distributor',1),('integrator','Integrator',2),('investor','Investor',3),
('customer','Customer',4),('research_partner','Research Partner',5),('regulator','Regulator',6),('sponsor','Sponsor',7);
alter table public.organization_types enable row level security;
alter table public.ecosystem_roles enable row level security;
create policy organization_types_read on public.organization_types for select to authenticated using (true);
create policy ecosystem_roles_read on public.ecosystem_roles for select to authenticated using (true);
grant select on public.organization_types,public.ecosystem_roles to authenticated;

alter table public.vendors add column organization_type text not null default 'company' references public.organization_types(key);
create index vendors_organization_type_idx on public.vendors(workspace_id,organization_type);
create table public.organization_roles (
  workspace_id uuid not null references public.workspaces(id),
  organization_id uuid not null references public.vendors(id) on delete cascade,
  role_key text not null references public.ecosystem_roles(key),
  primary key (organization_id,role_key)
);
create index organization_roles_filter_idx on public.organization_roles(workspace_id,role_key,organization_id);
alter table public.organization_roles enable row level security;
create policy organization_roles_read on public.organization_roles for select to authenticated
using (private.member_role(workspace_id) is not null);
grant select on public.organization_roles to authenticated;

insert into public.organization_roles(workspace_id,organization_id,role_key)
select workspace_id,id,'vendor' from public.vendors where entity_type='vendor'
union all select workspace_id,id,'distributor' from public.vendors where entity_type='distributor_integrator'
union all select workspace_id,id,'integrator' from public.vendors where entity_type='distributor_integrator';

drop trigger protect_company_type on public.vendors;
drop trigger seed_distributor_outreach_for_vendor_insert on public.vendors;
drop trigger seed_distributor_outreach_for_vendor_type_change on public.vendors;
drop trigger restore_distributor_outreach_stage on public.vendors;
drop trigger seed_distributor_outreach_for_meetup on public.meetups;
drop trigger audit_company_type_change on public.vendors;
drop function private.protect_company_type();
drop function private.audit_company_type_change();

create function private.organization_has_role(p_id uuid,p_role text) returns boolean
language sql stable set search_path='' as $$
  select exists(select 1 from public.organization_roles where organization_id=p_id and role_key=p_role)
$$;

create or replace function private.validate_distributor_reference() returns trigger
language plpgsql set search_path='' as $$
declare company public.vendors%rowtype;
related public.vendors%rowtype;
outreach public.distributor_outreach%rowtype;
begin
  if tg_table_name='robots' then
    if not private.organization_has_role(new.vendor_id,'vendor') then raise exception 'Robot ownership requires the Vendor role'; end if;
  elsif tg_table_name='distributor_vendor_links' then
    select * into company from public.vendors where id=new.distributor_id;
    select * into related from public.vendors where id=new.vendor_id;
    if company.workspace_id is distinct from new.workspace_id or related.workspace_id is distinct from new.workspace_id
      or not (private.organization_has_role(company.id,'distributor') or private.organization_has_role(company.id,'integrator'))
      or not private.organization_has_role(related.id,'vendor') then raise exception 'Association requires Distributor or Integrator and Vendor roles in this workspace'; end if;
  elsif tg_table_name='distributor_outreach' then
    select * into company from public.vendors where id=new.distributor_id;
    if company.workspace_id is distinct from new.workspace_id
      or (new.meetup_id is not null and not exists(select 1 from public.meetups where id=new.meetup_id and workspace_id=new.workspace_id))
      or (new.stage_id is not null and not exists(select 1 from public.pipeline_stages where id=new.stage_id and workspace_id=new.workspace_id))
    then raise exception 'Invalid organization outreach reference'; end if;
  elsif tg_table_name='distributor_interactions' then
    select * into outreach from public.distributor_outreach where id=new.outreach_id;
    if outreach.workspace_id is distinct from new.workspace_id
      or (new.contact_id is not null and not exists(select 1 from public.contacts where id=new.contact_id and workspace_id=new.workspace_id and vendor_id=outreach.distributor_id))
      or (new.email_template_id is not null and not exists(select 1 from public.email_templates where id=new.email_template_id and workspace_id=new.workspace_id))
    then raise exception 'Invalid organization interaction reference'; end if;
  end if;
  return new;
end $$;

create function private.validate_organization_role() returns trigger
language plpgsql set search_path='' as $$
begin
  if not exists(select 1 from public.vendors where id=new.organization_id and workspace_id=new.workspace_id)
  then raise exception 'Organization role must belong to the same workspace'; end if;
  return new;
end $$;
create trigger organization_role_reference before insert or update on public.organization_roles
for each row execute function private.validate_organization_role();

create or replace function private.seed_distributor_outreach() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='organization_roles' then
    if new.role_key in ('distributor','integrator') then
      insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
      select new.workspace_id,new.organization_id,m.id,
        (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)
      from public.meetups m where m.workspace_id=new.workspace_id on conflict do nothing;
      insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
      values(new.workspace_id,new.organization_id,null,
        (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)) on conflict do nothing;
    end if;
  elsif tg_table_name='meetups' then
    insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
    select new.workspace_id,v.id,new.id,
      (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)
    from public.vendors v where v.workspace_id=new.workspace_id
      and (private.organization_has_role(v.id,'distributor') or private.organization_has_role(v.id,'integrator')) on conflict do nothing;
  end if;
  return new;
end $$;
create trigger seed_organization_role_outreach after insert on public.organization_roles
for each row execute function private.seed_distributor_outreach();
create trigger seed_distributor_outreach_for_meetup after insert on public.meetups
for each row execute function private.seed_distributor_outreach();

create function private.seed_legacy_organization_roles() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.organization_roles(workspace_id,organization_id,role_key)
  select new.workspace_id,new.id,key from public.ecosystem_roles
  where (new.entity_type='vendor' and key='vendor') or (new.entity_type='distributor_integrator' and key in ('distributor','integrator')) on conflict do nothing;
  return new;
end $$;
create trigger seed_legacy_organization_roles after insert on public.vendors
for each row execute function private.seed_legacy_organization_roles();
create trigger legacy_organization_role_update after update of entity_type on public.vendors
for each row when (old.entity_type is distinct from new.entity_type) execute function private.seed_legacy_organization_roles();

create function public.save_organization(p_workspace_id uuid,p_organization_id uuid,p_name text,p_normalized_name text,p_website_url text,p_description text,p_organization_type text,p_roles text[]) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_organization_id uuid;
before_data jsonb;
after_data jsonb;
begin
  if auth.uid() is null or coalesce(private.member_role(p_workspace_id),'') not in ('admin','member') then raise exception 'Organization edit access denied'; end if;
  if nullif(trim(p_name),'') is null or nullif(trim(p_normalized_name),'') is null then raise exception 'Organization name required'; end if;
  if p_roles is null or exists(select 1 from unnest(p_roles) role where not exists(select 1 from public.ecosystem_roles where key=role)) then raise exception 'Unknown ecosystem role'; end if;
  if p_organization_id is null then
    insert into public.vendors(workspace_id,name,normalized_name,website_url,description,organization_type,research_status)
    values(p_workspace_id,trim(p_name),p_normalized_name,p_website_url,p_description,p_organization_type,'queued') returning id into v_organization_id;
  else
    select id into v_organization_id from public.vendors where id=p_organization_id and workspace_id=p_workspace_id for update;
    if v_organization_id is null then raise exception 'Organization not found'; end if;
    select jsonb_build_object('organization_type',organization_type,'roles',coalesce((select jsonb_agg(role_key order by role_key) from public.organization_roles where organization_id=p_organization_id),'[]'::jsonb)) into before_data from public.vendors where id=v_organization_id;
    update public.vendors set name=trim(p_name),normalized_name=p_normalized_name,website_url=p_website_url,description=p_description,organization_type=p_organization_type where id=v_organization_id;
  end if;
  delete from public.organization_roles r where r.organization_id=v_organization_id and not (r.role_key=any(p_roles));
  insert into public.organization_roles(workspace_id,organization_id,role_key)
  select p_workspace_id,v_organization_id,role from (select distinct unnest(p_roles) role) roles on conflict do nothing;
  if 'vendor'=any(p_roles) then
    insert into public.opportunities(workspace_id,vendor_id,robot_id,meetup_id,stage_id)
    select p_workspace_id,v_organization_id,l.robot_id,m.id,
      (select id from public.pipeline_stages where workspace_id=p_workspace_id and not archived order by position limit 1)
    from public.robot_company_links l cross join public.meetups m
    where l.vendor_id=v_organization_id and m.workspace_id=p_workspace_id on conflict do nothing;
  end if;
  after_data=jsonb_build_object('organization_type',p_organization_type,'roles',to_jsonb(array(select distinct unnest(p_roles) order by 1)));
  if before_data is distinct from after_data then
    insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
    values(p_workspace_id,'organization',v_organization_id,'classification_changed',before_data,after_data,auth.uid());
  end if;
  return v_organization_id;
end $$;
revoke all on function public.save_organization(uuid,uuid,text,text,text,text,text,text[]) from public,anon;
grant execute on function public.save_organization(uuid,uuid,text,text,text,text,text,text[]) to authenticated;

create or replace function public.convert_vendor_to_distributor(p_company_id uuid,p_destination_vendor_id uuid default null) returns uuid
language plpgsql security invoker set search_path='' as $$
declare company public.vendors%rowtype;
roles text[];
begin
  select * into company from public.vendors where id=p_company_id;
  select array_agg(role_key) into roles from public.organization_roles where organization_id=p_company_id;
  return public.save_organization(company.workspace_id,company.id,company.name,company.normalized_name,company.website_url,company.description,company.organization_type,coalesce(roles,'{}')||array['distributor','integrator']);
end $$;
