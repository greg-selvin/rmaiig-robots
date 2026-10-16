begin;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
do $$
declare v_id uuid;
new_meetup uuid;
no_roles_id uuid;
outreach_count integer;
workspace uuid='c02ee290-4f87-4d1f-98c1-24c502126086';
legacy_vendor uuid='00000000-0000-0000-0000-000000000010';
legacy_di uuid='00000000-0000-0000-0000-000000000020';
begin
  if (select organization_type from public.vendors where id='00000000-0000-0000-0000-000000000040')<>'government_agency' then raise exception 'Government identity backfill failed'; end if;
  if (select organization_type from public.vendors where id='00000000-0000-0000-0000-000000000050')<>'university' then raise exception 'University identity backfill failed'; end if;
  if (select organization_type from public.vendors where id=legacy_vendor)<>'company' then raise exception 'Vendor type backfill failed'; end if;
  if not exists(select 1 from public.organization_roles where organization_id=legacy_vendor and role_key='vendor') then raise exception 'Vendor role backfill failed'; end if;
  if (select count(*) from public.organization_roles where organization_id=legacy_di and role_key in ('distributor','integrator'))<>2 then raise exception 'Combined DI backfill failed'; end if;
  v_id=public.save_organization(workspace,null,'Test University','test university',null,null,'university',array['research_partner','customer','sponsor','sponsor']);
  if not exists(select 1 from public.distributor_outreach where distributor_id=v_id and meetup_id is null) then raise exception 'Organization without deployment roles missing default outreach'; end if;
  if exists(select 1 from public.meetups m where m.workspace_id=workspace and not exists(select 1 from public.distributor_outreach d where d.distributor_id=v_id and d.meetup_id=m.id)) then raise exception 'Organization missing meetup outreach'; end if;
  if exists(select 1 from public.vendors v join public.meetups m on m.workspace_id=v.workspace_id where not exists(select 1 from public.distributor_outreach d where d.distributor_id=v.id and d.meetup_id=m.id)) then raise exception 'Existing organization outreach backfill failed'; end if;
  select count(*) into outreach_count from public.distributor_outreach where distributor_id=v_id;
  if (select count(*) from public.organization_roles where organization_id=v_id)<>3 then raise exception 'Unique multiple roles failed'; end if;
  if not exists(select 1 from public.vendors v join public.organization_roles r on r.organization_id=v.id where v.organization_type='university' and r.role_key='sponsor' and v.id=v_id) then raise exception 'Type and role filtering failed'; end if;
  perform public.save_organization(workspace,v_id,'Test University','test university',null,null,'university','{}');
  if exists(select 1 from public.organization_roles where organization_id=v_id) then raise exception 'Zero roles failed'; end if;
  perform public.save_organization(workspace,v_id,'Test University','test university',null,null,'university',array['integrator','distributor']);
  if (select count(*) from public.distributor_outreach where distributor_id=v_id)<>outreach_count then raise exception 'Role changes duplicated outreach'; end if;
  no_roles_id=public.save_organization(workspace,null,'No Roles','no roles',null,null,'other','{}');
  if not exists(select 1 from public.distributor_outreach where distributor_id=no_roles_id and meetup_id is null) then raise exception 'Zero-role creation missing outreach'; end if;
  insert into public.meetups(workspace_id,name,city,country) values(workspace,'New Meetup','Boulder','USA') returning id into new_meetup;
  if exists(select 1 from public.vendors v where v.workspace_id=workspace and not exists(select 1 from public.distributor_outreach d where d.distributor_id=v.id and d.meetup_id=new_meetup)) then raise exception 'New meetup missing organization outreach'; end if;
  perform public.save_organization(workspace,v_id,'Test University','test university',null,null,'university','{}');
  perform public.save_organization(workspace,legacy_vendor,'Legacy Vendor','legacy vendor',null,null,'company',array['vendor','integrator']);
  if (select vendor_id from public.robots where id='00000000-0000-0000-0000-000000000030')<>legacy_vendor then raise exception 'Role change transferred robot'; end if;
  if not exists(select 1 from public.distributor_vendor_links where distributor_id=legacy_di and vendor_id=legacy_vendor) then raise exception 'Role change removed association'; end if;
  if not exists(select 1 from public.distributor_outreach where distributor_id=legacy_vendor) then raise exception 'Deployment outreach seed failed'; end if;
  perform public.save_organization(workspace,legacy_vendor,'Legacy Vendor','legacy vendor',null,null,'government_agency','{}');
  if not exists(select 1 from public.robot_company_links where vendor_id=legacy_vendor) then raise exception 'Removing roles deleted robot relationship'; end if;
  if not exists(select 1 from public.distributor_outreach where distributor_id=legacy_vendor) then raise exception 'Removing roles deleted outreach'; end if;
  begin
    perform public.save_organization(workspace,v_id,'Invalid','invalid',null,null,'university',array['unknown_role']);
    raise exception 'Unknown role was accepted';
  exception when raise_exception then if sqlerrm='Unknown role was accepted' then raise; end if; end;
  begin
    perform public.save_organization(workspace,v_id,'Invalid','invalid',null,null,'unknown_type','{}');
    raise exception 'Unknown type was accepted';
  exception when foreign_key_violation then null; end;
  if (select name from public.vendors where id=v_id)<>'Test University' then raise exception 'Failed save was not atomic'; end if;
end $$;
set local role authenticated;
do $$
begin
  if not exists(select 1 from public.organization_roles) then raise exception 'Member cannot read roles'; end if;
  begin
    insert into public.organization_roles values ('c02ee290-4f87-4d1f-98c1-24c502126086','00000000-0000-0000-0000-000000000010','sponsor');
    raise exception 'Direct role write unexpectedly allowed';
  exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000099',true);
do $$
begin
  if exists(select 1 from public.organization_roles) then raise exception 'Nonmember sees roles'; end if;
  begin
    perform public.save_organization('c02ee290-4f87-4d1f-98c1-24c502126086',null,'Forbidden','forbidden',null,null,'company','{}');
    raise exception 'Unauthorized save unexpectedly allowed';
  exception when raise_exception then if sqlerrm='Unauthorized save unexpectedly allowed' then raise; end if; end;
end $$;
rollback;
