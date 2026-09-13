# A4 — Ecosystem Platform

## Purpose

A4 turns the A1–A3 THIEPN Account foundation into a reusable first-party application platform.

The platform shares **identity, account preferences and ecosystem metadata**. It does not create a shared pool of application content.

The invariant remains:

```text
identity = shared
app data = isolated
```

## Versioning

A4 introduces two independently meaningful versions:

- `@thiepn/account-sdk`: **1.2.0**
- THIEPN ecosystem platform contract: **1.0.0**

The SDK version may advance for client behavior or compatibility without changing the platform schema contract. A breaking ecosystem manifest/snapshot contract requires an explicit platform-version change.

## App registry

`public.account_apps` remains the canonical first-party app directory.

A4 adds `public.account_app_manifests`, keyed by `app_slug`.

Each manifest declares:

- `manifest_version`
- `identity_scope`
- `data_scope`
- `export_scope`
- structured capability metadata

A4 registers manifests for:

- `notes`
- `diet`
- `wordstrike`

All three current manifests declare:

- `identity_scope = shared`
- `data_scope = isolated`
- app activity tracking supported
- ecosystem deletion supported
- platform export is metadata-only

The manifest table is not an authorization grant to app content. It describes integration behavior only.

## Ecosystem state API

A4 adds:

```text
public.get_thiepn_ecosystem()
```

It returns the active registry, manifest contract and the current account's connection metadata in one user-scoped response.

It does **not** return Notes records, Diet records, WORDSTRIKE scores, or any other app-owned content.

Security properties:

- `SECURITY INVOKER`
- empty `search_path`
- `anon` execution revoked
- execution granted to `authenticated`
- account connection rows resolve only through the caller's `auth.uid()` and existing RLS

Without an authenticated user, the ecosystem RPC returns zero rows and the platform snapshot returns `null`.

## App activity contract

A4 deliberately does not add a privileged write RPC merely to record app activity.

`@thiepn/account-sdk` exposes:

```js
await account.recordAppActivity({ appId: 'notes' })
```

The SDK upserts `public.account_user_apps` directly.

A4 tightens the database boundary so an activity INSERT/UPDATE is accepted only when:

- `user_id = auth.uid()`;
- the target `account_user_apps.app_slug` exists in `account_apps`;
- that exact app is currently active;
- that exact app has a versioned `account_app_manifests` row.

The row correlation is deliberately explicit in SQL (`a.slug = account_user_apps.app_slug`) so the policy cannot degrade into a global "some active app exists" check through ambiguous column resolution.

The foreign key and RLS remain authoritative even if a consumer bypasses the SDK helper. First-use time is preserved, while subsequent activity calls update last-use activity.

This avoids adding a new write-capable `SECURITY DEFINER` function when the existing owner-scoped RLS path can enforce both ownership and platform registration.

## Platform snapshot export

A4 adds:

```text
public.export_thiepn_platform_snapshot()
```

The export schema is:

```text
thiepn-platform-snapshot / version 1
```

The snapshot contains only platform-owned metadata:

- platform/schema version
- canonical account id
- account email
- global THIEPN Account profile preferences
- current authentication assurance level
- registered app manifests
- connected/available state
- app first/last account-activity timestamps

The snapshot deliberately excludes app-owned content, including:

- Notes sync records and attachments
- Diet meals, foods, weights, goals, reviews or AI history
- WORDSTRIKE leaderboard submissions/progress

A platform snapshot is therefore not a replacement for each app's own backup/export system.

## Account UI

`/account/` includes an A4 platform section showing:

- platform version
- number of registered apps
- number of connected apps
- shared-identity invariant
- isolated-data invariant
- per-app manifest version and state
- metadata-only JSON export

The page continues to be `noindex` and remains an account-management surface rather than a public product directory.

## SDK additions

`@thiepn/account-sdk` 1.2.0 adds:

- `THIEPN_PLATFORM_VERSION`
- `client.platformVersion`
- `client.getEcosystemState()`
- `client.recordAppActivity({ appId })`
- `client.exportPlatformSnapshot()`
- typed ecosystem app/activity/snapshot contracts

The SDK remains dependency-free and framework-independent.

## Adding a future THIEPN app

A new first-party app is not considered platform-integrated merely because it shares the Supabase project.

It must:

1. have a stable lower-case app slug;
2. be registered in `account_apps`;
3. have a versioned `account_app_manifests` row;
4. pin a compatible Account SDK version;
5. use the canonical session identity contract;
6. call `recordAppActivity()` only after a valid authenticated session exists;
7. keep application content in app-owned tables/storage with its own RLS/authorization model;
8. participate in ecosystem deletion intentionally;
9. provide its own app-data export/recovery mechanism when the product needs one;
10. pass its own full release gate before being marked production-ready.

The detailed consumer checklist is in `docs/THIEPN_APP_INTEGRATION.md`.

## What A4 does not do

A4 does not claim:

- cross-app content access
- cross-app content search
- app-content aggregation
- a fake "disconnect" operation for first-party identity
- subdomain SSO
- OIDC provider functionality
- third-party OAuth client registration
- organization/team accounts
- app-data AAL2 enforcement

Those are separate product/security decisions, not implied by a reusable first-party account platform.

## A2/A3 dependency

A4 is stacked on A3, which is stacked on A2.

Consumer repositories still need to complete their A2 SDK migration and, where MFA-protected app data is eventually desired, add A3 challenge handling before restrictive AAL2 data policies can safely be enabled.

A4 does not bypass that sequencing.

## Live backend state

The canonical Supabase project contains the A4 contracts as separately applied migrations:

- `a4_ecosystem_platform_registry`
- `a4_get_ecosystem`
- `a4_export_platform_snapshot`
- `a4_activity_registry_guard`
- `a4_fix_activity_registry_correlation`

The repository keeps the reproducible consolidated migration at:

```text
supabase/migrations/20260913002000_a4_ecosystem_platform.sql
```

The consolidated migration is idempotent for the registry seed, recreates the final row-correlated activity RLS guards, and uses `create or replace` for the read RPCs.

The live security advisor reports no new A4 `SECURITY DEFINER` surface. Existing warnings belong to earlier account/Notes RPCs and the existing leaked-password-protection configuration.

## Certification requirements

A4 is not complete unless the exact candidate SHA passes:

- A3 security contract
- A4 ecosystem-platform static contract
- TypeScript/Astro typecheck
- complete unit suite
- production build/performance gate
- complete cross-browser Studio E2E suite
- focused A4 SDK tests
- focused A4 browser tests
- retained scale and automation checks

No A4 PR should be merged independently of its certified A3 base.
