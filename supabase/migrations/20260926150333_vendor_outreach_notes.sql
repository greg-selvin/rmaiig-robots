alter table public.record_notes
  add column interaction_type text not null default 'note' check (interaction_type in ('note', 'email', 'call', 'meeting')),
  add column follow_up_date date;

alter table public.opportunities
  add column under_consideration boolean not null default false;
