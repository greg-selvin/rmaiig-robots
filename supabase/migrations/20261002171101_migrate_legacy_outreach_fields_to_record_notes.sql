alter table public.record_notes disable trigger prepare_record_note;

with legacy_outreach as (
  select
    o.workspace_id,
    o.vendor_id,
    r.name as robot_name,
    m.name as meetup_name,
    o.outreach_summary,
    o.next_action,
    o.next_action_date,
    o.outcome,
    o.updated_at
  from public.opportunities o
  join public.meetups m on m.id = o.meetup_id
  join public.robots r on r.id = o.robot_id

  union all

  select
    o.workspace_id,
    o.distributor_id as vendor_id,
    null::text as robot_name,
    coalesce(nullif(trim(o.meetup_name_snapshot), ''), m.name, 'Past Meetup') as meetup_name,
    o.outreach_summary,
    o.next_action,
    o.next_action_date,
    o.outcome,
    o.updated_at
  from public.distributor_outreach o
  left join public.meetups m on m.id = o.meetup_id
), note_candidates as (
  select
    workspace_id,
    vendor_id,
    concat_ws(
      E'\n',
      case
        when robot_name is null then 'DI Outreach history: ' || meetup_name
        else 'Outreach history: ' || meetup_name || ' · ' || robot_name
      end,
      case when nullif(trim(outreach_summary), '') is not null then 'Outreach summary: ' || trim(outreach_summary) end,
      case when nullif(trim(next_action), '') is not null then 'Next action: ' || trim(next_action) end,
      case when next_action_date is not null then 'Next action due: ' || next_action_date::text end,
      case when nullif(trim(outcome), '') is not null then 'Outcome: ' || trim(outcome) end
    ) as body,
    next_action_date as follow_up_date,
    updated_at as created_at
  from legacy_outreach
  where nullif(trim(outreach_summary), '') is not null
    or nullif(trim(next_action), '') is not null
    or next_action_date is not null
    or nullif(trim(outcome), '') is not null
)
insert into public.record_notes (
  workspace_id,
  vendor_id,
  body,
  interaction_type,
  follow_up_date,
  follow_up_completed,
  author_name,
  created_at,
  updated_at,
  is_legacy
)
select
  candidate.workspace_id,
  candidate.vendor_id,
  candidate.body,
  'note',
  candidate.follow_up_date,
  false,
  'Imported from Outreach',
  candidate.created_at,
  candidate.created_at,
  true
from note_candidates candidate
where not exists (
  select 1
  from public.record_notes note
  where note.vendor_id = candidate.vendor_id
    and note.author_name = 'Imported from Outreach'
    and note.is_legacy
    and note.body = candidate.body
);

alter table public.record_notes enable trigger prepare_record_note;
