create policy audit_events_auth_insert
on public.audit_events
for insert
to authenticated
with check (
  private.member_role(workspace_id) is not null
  and entity_type = 'user'
  and entity_id = (select auth.uid())
  and actor_id = (select auth.uid())
  and action in ('login', 'logout')
  and before_data is null
  and after_data is null
);
