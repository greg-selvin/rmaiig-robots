drop trigger seed_organization_role_outreach on public.organization_roles;

create or replace function private.seed_distributor_outreach() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='vendors' then
    insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
    select new.workspace_id,new.id,m.id,
      (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)
    from public.meetups m where m.workspace_id=new.workspace_id on conflict do nothing;
    insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
    values(new.workspace_id,new.id,null,
      (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)) on conflict do nothing;
  elsif tg_table_name='meetups' then
    insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
    select new.workspace_id,v.id,new.id,
      (select id from public.pipeline_stages where workspace_id=new.workspace_id and not archived order by position limit 1)
    from public.vendors v where v.workspace_id=new.workspace_id on conflict do nothing;
  end if;
  return new;
end $$;

create trigger seed_organization_outreach after insert on public.vendors
for each row execute function private.seed_distributor_outreach();

insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
select v.workspace_id,v.id,m.id,
  (select id from public.pipeline_stages where workspace_id=v.workspace_id and not archived order by position limit 1)
from public.vendors v join public.meetups m on m.workspace_id=v.workspace_id
on conflict do nothing;

insert into public.distributor_outreach(workspace_id,distributor_id,meetup_id,stage_id)
select v.workspace_id,v.id,null,
  (select id from public.pipeline_stages where workspace_id=v.workspace_id and not archived order by position limit 1)
from public.vendors v on conflict do nothing;
