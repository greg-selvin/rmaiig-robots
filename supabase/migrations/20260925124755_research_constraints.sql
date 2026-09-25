drop index public.one_robot_rating;
drop index public.one_opportunity_rating;
create unique index one_robot_rating on public.ratings(robot_id,criterion_key);
create unique index one_opportunity_rating on public.ratings(opportunity_id,criterion_key);
alter table public.vendors add constraint valid_us_state check (us_state_code is null or us_state_code in
('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'));
alter table public.vendor_locations add constraint valid_us_state check (us_state_code is null or us_state_code in
('AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'));
create unique index unique_vendor_source on public.research_sources(vendor_id,url) where vendor_id is not null;
