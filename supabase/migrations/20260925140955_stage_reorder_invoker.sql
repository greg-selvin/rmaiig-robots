create or replace function public.move_pipeline_stage(p_stage_id uuid,p_direction integer) returns void
language plpgsql security invoker set search_path='' as $$
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
end $$;

create function private.audit_stage_position() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if old.position is distinct from new.position and new.position >= 0 then
    insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
    values(new.workspace_id,'pipeline_stage',new.id,'reordered',
      jsonb_build_object('position',old.position),
      jsonb_build_object('position',new.position),auth.uid());
  end if;
  return new;
end $$;
create trigger audit_stage_position after update of position on public.pipeline_stages
for each row execute function private.audit_stage_position();
