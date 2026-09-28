alter table public.stage_history
  add column from_stage_name text,
  add column to_stage_name text;

update public.stage_history history
set from_stage_name = stage.name
from public.pipeline_stages stage
where history.from_stage_id = stage.id;

update public.stage_history history
set to_stage_name = stage.name
from public.pipeline_stages stage
where history.to_stage_id = stage.id;

create function private.snapshot_stage_history_names() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.from_stage_id is not null then
    select stage.name into new.from_stage_name
    from public.pipeline_stages stage where stage.id = new.from_stage_id;
  end if;
  if new.to_stage_id is not null then
    select stage.name into new.to_stage_name
    from public.pipeline_stages stage where stage.id = new.to_stage_id;
  end if;
  return new;
end $$;

create trigger snapshot_stage_history_names before insert on public.stage_history
for each row execute function private.snapshot_stage_history_names();

create function private.delete_empty_pipeline_stage() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if private.member_role(old.workspace_id) is distinct from 'admin' then
    raise exception 'Admin required';
  end if;
  if not old.archived then
    raise exception 'Archive this stage before deleting it';
  end if;
  if exists (select 1 from public.opportunities opportunity where opportunity.stage_id = old.id) then
    raise exception 'Move all opportunities out of this stage before deleting it';
  end if;

  update public.stage_history history
  set from_stage_name = coalesce(history.from_stage_name, old.name),
      from_stage_id = null
  where history.from_stage_id = old.id;

  update public.stage_history history
  set to_stage_name = coalesce(history.to_stage_name, old.name),
      to_stage_id = null
  where history.to_stage_id = old.id;

  insert into public.audit_events(workspace_id, entity_type, entity_id, action, before_data, actor_id)
  values(old.workspace_id, 'pipeline_stage', old.id, 'deleted',
    jsonb_build_object('name', old.name, 'position', old.position, 'color', old.color, 'archived', old.archived), auth.uid());

  return old;
end $$;

create trigger delete_empty_pipeline_stage before delete on public.pipeline_stages
for each row execute function private.delete_empty_pipeline_stage();

revoke delete on public.pipeline_stages from public, anon;
grant delete on public.pipeline_stages to authenticated;
create policy pipeline_stages_delete on public.pipeline_stages
for delete to authenticated using (private.member_role(workspace_id) = 'admin');
