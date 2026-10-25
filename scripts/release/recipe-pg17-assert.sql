\set ON_ERROR_STOP on
-- All seven original Recipe migrations must have applied before this script.
DO $$
DECLARE r record; n integer;
BEGIN
 SELECT count(*) INTO n FROM pg_tables WHERE schemaname='recipe';
 IF n < 15 THEN RAISE EXCEPTION 'Recipe original migrations incomplete: only % tables',n; END IF;
 IF (SELECT rolbypassrls FROM pg_roles WHERE rolname='authenticated') THEN
  RAISE EXCEPTION 'Authenticated role unexpectedly BYPASSRLS';
 END IF;
 IF (SELECT rolsuper FROM pg_roles WHERE rolname='authenticated') THEN
  RAISE EXCEPTION 'Authenticated role unexpectedly superuser';
 END IF;
 FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='recipe' LOOP
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=format('recipe.%I',r.tablename)::regclass) THEN
   RAISE EXCEPTION 'RLS disabled on %',r.tablename;
  END IF;
  IF has_table_privilege('authenticated',format('recipe.%I',r.tablename),'SELECT') THEN
   RAISE EXCEPTION 'Authenticated retained direct SELECT on %',r.tablename;
  END IF;
  IF has_table_privilege('anon',format('recipe.%I',r.tablename),'SELECT') THEN
   RAISE EXCEPTION 'Anonymous retained direct SELECT on %',r.tablename;
  END IF;
 END LOOP;
 IF has_function_privilege('authenticated','gateway.recipe_manifest(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Authenticated can call service-only gateway';
 END IF;
 RAISE NOTICE 'PASS all % Recipe tables deny anon/authenticated, RLS enabled, non-bypass role', n;
END $$;
INSERT INTO recipe.recipes(id,user_id,state) VALUES
 ('33333333-3333-4333-8333-333333333331','11111111-1111-4111-8111-111111111111','draft'),
 ('33333333-3333-4333-8333-333333333332','22222222-2222-4222-8222-222222222222','draft');
SET ROLE service_role;
DO $$
DECLARE a jsonb; b jsonb;
BEGIN
 -- Only the original service-role gateway is invoked; no real user credentials.
 SELECT gateway.recipe_manifest('11111111-1111-4111-8111-111111111111') INTO a;
 SELECT gateway.recipe_manifest('22222222-2222-4222-8222-222222222222') INTO b;
 IF jsonb_array_length(a->'recipes') <> 1 OR
    a->'recipes'->0->>'id' <> '33333333-3333-4333-8333-333333333331' THEN
  RAISE EXCEPTION 'Owner one manifest leaked owner two';
 END IF;
 IF jsonb_array_length(b->'recipes') <> 1 OR
    b->'recipes'->0->>'id' <> '33333333-3333-4333-8333-333333333332' THEN
  RAISE EXCEPTION 'Owner two manifest leaked owner one';
 END IF;
 RAISE NOTICE 'PASS original Recipe gateway manifests are owner-specific in disposable database';
END $$;

RESET ROLE;
