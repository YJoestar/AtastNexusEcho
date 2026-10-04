-- Minimal stand-in for the parts of Supabase the migrations rely on, so the whole
-- history can be replayed on a plain PostgreSQL 15+ (see scripts/db/verify-migrations.sh).
-- Minimal Supabase stand-in
do $$ begin
  if not exists (select from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
  if not exists (select from pg_roles where rolname='authenticator') then create role authenticator noinherit login; end if;
end $$;
grant anon, authenticated, service_role to postgres;
create schema if not exists auth; create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;
create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_app_meta_data jsonb default '{}', raw_user_meta_data jsonb default '{}', created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true),''),'anon') $$;
create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims', true),''),'{}')::jsonb $$;
alter database nexus_test set search_path = public, extensions;
grant usage on schema public, extensions, auth to anon, authenticated, service_role;
create schema if not exists supabase_migrations;
create table supabase_migrations.schema_migrations (version text primary key, statements text[], name text);

-- Supabase's own defaults: every object created in `public` is granted to the
-- API roles. The stub reproduces them so the tests exercise the real exposure.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
