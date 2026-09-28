alter table public.robots
add column is_flagship boolean not null default false;

create function private.set_first_robot_flagship()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not new.is_flagship and not exists (
    select 1 from public.robots where vendor_id = new.vendor_id
  ) then
    new.is_flagship := true;
  end if;
  return new;
end;
$$;

create trigger set_first_robot_flagship
before insert on public.robots
for each row execute function private.set_first_robot_flagship();

with vendor_robot_counts as (
  select vendor_id, count(*) as robot_count
  from public.robots
  group by vendor_id
)
update public.robots
set is_flagship = true
from vendor_robot_counts
where robots.vendor_id = vendor_robot_counts.vendor_id
  and vendor_robot_counts.robot_count = 1;
