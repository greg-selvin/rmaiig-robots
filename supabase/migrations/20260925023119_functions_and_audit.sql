alter table public.vendors add column parsing_review_status text not null default 'clear'
 check (parsing_review_status in ('clear','needs_review','reviewed'));

create function public.replace_scoring_model(p_kind text,p_weights jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid := 'c02ee290-4f87-4d1f-98c1-24c502126086';
old_model public.scoring_models%rowtype; new_id uuid; total integer; supplied integer;
begin
 if private.member_role(w) <> 'admin' then raise exception 'Admin required'; end if;
 if p_kind not in ('excitement','participation') then raise exception 'Invalid score kind'; end if;
 select * into old_model from public.scoring_models where workspace_id=w and kind=p_kind and is_active for update;
 if old_model.id is null then raise exception 'Scoring model missing'; end if;
 select count(*),sum((p_weights->>criterion_key)::integer) into supplied,total
 from public.scoring_criteria where model_id=old_model.id and p_weights ? criterion_key;
 if supplied <> (select count(*) from public.scoring_criteria where model_id=old_model.id)
 or (select count(*) from jsonb_object_keys(p_weights)) <> supplied or total <> 100
 or exists(select 1 from jsonb_each_text(p_weights) e where e.value !~ '^\d+$' or e.value::integer not between 0 and 100)
 then raise exception 'Weights must include every criterion and total exactly 100'; end if;
 update public.scoring_models set is_active=false where id=old_model.id;
 insert into public.scoring_models(workspace_id,kind,version,is_active,created_by)
 values(w,p_kind,old_model.version+1,true,auth.uid()) returning id into new_id;
 insert into public.scoring_criteria(workspace_id,model_id,criterion_key,label,description,weight,position)
 select w,new_id,criterion_key,label,description,(p_weights->>criterion_key)::integer,position
 from public.scoring_criteria where model_id=old_model.id;
 insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
 values(w,'scoring_model',new_id,'weights_changed',
  (select jsonb_object_agg(criterion_key,weight) from public.scoring_criteria where model_id=old_model.id),
  p_weights,auth.uid());
 return new_id;
end $$;
revoke all on function public.replace_scoring_model(text,jsonb) from public,anon;
grant execute on function public.replace_scoring_model(text,jsonb) to authenticated;

create function private.record_stage_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.stage_id is distinct from new.stage_id then
  insert into public.stage_history(workspace_id,opportunity_id,from_stage_id,to_stage_id,actor_id)
  values(new.workspace_id,new.id,old.stage_id,new.stage_id,auth.uid());
  insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
  values(new.workspace_id,'opportunity',new.id,'stage_changed',jsonb_build_object('stage_id',old.stage_id),jsonb_build_object('stage_id',new.stage_id),auth.uid());
 end if;
 return new;
end $$;
create trigger record_stage_change after update of stage_id on public.opportunities
for each row execute function private.record_stage_change();
create function private.record_rating_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' or old.manual_rating is distinct from new.manual_rating or old.manual_rationale is distinct from new.manual_rationale then
  insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
  values(new.workspace_id,'rating',new.id,'manual_rating_changed',
   case when tg_op='INSERT' then null else jsonb_build_object('rating',old.manual_rating,'rationale',old.manual_rationale) end,
   jsonb_build_object('rating',new.manual_rating,'rationale',new.manual_rationale),auth.uid());
 end if;
 return new;
end $$;
create trigger record_rating_change after insert or update of manual_rating,manual_rationale on public.ratings
for each row execute function private.record_rating_change();
create function private.validate_workspace_reference() returns trigger language plpgsql set search_path='' as $$
declare id_to_check uuid; table_to_check text; actual_workspace uuid;
begin
 if tg_table_name='robots' then id_to_check=new.vendor_id; table_to_check='vendors';
 elsif tg_table_name='vendor_locations' then id_to_check=new.vendor_id; table_to_check='vendors';
 elsif tg_table_name='contacts' then id_to_check=new.vendor_id; table_to_check='vendors';
 elsif tg_table_name='opportunities' then
  if (select workspace_id from public.vendors where id=new.vendor_id) <> new.workspace_id or
     (select workspace_id from public.robots where id=new.robot_id) <> new.workspace_id or
     (select workspace_id from public.meetups where id=new.meetup_id) <> new.workspace_id or
     (select vendor_id from public.robots where id=new.robot_id) <> new.vendor_id
  then raise exception 'Cross-workspace opportunity reference'; end if;
  return new;
 else return new;
 end if;
 execute format('select workspace_id from public.%I where id=$1',table_to_check) into actual_workspace using id_to_check;
 if actual_workspace is distinct from new.workspace_id then raise exception 'Cross-workspace reference'; end if;
 return new;
end $$;
create trigger vendor_location_workspace before insert or update on public.vendor_locations for each row execute function private.validate_workspace_reference();
create trigger robot_workspace before insert or update on public.robots for each row execute function private.validate_workspace_reference();
create trigger contact_workspace before insert or update on public.contacts for each row execute function private.validate_workspace_reference();
create trigger opportunity_workspace before insert or update on public.opportunities for each row execute function private.validate_workspace_reference();
