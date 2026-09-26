alter table public.opportunities alter column meetup_id drop not null;
alter table public.opportunities drop constraint opportunities_meetup_id_fkey;
alter table public.opportunities add constraint opportunities_meetup_id_fkey foreign key (meetup_id) references public.meetups(id) on delete set null;
create policy meetups_delete on public.meetups for delete to authenticated using (private.member_role(workspace_id) = 'admin');
