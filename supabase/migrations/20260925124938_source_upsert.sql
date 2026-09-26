drop index public.unique_vendor_source;
create unique index unique_vendor_source on public.research_sources(vendor_id,url);
