create function private.protect_last_admin() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op = 'DELETE' then
    if old.role = 'admin' and (select count(*) from public.workspace_members m
      where m.workspace_id = old.workspace_id and m.role = 'admin') <= 1
    then raise exception 'A workspace must retain at least one admin'; end if;
    return old;
  end if;
  if old.role = 'admin' and (new.role <> 'admin' or new.workspace_id <> old.workspace_id)
    and (select count(*) from public.workspace_members m
      where m.workspace_id = old.workspace_id and m.role = 'admin') <= 1
  then raise exception 'A workspace must retain at least one admin'; end if;
  return new;
end $$;
create trigger protect_last_admin before update or delete on public.workspace_members
for each row execute function private.protect_last_admin();
