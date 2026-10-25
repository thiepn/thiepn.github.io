\set ON_ERROR_STOP on
DO $$
DECLARE n int;
BEGIN
 IF (SELECT rolbypassrls FROM pg_roles WHERE rolname='authenticated') THEN
  RAISE EXCEPTION 'authenticated must not BYPASSRLS';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.tms60_sync_state'::regclass) THEN
  RAISE EXCEPTION 'sync state RLS disabled';
 END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.tms60_backups'::regclass) THEN
  RAISE EXCEPTION 'backups RLS disabled';
 END IF;
 SELECT count(*) INTO n FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('tms60_sync_state','tms60_backups');
 IF n<7 THEN RAISE EXCEPTION 'missing original TMS60 owner RLS policies: %',n; END IF;
 IF has_function_privilege('anon','public.delete_tms60_cloud_data(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Anonymous role can delete cloud data';
 END IF;
 IF NOT has_function_privilege('authenticated','public.delete_tms60_cloud_data(uuid)','EXECUTE') THEN
  RAISE EXCEPTION 'Authenticated identity-bound delete grant missing';
 END IF;
 IF (SELECT count(*) FROM public.account_apps WHERE slug='tms60') <> 1 OR
    (SELECT count(*) FROM public.account_app_manifests WHERE app_slug='tms60') <> 1 THEN
  RAISE EXCEPTION 'Shared identity app registration incomplete';
 END IF;
 RAISE NOTICE 'PASS original TMS60 public RLS owner policies, role rights, identity-bound delete and Account app registration';
END $$;
