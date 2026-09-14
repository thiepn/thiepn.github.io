-- TEMPLATE ONLY. Review values before executing in the canonical project.
-- Do not run this file unchanged.

begin;

insert into public.account_apps (slug, name, description, path, active, sort_order)
values ('__APP_SLUG__', '__DISPLAY_NAME__', '__DESCRIPTION__', '/__APP_SLUG__/', true, __SORT_ORDER__);

insert into public.account_app_manifests (
  app_slug, manifest_version, identity_scope, data_scope, export_scope, capabilities
)
values (
  '__APP_SLUG__',
  '1.0',
  'email profile timestamps',
  '__APP_DATA_SCOPE__',
  '__EXPORT_SCOPE__',
  '{"account":true,"identity":true,"app_data":true,"export_data":true,"delete_account":true,"delete_app_data":true}'::jsonb
);

-- account_user_apps rows are user-specific. Add/default them only according to
-- the reviewed entitlement/onboarding policy for the new app.

rollback; -- Replace with COMMIT only after review and preflight verification.
