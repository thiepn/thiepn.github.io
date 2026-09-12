# A1 — THIEPN Account Core

## Goal

Create the first permanent account-management surface for the THIEPN first-party app ecosystem at `/account/`.

The account layer provides one canonical identity while preserving strict per-app data boundaries.

## Canonical identity

- Supabase project: `hycegznamzjhwinegaai`
- Browser session key: `sb-hycegznamzjhwinegaai-auth-token`
- First-party origin: `https://thiepn.dev`
- Canonical user ID: `auth.users.id`

## A1 user-facing scope

`/account/` provides:

- automatic recognition of an existing shared session
- email/password sign in
- Google sign in
- account creation
- password recovery
- global profile management
- email change
- password set/change
- provider status
- connected-app overview
- local shared-session sign out
- ecosystem-wide account deletion

The account page is `noindex` and excluded from portfolio analytics.

## Global profile

`public.account_profiles` stores only cross-app preferences:

- `display_name`
- `preferred_language`
- `timezone`

App-specific data does not belong in this table.

## App registry and connections

`public.account_apps` is the first-party app registry.

A1 registers:

- Notes
- Diet Copilot
- WORDSTRIKE

`public.account_user_apps` records which canonical identity has server-side activity for which app. Existing usage is backfilled from app tables. Database triggers keep usage markers current when Notes sync data, Diet profiles, or WORDSTRIKE profile/submission data change.

These connection rows are account metadata only. They do not grant authorization to app data.

## Row Level Security

`account_profiles` and `account_user_apps` are readable/writable only by the matching `auth.uid()`.

`account_apps` is readable by authenticated users.

Cross-user validation is required before release.

## Account deletion

`public.delete_thiepn_account(text)` requires the exact confirmation:

```text
DELETE MY ACCOUNT
```

The browser first attempts to remove private Notes attachment objects through the Storage API.

The database refuses identity deletion if Notes attachment objects remain.

After storage is clear, deleting the canonical `auth.users` row cascades through first-party app rows that reference the user with `ON DELETE CASCADE`, including Notes sync data, Diet data, WORDSTRIKE leaderboard identity/data, account profile metadata, and app connection metadata.

If the deleting identity owns active Notes cloud access, the Notes workspace state is locked before the identity is removed.

## Security boundaries

- Browser code contains only the Supabase publishable key.
- Service-role credentials are never shipped to the client.
- Shared authentication does not imply shared application records.
- The Account dashboard does not expose privileged app data.
- App data remains protected by its own RLS / RPC authorization model.

## Deferred beyond A1

- production SMTP hardening
- leaked-password protection
- MFA / TOTP
- passkeys
- active device/session management UI
- security event history
- data export bundle
- reusable `@thiepn/account` SDK
- subdomain/OIDC SSO architecture
