drop trigger seed_distributor_outreach_for_vendor on public.vendors;

create trigger seed_distributor_outreach_for_vendor_insert
after insert on public.vendors
for each row when (new.entity_type = 'distributor_integrator')
execute function private.seed_distributor_outreach();

create trigger seed_distributor_outreach_for_vendor_type_change
after update of entity_type on public.vendors
for each row when (old.entity_type is distinct from new.entity_type and new.entity_type = 'distributor_integrator')
execute function private.seed_distributor_outreach();

alter table public.distributor_outreach add column stage_name_snapshot text;

create or replace function private.record_distributor_stage_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.stage_id is distinct from new.stage_id and new.meetup_name_snapshot is null then
    insert into public.audit_events(workspace_id, entity_type, entity_id, action, before_data, after_data, actor_id)
    values (new.workspace_id, 'distributor_outreach', new.id, 'stage_changed',
      jsonb_build_object('stage_id', old.stage_id, 'stage_name', (select name from public.pipeline_stages where id = old.stage_id)),
      jsonb_build_object('stage_id', new.stage_id, 'stage_name', (select name from public.pipeline_stages where id = new.stage_id)), auth.uid());
  end if;
  return new;
end $$;

update public.distributor_outreach outreach
set stage_name_snapshot = stage.name,
    stage_id = null
from public.pipeline_stages stage
where outreach.meetup_name_snapshot is not null and outreach.stage_id = stage.id;

create or replace function private.snapshot_deleted_distributor_meetup() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.distributor_outreach outreach
  set meetup_name_snapshot = old.name,
      stage_name_snapshot = (select stage.name from public.pipeline_stages stage where stage.id = outreach.stage_id),
      stage_id = null
  where outreach.meetup_id = old.id;
  return old;
end $$;

create function private.record_distributor_interaction_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.distributor_outreach
  set last_interaction_at = greatest(coalesce(last_interaction_at, new.occurred_at), new.occurred_at)
  where id = new.outreach_id;

  insert into public.audit_events(workspace_id, entity_type, entity_id, action, after_data, actor_id)
  values (new.workspace_id, 'distributor_interaction', new.id, 'logged',
    jsonb_build_object('outreach_id', new.outreach_id, 'type', new.interaction_type, 'occurred_at', new.occurred_at), auth.uid());
  return new;
end $$;

create trigger record_distributor_interaction_activity
after insert on public.distributor_interactions
for each row execute function private.record_distributor_interaction_activity();

update public.distributor_outreach outreach
set last_interaction_at = greatest(coalesce(outreach.last_interaction_at, latest.occurred_at), latest.occurred_at)
from (
  select outreach_id, max(occurred_at) as occurred_at
  from public.distributor_interactions
  group by outreach_id
) latest
where outreach.id = latest.outreach_id;
