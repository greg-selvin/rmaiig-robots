create or replace function public.replace_scoring_model(p_kind text,p_weights jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
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
 return new_id;
end $$;
create function private.record_scoring_model() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.version>1 then
  insert into public.audit_events(workspace_id,entity_type,entity_id,action,before_data,after_data,actor_id)
  values(new.workspace_id,'scoring_model',new.id,'weights_changed',
  jsonb_build_object('prior_version',new.version-1),
  jsonb_build_object('new_version',new.version),auth.uid());
 end if;
 return new;
end $$;
create trigger record_scoring_model after insert on public.scoring_models for each row execute function private.record_scoring_model();
