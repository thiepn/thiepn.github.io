\set ON_ERROR_STOP on
-- Disposable Supabase-like prerequisites for the first FIVE original TMS60 migrations.
-- Account Hub H15 migration remains excluded: requires separate full Core H12/H13 schema.
CREATE ROLE anon NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'disposable-audit-only-password';
GRANT anon,authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated,anon;
CREATE TABLE public.account_apps(
 slug text PRIMARY KEY,name text NOT NULL,description text NOT NULL,
 path text NOT NULL,sort_order integer NOT NULL,active boolean NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.account_app_manifests(
 app_slug text PRIMARY KEY,manifest_version integer NOT NULL,
 identity_scope text NOT NULL,data_scope text NOT NULL,export_scope text NOT NULL,
 capabilities jsonb NOT NULL,updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
