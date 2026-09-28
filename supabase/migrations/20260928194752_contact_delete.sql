create policy contacts_delete on public.contacts
for delete to authenticated
using (private.member_role(workspace_id) in ('admin', 'member'));

alter table public.interactions
  drop constraint interactions_contact_id_fkey,
  add constraint interactions_contact_id_fkey
  foreign key (contact_id) references public.contacts(id) on delete set null;
