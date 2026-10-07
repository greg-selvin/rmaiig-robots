insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000001','org-test@example.invalid');
insert into public.workspace_members(workspace_id,user_id,role) values ('c02ee290-4f87-4d1f-98c1-24c502126086','00000000-0000-0000-0000-000000000001','admin');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
insert into public.vendors(id,workspace_id,name,normalized_name,entity_type) values
('00000000-0000-0000-0000-000000000010','c02ee290-4f87-4d1f-98c1-24c502126086','Legacy Vendor','legacy vendor','vendor'),
('00000000-0000-0000-0000-000000000020','c02ee290-4f87-4d1f-98c1-24c502126086','Legacy DI','legacy di','distributor_integrator');
insert into public.distributor_vendor_links(workspace_id,distributor_id,vendor_id) values ('c02ee290-4f87-4d1f-98c1-24c502126086','00000000-0000-0000-0000-000000000020','00000000-0000-0000-0000-000000000010');
insert into public.robots(id,workspace_id,vendor_id,name,normalized_name) values ('00000000-0000-0000-0000-000000000030','c02ee290-4f87-4d1f-98c1-24c502126086','00000000-0000-0000-0000-000000000010','Retained Robot','retained robot');
