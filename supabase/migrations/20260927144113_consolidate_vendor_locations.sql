with legacy as (
  select id, workspace_id, country, iso_country_code, headquarters_city,
    headquarters_region, us_state_code, headquarters_postal_code
  from public.vendors
), headquarters as (
  select distinct on (vendor_id) id, vendor_id
  from public.vendor_locations
  where location_type = 'headquarters'
  order by vendor_id, is_primary desc, created_at, id
)
update public.vendor_locations loc set
  country = coalesce(loc.country, vendor.country),
  iso_country_code = coalesce(loc.iso_country_code, vendor.iso_country_code),
  city = coalesce(loc.city, vendor.headquarters_city),
  region = coalesce(loc.region, vendor.headquarters_region),
  us_state_code = coalesce(loc.us_state_code, vendor.us_state_code),
  postal_code = coalesce(loc.postal_code, vendor.headquarters_postal_code),
  is_primary = true,
  updated_at = now()
from legacy vendor
join headquarters on headquarters.vendor_id = vendor.id
where loc.id = headquarters.id
  and (vendor.country is not null or vendor.iso_country_code is not null
    or vendor.headquarters_city is not null or vendor.headquarters_region is not null
    or vendor.us_state_code is not null or vendor.headquarters_postal_code is not null);

insert into public.vendor_locations (
  workspace_id, vendor_id, location_type, country, iso_country_code, city,
  region, us_state_code, postal_code, is_primary
)
select vendor.workspace_id, vendor.id, 'headquarters', vendor.country,
  vendor.iso_country_code, vendor.headquarters_city, vendor.headquarters_region,
  vendor.us_state_code, vendor.headquarters_postal_code, true
from public.vendors vendor
where (vendor.country is not null or vendor.iso_country_code is not null
  or vendor.headquarters_city is not null or vendor.headquarters_region is not null
  or vendor.us_state_code is not null or vendor.headquarters_postal_code is not null)
  and not exists (
    select 1 from public.vendor_locations loc
    where loc.vendor_id = vendor.id and loc.location_type = 'headquarters'
  );

alter table public.vendors drop constraint if exists valid_us_state;
alter table public.vendors drop column country,
  drop column iso_country_code,
  drop column headquarters_city,
  drop column headquarters_region,
  drop column us_state_code,
  drop column headquarters_postal_code;
