# THIEPN Account Browser SDK 1.0

The canonical browser SDK is published at `/account-platform/sdk/v1/index.js` and versioned as **1.0.0**. It is the default integration surface for every new THIEPN web app.

## Canonical configuration

SDK 1.x freezes these consumer-visible invariants:

- Supabase project: `hycegznamzjhwinegaai`.
- shared browser auth storage: `sb-hycegznamzjhwinegaai-auth-token`.
- account contract: `1.0`.
- session authority: `thiepn-account`.
- production origin: `https://thiepn.dev`.
- default sign-out scope: `local`.

Consumers must not replace those values with app-specific equivalents.

## Start

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0"></script>
<script type="module">
  import { createThiepnAccount } from '/account-platform/sdk/v1/index.js';
  const account = createThiepnAccount({
    createClient: window.supabase.createClient,
    appSlug: 'my-app',
    redirectTo: new URL('./', location.href).href,
  });
</script>
```

The returned object exposes `client` for application data calls. Authentication/session actions should go through the SDK methods so sign-out scope, redirect safety and normalized session behavior remain consistent.

## Stable 1.x API

- `getSession()` — normalized session metadata; never returns access/refresh tokens.
- `getUser()` — canonical account ID/email for in-app identity display/ownership.
- `onAuthStateChange(callback)` — normalized account state events, including Supabase `PASSWORD_RECOVERY` when applicable.
- `signInWithPassword()`.
- `signUpWithPassword()`.
- `signInWithGoogle()`.
- `requestPasswordReset()` — sends the recovery email to an approved redirect.
- `resendSignupConfirmation()` — resends signup confirmation to an approved redirect.
- `updatePassword()` — completes recovery or changes the signed-in user's password; optional `currentPassword` is supported by the pinned Supabase JS line.
- `updateEmail()` — requests a signed-in account email change.
- `reauthenticate()` — requests the provider reauthentication nonce for sensitive account actions.
- `refreshSession()`.
- `signOut({ scope })` — defaults to `local`; explicit `others`/`global` are allowed.
- `diagnostics()` — non-sensitive SDK/app/session-presence metadata.
- `classifyError()` — A7-compatible network/auth/authz/rate-limit/service/request taxonomy.
- `assertAllowedRedirect()` — permits `thiepn.dev` plus localhost/127.0.0.1 development origins only.

Password recovery is a two-step flow: call `requestPasswordReset()`, then when the app receives the recovery auth state, collect the new password and call `updatePassword()`.

## Forbidden consumer behavior

A consumer must not create a second canonical account profile, copy tokens into app-specific storage, restore sessions with `setSession`, generate canonical user IDs, call broad `localStorage.clear()`, silently turn a network error into logout, use an unscoped `auth.signOut()`, or direct production auth to another project.
