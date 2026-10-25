-- Disposable PostgreSQL 17 fixture only; never run against Supabase or a live database.
\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'disposable-audit-only-password';
GRANT anon, authenticated TO authenticator;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$
 SELECT coalesce(nullif(current_setting('request.jwt.claim.sub',true),'')::uuid,(nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid)
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
CREATE SCHEMA core;
CREATE TABLE core.apps(
  id text PRIMARY KEY, name text NOT NULL, origin text NOT NULL,
  namespace text NOT NULL, backend_level text NOT NULL, owner text NOT NULL,
  enabled boolean NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE SCHEMA gateway;
GRANT USAGE ON SCHEMA gateway TO service_role;
CREATE SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
-- Independent observable owner fixture tests actual PostgREST JWT claims and
-- the *non-BYPASSRLS* authenticated database role, not a mock JS repository.
CREATE SCHEMA audit;
CREATE TABLE audit.owner_probe(user_id uuid NOT NULL, value text NOT NULL);
ALTER TABLE audit.owner_probe ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_probe_read ON audit.owner_probe
 FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON audit.owner_probe TO authenticated;
INSERT INTO audit.owner_probe(user_id,value) VALUES
 ('11111111-1111-4111-8111-111111111111','owner-one-private'),
 ('22222222-2222-4222-8222-222222222222','owner-two-private');
