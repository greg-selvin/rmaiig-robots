create policy vendor_locations_delete
on public.vendor_locations
for delete
to authenticated
using (private.member_role(workspace_id) in ('admin', 'member'));
