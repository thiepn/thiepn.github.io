# A2 — Shared Account SDK

## Purpose

`@thiepn/account-sdk` is the canonical browser identity/session contract for the THIEPN ecosystem.

It centralizes Supabase project configuration, canonical session persistence, refresh, OAuth callback consumption, email/password auth, password recovery, provider detection, authenticated REST access, app/account URLs, and legacy-session migration.

App content remains isolated. The SDK shares identity and session semantics only; it does not create cross-app access to Notes, Diet, or WORDSTRIKE data.

## v1 invariants

- Version: `1.0.0`
- Supabase project: `hycegznamzjhwinegaai`
- Canonical browser session key: `sb-hycegznamzjhwinegaai-auth-token`
- Canonical user id: Supabase `auth.users.id`
- Browser code contains only the publishable key; service-role credentials are forbidden.
- `user.email` does **not** imply that email/password sign-in is enabled.
- Connected providers come from Supabase identity/provider metadata.
- Consumers must bundle or vendor a pinned SDK copy. Runtime loading from `thiepn.dev` is not required.
- App-specific recovery layers may persist an encrypted/recoverable copy of the canonical session, but restored data must be normalized through the SDK before use.

## Public surface

The package exports:

- `THIEPN_ACCOUNT_VERSION`
- `THIEPN_ACCOUNT_CONFIG`
- `THIEPN_APPS`
- `ThiepnAccountError`
- `parseSession`, `readSession`, `writeSession`, `clearSession`
- `migrateLegacySessions`
- `getConnectedProviders`, `hasProvider`
- `accountUrl`, `appUrl`
- `createAccountClient`

`createAccountClient()` provides session restore/refresh, callback consumption, sign-in, sign-up, OAuth URL generation, password recovery, user updates, sign-out, and authenticated API requests.

## Consumer migration rule

Each consuming repository keeps its own UI and data layer. The integration boundary is an adapter:

1. Pin the SDK version and source hash in the repository.
2. Preserve the canonical session key.
3. Migrate any legacy app-specific session key once.
4. Route authentication/session operations through the SDK adapter.
5. Preserve app-specific browser recovery behavior where it adds reliability.
6. Keep app tables protected by their existing `auth.uid()` RLS policies.
7. Run the app's complete pre-existing release gate before merge.

## Compatibility

A2 is designed for modern evergreen browsers and does not depend on React, Astro, Supabase JS, or another framework. A consumer may keep `supabase-js` for its database/data APIs while using the SDK as the source of truth for account identity/session semantics.
