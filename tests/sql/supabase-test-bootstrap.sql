create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema extensions;
create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
grant usage on schema auth to authenticated;
grant execute on all functions in schema auth to authenticated;

set search_path=public,extensions;
create publication supabase_realtime;
