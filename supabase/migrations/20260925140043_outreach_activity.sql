create function private.record_interaction_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  update public.opportunities
  set last_interaction_at = greatest(coalesce(last_interaction_at,new.occurred_at),new.occurred_at)
  where id = new.opportunity_id;
  insert into public.audit_events(workspace_id,entity_type,entity_id,action,after_data,actor_id)
  values(new.workspace_id,'interaction',new.id,'logged',
    jsonb_build_object('opportunity_id',new.opportunity_id,'type',new.interaction_type,'occurred_at',new.occurred_at),
    auth.uid());
  return new;
end $$;
create trigger record_interaction_activity after insert on public.interactions
for each row execute function private.record_interaction_activity();

create function private.audit_opportunity_fields() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  before_fields jsonb;
  after_fields jsonb;
begin
  before_fields = jsonb_build_object('owner_id',old.owner_id,'collaborator_ids',old.collaborator_ids,
    'next_action',old.next_action,'next_action_date',old.next_action_date,
    'outreach_summary',old.outreach_summary,'outcome',old.outcome);
  after_fields = jsonb_build_object('owner_id',new.owner_id,'collaborator_ids',new.collaborator_ids,
    'next_action',new.next_action,'next_action_date',new.next_action_date,
    'outreach_summary',new.outreach_summary,'outcome',new.outcome);
  if before_fields is distinct from after_fields then
    insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
    values(new.workspace_id,'opportunity',new.id,'fields_changed',before_fields,after_fields,auth.uid());
  end if;
  return new;
end $$;
create trigger audit_opportunity_fields after update on public.opportunities
for each row execute function private.audit_opportunity_fields();
