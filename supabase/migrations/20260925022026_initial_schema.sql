create extension if not exists pg_trgm with schema extensions;
create schema if not exists private;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null,
 coverage_threshold integer not null default 60 check (coverage_threshold between 0 and 100),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.workspace_members (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check (role in ('admin','member','viewer')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key (workspace_id,user_id)
);
create function private.member_role(w uuid) returns text language sql stable security definer set search_path = '' as $$
 select role from public.workspace_members where workspace_id=w and user_id=(select auth.uid()) limit 1
$$;
revoke all on function private.member_role(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.member_role(uuid) to authenticated;

create table public.vendors (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null, normalized_name text not null, original_source_name text,
 source_row integer, source_rank integer, original_robot_text text, original_import_data jsonb,
 country text, iso_country_code text check (iso_country_code is null or iso_country_code ~ '^[A-Z]{2}$'),
 headquarters_city text, headquarters_region text, us_state_code text check (us_state_code is null or us_state_code ~ '^[A-Z]{2}$'),
 headquarters_postal_code text, website_url text, contact_url text, product_urls text[],
 description text, public_event_history text, strategic_fit text,
 research_status text not null default 'queued', last_researched_at timestamptz, manual_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,normalized_name)
);
create table public.vendor_locations (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid not null references public.vendors(id) on delete cascade,
 location_type text not null default 'headquarters', country text, iso_country_code text check (iso_country_code is null or iso_country_code ~ '^[A-Z]{2}$'),
 region text, us_state_code text check (us_state_code is null or us_state_code ~ '^[A-Z]{2}$'),
 city text, postal_code text, source_url text, verified_at timestamptz, is_primary boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.robots (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid not null references public.vendors(id) on delete cascade,
 name text not null, normalized_name text not null, original_imported_text text,
 product_url text, description text, development_status text, commercial_availability text,
 mobility text, manipulation text, interaction_capabilities text, demonstration_capabilities text,
 image_urls text[], research_status text not null default 'queued', last_researched_at timestamptz,
 manual_notes text, parsing_review_status text not null default 'clear' check (parsing_review_status in ('clear','needs_review','reviewed')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(vendor_id,normalized_name)
);
create table public.meetups (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null, starts_at timestamptz, venue text, city text not null, state text, country text not null,
 description text, expected_audience text, attendance_estimate integer check (attendance_estimate >= 0),
 status text not null default 'planning', created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.pipeline_stages (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null, position integer not null, color text not null default '#64748b',
 archived boolean not null default false, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,name), unique(workspace_id,position)
);
create table public.opportunities (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid not null references public.vendors(id), robot_id uuid not null references public.robots(id),
 meetup_id uuid not null references public.meetups(id), stage_id uuid references public.pipeline_stages(id),
 board_position numeric not null default 0, owner_id uuid references auth.users(id), collaborator_ids uuid[] not null default '{}',
 priority_score numeric(5,2), outreach_summary text, next_action text, next_action_date date,
 last_interaction_at timestamptz, outcome text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(robot_id,meetup_id)
);
create table public.contacts (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid not null references public.vendors(id) on delete cascade,
 name text, job_title text, department text, business_email text, business_phone text, contact_form_url text,
 profile_url text, location text, preferred boolean not null default false, contact_type text,
 verification_status text not null default 'unverified',
 email_status text not null default 'unknown' check (email_status in ('confirmed','inferred','unverified','invalid','unknown')),
 source_url text, verified_at timestamptz, notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.interactions (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 vendor_id uuid not null references public.vendors(id), contact_id uuid references public.contacts(id),
 interaction_type text not null, occurred_at timestamptz not null default now(), team_member_id uuid references auth.users(id),
 direction text, subject text, summary text, full_notes text, outcome text, follow_up_date date,
 email_template_id uuid, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.scoring_models (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 kind text not null check (kind in ('excitement','participation')),
 version integer not null, is_active boolean not null default false,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(),
 unique(workspace_id,kind,version)
);
create unique index one_active_scoring_model on public.scoring_models(workspace_id,kind) where is_active;
create table public.scoring_criteria (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 model_id uuid not null references public.scoring_models(id) on delete cascade,
 criterion_key text not null, label text not null, description text not null, weight integer not null check (weight between 0 and 100),
 position integer not null, unique(model_id,criterion_key)
);
create table public.ratings (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 kind text not null check (kind in ('excitement','participation')),
 robot_id uuid references public.robots(id), opportunity_id uuid references public.opportunities(id),
 criterion_key text not null,
 ai_rating integer check (ai_rating between 1 and 5), ai_rationale text, ai_confidence numeric check (ai_confidence between 0 and 1),
 manual_rating integer check (manual_rating between 1 and 5), manual_rationale text,
 effective_rating integer generated always as (coalesce(manual_rating,ai_rating)) stored,
 needs_review boolean not null default false, researched_at timestamptz, reviewer_id uuid references auth.users(id),
 source_ids uuid[] not null default '{}',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check ((kind='excitement' and robot_id is not null and opportunity_id is null) or (kind='participation' and opportunity_id is not null and robot_id is null))
);
create unique index one_robot_rating on public.ratings(robot_id,criterion_key) where kind='excitement';
create unique index one_opportunity_rating on public.ratings(opportunity_id,criterion_key) where kind='participation';
create table public.research_sources (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid references public.vendors(id), robot_id uuid references public.robots(id),
 url text not null, title text, publisher text, accessed_at timestamptz not null default now(),
 evidence_summary text, supported_fields text[], confidence numeric check (confidence between 0 and 1),
 is_official boolean not null default false, citation_metadata jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.research_jobs (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 vendor_id uuid references public.vendors(id), robot_id uuid references public.robots(id),
 status text not null default 'queued' check (status in ('queued','researching','completed','partial','failed','needs_review')),
 attempts integer not null default 0, error text, usage jsonb, scheduled_at timestamptz not null default now(),
 started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.email_templates (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 name text not null, subject text not null, body text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(workspace_id,name)
);
alter table public.interactions add constraint interactions_template_fk foreign key (email_template_id) references public.email_templates(id);
create table public.import_batches (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 source_name text not null, dry_run boolean not null, inserted_vendors integer not null default 0,
 updated_vendors integer not null default 0, inserted_robots integer not null default 0,
 skipped integer not null default 0, warnings jsonb not null default '[]',
 created_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 entity_type text not null, entity_id uuid, action text not null, before_data jsonb, after_data jsonb,
 actor_id uuid references auth.users(id), created_at timestamptz not null default now()
);
create table public.stage_history (
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id),
 opportunity_id uuid not null references public.opportunities(id) on delete cascade,
 from_stage_id uuid references public.pipeline_stages(id), to_stage_id uuid references public.pipeline_stages(id),
 actor_id uuid references auth.users(id), changed_at timestamptz not null default now()
);
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
 begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['workspaces','profiles','workspace_members','vendors','vendor_locations','robots','meetups','pipeline_stages','opportunities','contacts','interactions','ratings','research_sources','research_jobs','email_templates']
 loop execute format('create trigger touch before update on public.%I for each row execute function private.touch_updated_at()',t); end loop;
end $$;

alter table public.workspaces enable row level security;
create policy workspaces_read on public.workspaces for select to authenticated using (private.member_role(id) is not null);
create policy workspaces_update on public.workspaces for update to authenticated using (private.member_role(id)='admin') with check (private.member_role(id)='admin');
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using (id=(select auth.uid()) or exists(select 1 from public.workspace_members m where m.user_id=id and private.member_role(m.workspace_id) is not null));
create policy profiles_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
alter table public.workspace_members enable row level security;
create policy members_read on public.workspace_members for select to authenticated using (private.member_role(workspace_id) is not null);
create policy members_insert on public.workspace_members for insert to authenticated with check (private.member_role(workspace_id)='admin');
create policy members_update on public.workspace_members for update to authenticated using (private.member_role(workspace_id)='admin') with check (private.member_role(workspace_id)='admin');
create policy members_delete on public.workspace_members for delete to authenticated using (private.member_role(workspace_id)='admin');
do $$ declare t text; begin
 foreach t in array array['vendors','vendor_locations','robots','meetups','pipeline_stages','opportunities','contacts','interactions','scoring_models','scoring_criteria','ratings','research_sources','research_jobs','email_templates','import_batches','audit_events','stage_history']
 loop
  execute format('alter table public.%I enable row level security',t);
  execute format('create policy %I on public.%I for select to authenticated using (private.member_role(workspace_id) is not null)',t||'_read',t);
  if t in ('pipeline_stages','scoring_models','scoring_criteria','email_templates','import_batches') then
   execute format('create policy %I on public.%I for insert to authenticated with check (private.member_role(workspace_id) = %L)',t||'_insert',t,'admin');
   execute format('create policy %I on public.%I for update to authenticated using (private.member_role(workspace_id) = %L) with check (private.member_role(workspace_id) = %L)',t||'_update',t,'admin','admin');
  elsif t not in ('audit_events','stage_history') then
   execute format('create policy %I on public.%I for insert to authenticated with check (private.member_role(workspace_id) in (%L,%L))',t||'_insert',t,'admin','member');
   execute format('create policy %I on public.%I for update to authenticated using (private.member_role(workspace_id) in (%L,%L)) with check (private.member_role(workspace_id) in (%L,%L))',t||'_update',t,'admin','member','admin','member');
  end if;
 end loop;
end $$;
create index vendors_name_trgm on public.vendors using gin (name gin_trgm_ops);
create index robots_name_trgm on public.robots using gin (name gin_trgm_ops);
create index vendors_country_state on public.vendors(workspace_id,iso_country_code,us_state_code);
create index locations_state on public.vendor_locations(workspace_id,iso_country_code,us_state_code);
create index robots_vendor on public.robots(vendor_id);
create index opportunities_board on public.opportunities(workspace_id,meetup_id,stage_id,board_position);
create index opportunities_due on public.opportunities(workspace_id,next_action_date);
create index contacts_vendor on public.contacts(vendor_id);
create index interactions_opportunity on public.interactions(opportunity_id,occurred_at desc);
create index research_jobs_queue on public.research_jobs(workspace_id,status,scheduled_at);
create index ratings_lookup on public.ratings(workspace_id,kind,criterion_key);
grant select,insert,update,delete on all tables in schema public to authenticated;
alter publication supabase_realtime add table public.opportunities;

insert into public.workspaces(id,name) values ('c02ee290-4f87-4d1f-98c1-24c502126086','RMAIIG Robots');
