create unique index contacts_one_primary_per_organization on public.contacts (vendor_id) where preferred;

create function public.set_primary_contact(p_vendor_id uuid, p_contact_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  organization_workspace_id uuid;
begin
  select workspace_id into organization_workspace_id from public.vendors where id = p_vendor_id for update;
  if organization_workspace_id is null or coalesce(private.member_role(organization_workspace_id), '') not in ('admin', 'member') then
    raise exception 'You do not have permission to edit contacts.';
  end if;
  if p_contact_id is not null and not exists (
    select 1 from public.contacts where id = p_contact_id and vendor_id = p_vendor_id and workspace_id = organization_workspace_id
  ) then
    raise exception 'Contact does not belong to this organization.';
  end if;
  update public.contacts set preferred = false where vendor_id = p_vendor_id and workspace_id = organization_workspace_id and preferred and id is distinct from p_contact_id;
  if p_contact_id is not null then
    update public.contacts set preferred = true where id = p_contact_id and vendor_id = p_vendor_id and workspace_id = organization_workspace_id;
    if not found then raise exception 'Could not save primary contact.'; end if;
  end if;
end;
$$;
revoke all on function public.set_primary_contact(uuid, uuid) from public, anon;
grant execute on function public.set_primary_contact(uuid, uuid) to authenticated;
