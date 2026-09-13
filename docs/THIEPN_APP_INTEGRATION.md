# THIEPN First-Party App Integration

This document is the consumer contract for adding a first-party application to the THIEPN Account ecosystem.

## 1. Decide whether the app belongs on the platform

Use THIEPN Account only when the application benefits from a persistent first-party identity.

Do not add authentication merely to make an app appear connected. Fully local or anonymous apps can remain outside the account platform.

## 2. Register the app

Every integrated app needs a stable slug matching:

```text
^[a-z0-9-]+$
```

Add the app to `public.account_apps` with its canonical name, first-party path and active state.

Add a corresponding `public.account_app_manifests` row. Do not ship an active app without a manifest.

The default first-party contract is:

```text
identity_scope = shared
data_scope     = isolated
```

If a proposed feature requires changing either invariant, treat that as a platform-architecture change rather than silently expanding an app manifest.

## 3. Pin the Account SDK

Consumers vendor or bundle a pinned `@thiepn/account-sdk` version. They do not rely on fetching mutable SDK code from `thiepn.dev` at runtime.

Record the source version/hash in the consuming repository.

For A4 the current contract is:

```text
Account SDK: 1.2.0
Platform:    1.0.0
```

## 4. Use the canonical identity

The canonical user id is:

```text
auth.users.id
```

The canonical same-origin browser session key is:

```text
sb-hycegznamzjhwinegaai-auth-token
```

An app must not create a parallel first-party user id when the canonical identity already exists.

Legacy app-specific session storage may be migrated once through the SDK migration helper, then retired.

## 5. Restore/verify the session through the SDK

Use the SDK for account/session semantics:

```js
const account = createAccountClient();
const session = await account.ensureSession();
```

Do not infer authentication from an email address or arbitrary local storage flag.

If the app supports MFA-protected flows, inspect the A3 assurance/factor helpers and implement a real challenge path before requiring AAL2 at the data layer.

## 6. Mark account activity

After a valid authenticated session exists and the app is actually being used:

```js
await account.recordAppActivity({ appId: 'your-app-slug' });
```

This writes only the current account/app connection metadata.

Do not call it merely because the account dashboard listed the app. "Connected" should mean the account has actual server-side app activity.

## 7. Keep application data isolated

App data belongs in app-owned tables/buckets.

Private rows must use an ownership/authorization policy appropriate for that product. For a normal single-user first-party app, the baseline is ownership by `auth.uid()`.

Do not put application state in:

- `account_profiles`
- `account_apps`
- `account_app_manifests`
- `account_user_apps`

Those tables are ecosystem/account metadata only.

Do not query another app's private tables simply because the same user id exists there.

## 8. Keep global profile data narrow

The shared global profile currently contains only cross-app preferences such as:

- display name
- preferred language
- timezone

Product-specific preferences stay in the app.

If a setting is not meaningfully global across unrelated THIEPN products, it does not belong in `account_profiles`.

## 9. Define deletion behavior

A first-party app that stores account-owned server data must define what happens when the canonical THIEPN Account is deleted.

Prefer schema-level foreign keys/cascades for user-owned relational rows where appropriate. Storage objects or external resources need an explicit cleanup/preflight path.

Do not register ecosystem deletion support in the manifest unless the full deletion path is covered and tested.

## 10. Define export/recovery behavior

The A4 platform snapshot exports account/platform metadata only.

If the app stores meaningful user content, the app owns its own backup/export/recovery contract.

Examples:

- Notes owns note/attachment backup and restore.
- Diet owns nutrition/history export.
- A game owns progress/export rules if persistent private progress exists.

Do not place private app content into the A4 platform snapshot to avoid building an app-specific exporter.

## 11. Do not invent "disconnect"

These are first-party apps sharing one canonical identity. Removing an `account_user_apps` marker would not revoke that identity from the application and would not necessarily delete application data.

Therefore the platform does not expose a generic "disconnect app" action.

If a product needs an app-specific reset/delete-data action, implement it explicitly in that app with truthful semantics.

## 12. Release checklist

Before an app is considered integrated:

- [ ] registered app row exists
- [ ] versioned manifest exists
- [ ] compatible SDK is pinned
- [ ] canonical session identity is used
- [ ] legacy session migration is tested when applicable
- [ ] `recordAppActivity()` is called after real authenticated use
- [ ] private app data remains app-owned and RLS/authorization protected
- [ ] no cross-app private-data reads were introduced
- [ ] account deletion behavior is covered
- [ ] app data export/recovery is covered where required
- [ ] MFA behavior is compatible with the app's data policy
- [ ] signed-out, expired-session, offline/failure and account-deleted states are tested
- [ ] mobile/responsive behavior is tested
- [ ] the app's complete existing release suite passes

## 13. Changes that require platform review

Do not implement these as routine consumer changes:

- changing canonical Supabase project or account id
- changing the canonical session key
- allowing app data to be read by another app
- adding organization/team tenancy to global account tables
- third-party OAuth/OIDC client registration
- subdomain/cross-origin session propagation
- mandatory AAL2 policies across apps
- introducing shared billing/entitlement semantics
- adding a generic app disconnect/revocation concept

Those alter platform architecture and require an explicit platform phase/version decision.
