alter table public.record_notes
  add column follow_up_completed boolean not null default false;
