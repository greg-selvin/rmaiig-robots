create function private.enforce_workspace_references() returns trigger
language plpgsql security definer set search_path='' as $$
declare
  source_id uuid;
begin
  if tg_table_name = 'opportunities' then
    if new.stage_id is not null and not exists (
      select 1 from public.pipeline_stages s where s.id = new.stage_id and s.workspace_id = new.workspace_id
    ) then raise exception 'Stage belongs to another workspace'; end if;
  elsif tg_table_name = 'interactions' then
    if not exists (
      select 1 from public.opportunities o
      where o.id = new.opportunity_id and o.workspace_id = new.workspace_id and o.vendor_id = new.vendor_id
    ) then raise exception 'Interaction opportunity/vendor mismatch'; end if;
    if new.contact_id is not null and not exists (
      select 1 from public.contacts c
      where c.id = new.contact_id and c.workspace_id = new.workspace_id and c.vendor_id = new.vendor_id
    ) then raise exception 'Interaction contact/vendor mismatch'; end if;
    if new.email_template_id is not null and not exists (
      select 1 from public.email_templates t where t.id = new.email_template_id and t.workspace_id = new.workspace_id
    ) then raise exception 'Email template belongs to another workspace'; end if;
  elsif tg_table_name = 'scoring_criteria' then
    if not exists (
      select 1 from public.scoring_models m where m.id = new.model_id and m.workspace_id = new.workspace_id
    ) then raise exception 'Scoring model belongs to another workspace'; end if;
  elsif tg_table_name = 'ratings' then
    if new.kind = 'excitement' and not exists (
      select 1 from public.robots r where r.id = new.robot_id and r.workspace_id = new.workspace_id
    ) then raise exception 'Robot rating belongs to another workspace'; end if;
    if new.kind = 'participation' and not exists (
      select 1 from public.opportunities o where o.id = new.opportunity_id and o.workspace_id = new.workspace_id
    ) then raise exception 'Opportunity rating belongs to another workspace'; end if;
    if not exists (
      select 1 from public.scoring_models m join public.scoring_criteria c on c.model_id = m.id
      where m.workspace_id = new.workspace_id and m.kind = new.kind and c.criterion_key = new.criterion_key
    ) then raise exception 'Unknown scoring criterion'; end if;
    foreach source_id in array new.source_ids loop
      if not exists (
        select 1 from public.research_sources s where s.id = source_id and s.workspace_id = new.workspace_id
      ) then raise exception 'Rating source belongs to another workspace'; end if;
    end loop;
  elsif tg_table_name in ('research_sources', 'research_jobs') then
    if new.vendor_id is not null and not exists (
      select 1 from public.vendors v where v.id = new.vendor_id and v.workspace_id = new.workspace_id
    ) then raise exception 'Research vendor belongs to another workspace'; end if;
    if new.robot_id is not null and not exists (
      select 1 from public.robots r
      where r.id = new.robot_id and r.workspace_id = new.workspace_id
        and (new.vendor_id is null or r.vendor_id = new.vendor_id)
    ) then raise exception 'Research robot/vendor mismatch'; end if;
  elsif tg_table_name = 'stage_history' then
    if not exists (
      select 1 from public.opportunities o where o.id = new.opportunity_id and o.workspace_id = new.workspace_id
    ) then raise exception 'Stage history opportunity belongs to another workspace'; end if;
  end if;
  return new;
end $$;

create trigger opportunity_stage_integrity before insert or update on public.opportunities
for each row execute function private.enforce_workspace_references();
create trigger interaction_reference_integrity before insert or update on public.interactions
for each row execute function private.enforce_workspace_references();
create trigger criterion_reference_integrity before insert or update on public.scoring_criteria
for each row execute function private.enforce_workspace_references();
create trigger rating_reference_integrity before insert or update on public.ratings
for each row execute function private.enforce_workspace_references();
create trigger source_reference_integrity before insert or update on public.research_sources
for each row execute function private.enforce_workspace_references();
create trigger job_reference_integrity before insert or update on public.research_jobs
for each row execute function private.enforce_workspace_references();
create trigger stage_history_reference_integrity before insert or update on public.stage_history
for each row execute function private.enforce_workspace_references();
