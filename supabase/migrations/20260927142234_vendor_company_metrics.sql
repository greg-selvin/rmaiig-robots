alter table public.vendors
  add column total_funding numeric,
  add column valuation numeric,
  add column employees integer,
  add column units_shipped integer,
  add column funding_stage text,
  add column market_leader boolean not null default false;
