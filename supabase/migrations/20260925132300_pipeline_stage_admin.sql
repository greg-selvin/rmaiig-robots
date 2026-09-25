create function private.audit_pipeline_stage_settings() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'UPDATE' then
    if new.archived and not old.archived and exists (
      select 1 from public.opportunities o where o.stage_id = new.id
    ) then raise exception 'Move opportunities before archiving this stage'; end if;
    if row(new.name,new.color,new.archived) is distinct from row(old.name,old.color,old.archived) then
      insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
      values(new.workspace_id,'pipeline_stage',new.id,'settings_changed',
        jsonb_build_object('name',old.name,'color',old.color,'archived',old.archived),
        jsonb_build_object('name',new.name,'color',new.color,'archived',new.archived),auth.uid());
    end if;
  else
    insert into public.audit_events(workspace_id,entity_type,entity_id,action,after_data,actor_id)
    values(new.workspace_id,'pipeline_stage',new.id,'created',
      jsonb_build_object('name',new.name,'color',new.color),auth.uid());
  end if;
  return new;
end $$;
create trigger audit_pipeline_stage_settings after insert or update on public.pipeline_stages
for each row execute function private.audit_pipeline_stage_settings();

create function public.move_pipeline_stage(p_stage_id uuid,p_direction integer) returns void
language plpgsql security definer set search_path='' as $$
declare
  current_stage public.pipeline_stages%rowtype;
  adjacent public.pipeline_stages%rowtype;
begin
  if p_direction not in (-1,1) then raise exception 'Direction must be -1 or 1'; end if;
  select * into current_stage from public.pipeline_stages where id = p_stage_id for update;
  if current_stage.id is null then raise exception 'Stage not found'; end if;
  if private.member_role(current_stage.workspace_id) <> 'admin' then raise exception 'Admin required'; end if;
  if p_direction = -1 then
    select * into adjacent from public.pipeline_stages
    where workspace_id = current_stage.workspace_id and position < current_stage.position
    order by position desc limit 1 for update;
  else
    select * into adjacent from public.pipeline_stages
    where workspace_id = current_stage.workspace_id and position > current_stage.position
    order by position limit 1 for update;
  end if;
  if adjacent.id is null then return; end if;
  update public.pipeline_stages set position = -1 where id = current_stage.id;
  update public.pipeline_stages set position = current_stage.position where id = adjacent.id;
  update public.pipeline_stages set position = adjacent.position where id = current_stage.id;
  insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
  values(current_stage.workspace_id,'pipeline_stage',current_stage.id,'reordered',
    jsonb_build_object('position',current_stage.position),
    jsonb_build_object('position',adjacent.position),auth.uid());
end $$;
revoke all on function public.move_pipeline_stage(uuid,integer) from public,anon;
grant execute on function public.move_pipeline_stage(uuid,integer) to authenticated;
