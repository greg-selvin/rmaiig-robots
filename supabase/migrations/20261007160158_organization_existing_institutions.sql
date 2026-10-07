update public.vendors
set organization_type='government_agency'
where organization_type='company' and normalized_name in (
  'boulder county sheriff s department',
  'colorado governor s office of information technology',
  'denver police department'
);
update public.vendors
set organization_type='university'
where organization_type='company' and normalized_name='university of colorado at colorado springs';
