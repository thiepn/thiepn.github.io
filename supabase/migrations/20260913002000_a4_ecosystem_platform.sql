-- A4 — Ecosystem Platform
-- Versioned first-party app manifests, user ecosystem state, and a
-- metadata-only platform export. App content remains isolated.
--
-- App usage writes intentionally continue through public.account_user_apps.
-- A4 tightens that existing RLS path so writes require auth.uid() ownership,
-- an active account_apps row, and a versioned A4 manifest. No privileged
-- write RPC is added merely to wrap an operation RLS can authorize directly.

create table if not exists public.account_app_manifests (
  app_slug text primary key references public.account_apps(slug) on delete cascade,
  manifest_version integer not null default 1 check (manifest_version > 0),
  identity_scope text not null default 'shared' check (identity_scope = 'shared'),
  data_scope text not null default 'isolated' check (data_scope = 'isolated'),
  export_scope text not null default 'app-owned' check (export_scope in ('none', 'app-owned', 'platform-metadata')),
  capabilities jsonb not null default '{}'::jsonb check (jsonb_typeof(capabilities) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.account_app_manifests is
  'Versioned THIEPN first-party app integration manifests. Identity may be shared; application content remains isolated.';

alter table public.account_app_manifests enable row level security;

revoke all on table public.account_app_manifests from anon;
grant select on table public.account_app_manifests to authenticated;

drop policy if exists account_app_manifests_select_authenticated on public.account_app_manifests;
create policy account_app_manifests_select_authenticated
  on public.account_app_manifests
  for select
  to authenticated
  using (true);

insert into public.account_app_manifests (
  app_slug,
  manifest_version,
  identity_scope,
  data_scope,
  export_scope,
  capabilities
)
values
  (
    'notes',
    1,
    'shared',
    'isolated',
    'app-owned',
    jsonb_build_object(
      'sharedIdentity', true,
      'isolatedData', true,
      'activityTracking', true,
      'ecosystemDeletion', true,
      'platformExport', 'metadata-only'
    )
  ),
  (
    'diet',
    1,
    'shared',
    'isolated',
    'app-owned',
    jsonb_build_object(
      'sharedIdentity', true,
      'isolatedData', true,
      'activityTracking', true,
      'ecosystemDeletion', true,
      'platformExport', 'metadata-only'
    )
  ),
  (
    'wordstrike',
    1,
    'shared',
    'isolated',
    'app-owned',
    jsonb_build_object(
      'sharedIdentity', true,
      'isolatedData', true,
      'activityTracking', true,
      'ecosystemDeletion', true,
      'platformExport', 'metadata-only'
    )
  )
on conflict (app_slug) do update
set manifest_version = excluded.manifest_version,
    identity_scope = excluded.identity_scope,
    data_scope = excluded.data_scope,
    export_scope = excluded.export_scope,
    capabilities = excluded.capabilities,
    updated_at = now();

-- Keep app activity on the normal RLS path, but require a currently active
-- platform registration and manifest in addition to user ownership.
drop policy if exists account_user_apps_insert_own on public.account_user_apps;
create policy account_user_apps_insert_own
  on public.account_user_apps
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.account_apps a
      join public.account_app_manifests m on m.app_slug = a.slug
      where a.slug = account_user_apps.app_slug
        and a.active = true
    )
  );

drop policy if exists account_user_apps_update_own on public.account_user_apps;
create policy account_user_apps_update_own
  on public.account_user_apps
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.account_apps a
      join public.account_app_manifests m on m.app_slug = a.slug
      where a.slug = account_user_apps.app_slug
        and a.active = true
    )
  );

create or replace function public.get_thiepn_ecosystem()
returns table (
  app_slug text,
  name text,
  description text,
  path text,
  sort_order integer,
  manifest_version integer,
  identity_scope text,
  data_scope text,
  export_scope text,
  capabilities jsonb,
  connected boolean,
  first_used_at timestamptz,
  last_used_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.slug as app_slug,
    a.name,
    a.description,
    a.path,
    a.sort_order,
    m.manifest_version,
    m.identity_scope,
    m.data_scope,
    m.export_scope,
    m.capabilities,
    ua.user_id is not null as connected,
    ua.first_used_at,
    ua.last_used_at
  from public.account_apps a
  join public.account_app_manifests m on m.app_slug = a.slug
  left join public.account_user_apps ua
    on ua.app_slug = a.slug
   and ua.user_id = (select auth.uid())
  where a.active = true
    and (select auth.uid()) is not null
  order by a.sort_order asc, a.slug asc;
$$;

revoke all on function public.get_thiepn_ecosystem() from public;
revoke all on function public.get_thiepn_ecosystem() from anon;
grant execute on function public.get_thiepn_ecosystem() to authenticated;

comment on function public.get_thiepn_ecosystem() is
  'Returns the active THIEPN app registry plus connection metadata for auth.uid(). It never returns app content.';

create or replace function public.export_thiepn_platform_snapshot()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'schema', 'thiepn-platform-snapshot',
    'version', 1,
    'platformVersion', '1.0.0',
    'exportedAt', timezone('utc'::text, now()),
    'account', jsonb_build_object(
      'userId', (select auth.uid()),
      'email', (select auth.jwt()->>'email')
    ),
    'profile', coalesce(
      (
        select jsonb_build_object(
          'displayName', p.display_name,
          'preferredLanguage', p.preferred_language,
          'timezone', p.timezone,
          'createdAt', p.created_at,
          'updatedAt', p.updated_at
        )
        from public.account_profiles p
        where p.user_id = (select auth.uid())
        limit 1
      ),
      '{}'::jsonb
    ),
    'security', jsonb_build_object(
      'assuranceLevel', coalesce((select auth.jwt()->>'aal'), 'aal1')
    ),
    'apps', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'slug', e.app_slug,
            'name', e.name,
            'path', e.path,
            'manifestVersion', e.manifest_version,
            'identityScope', e.identity_scope,
            'dataScope', e.data_scope,
            'exportScope', e.export_scope,
            'capabilities', e.capabilities,
            'connected', e.connected,
            'firstUsedAt', e.first_used_at,
            'lastUsedAt', e.last_used_at
          )
          order by e.sort_order asc, e.app_slug asc
        )
        from public.get_thiepn_ecosystem() e
      ),
      '[]'::jsonb
    )
  )
  where (select auth.uid()) is not null;
$$;

revoke all on function public.export_thiepn_platform_snapshot() from public;
revoke all on function public.export_thiepn_platform_snapshot() from anon;
grant execute on function public.export_thiepn_platform_snapshot() to authenticated;

comment on function public.export_thiepn_platform_snapshot() is
  'Exports THIEPN Account/profile/registry metadata only. App-owned content is deliberately excluded to preserve data boundaries.';
