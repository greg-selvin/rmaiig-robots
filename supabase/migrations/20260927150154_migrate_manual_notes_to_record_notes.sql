begin;

alter table public.record_notes disable trigger prepare_record_note;

insert into public.record_notes (workspace_id, vendor_id, body, author_name, is_legacy)
select v.workspace_id, v.id, v.manual_notes, 'Legacy field migration', true
from public.vendors v
where nullif(trim(v.manual_notes), '') is not null
  and not exists (
    select 1
    from public.record_notes n
    where n.workspace_id = v.workspace_id
      and n.vendor_id = v.id
      and n.body = v.manual_notes
  );

insert into public.record_notes (workspace_id, robot_id, body, author_name, is_legacy)
select r.workspace_id, r.id, r.manual_notes, 'Legacy field migration', true
from public.robots r
where nullif(trim(r.manual_notes), '') is not null
  and not exists (
    select 1
    from public.record_notes n
    where n.workspace_id = r.workspace_id
      and n.robot_id = r.id
      and n.body = r.manual_notes
  );

alter table public.record_notes enable trigger prepare_record_note;

alter table public.vendors drop column manual_notes;
alter table public.robots drop column manual_notes;

commit;
