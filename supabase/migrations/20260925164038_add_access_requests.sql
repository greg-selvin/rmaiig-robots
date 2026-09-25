create table public.access_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  first_name text,
  last_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  requested_at timestamptz not null default now(),
  notification_sent_at timestamptz,
  notification_error text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  unique (workspace_id, user_id)
);

alter table public.access_requests enable row level security;
revoke all on public.access_requests from anon, authenticated;
grant select on public.access_requests to authenticated;

create policy access_requests_read on public.access_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or private.member_role(workspace_id) = 'admin'
  );

create function public.review_access_request(p_request_id uuid, p_decision text, p_reviewer uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  request_row public.access_requests;
begin
  if p_decision not in ('approved', 'denied') then
    raise exception 'Decision must be approved or denied';
  end if;

  select * into request_row
  from public.access_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Access request not found';
  end if;
  if request_row.status <> 'pending' then
    raise exception 'Access request is no longer pending';
  end if;

  if p_decision = 'approved' then
    insert into public.workspace_members (workspace_id, user_id, role)
    values (request_row.workspace_id, request_row.user_id, 'member')
    on conflict (workspace_id, user_id) do nothing;
  end if;

  update public.access_requests
  set status = p_decision, reviewed_at = now(), reviewed_by = p_reviewer
  where id = p_request_id;
end;
$$;

revoke all on function public.review_access_request(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.review_access_request(uuid, text, uuid) to service_role;
