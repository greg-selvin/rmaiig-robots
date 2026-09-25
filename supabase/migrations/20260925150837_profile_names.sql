alter table public.profiles
  add column first_name text,
  add column last_name text;

update public.profiles
set first_name = nullif(split_part(display_name, ' ', 1), ''),
    last_name = nullif(regexp_replace(display_name, '^\S+\s*', ''), '')
where display_name is not null
  and (first_name is null or last_name is null);

insert into public.profiles (id, first_name, last_name, display_name)
select id,
       nullif(trim(raw_user_meta_data ->> 'first_name'), ''),
       nullif(trim(raw_user_meta_data ->> 'last_name'), ''),
       nullif(trim(coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name')), '')
from auth.users
on conflict (id) do nothing;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  first_name text := nullif(trim(new.raw_user_meta_data ->> 'first_name'), '');
  last_name text := nullif(trim(new.raw_user_meta_data ->> 'last_name'), '');
begin
  insert into public.profiles (id, first_name, last_name, display_name)
  values (
    new.id,
    first_name,
    last_name,
    coalesce(nullif(trim(concat_ws(' ', first_name, last_name)), ''), nullif(new.raw_user_meta_data ->> 'full_name', ''))
  )
  on conflict (id) do update
    set first_name = coalesce(excluded.first_name, public.profiles.first_name),
        last_name = coalesce(excluded.last_name, public.profiles.last_name),
        display_name = coalesce(excluded.display_name, public.profiles.display_name),
        updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
