# Account UI Patterns

A8 standardizes behavior, not one visual design. Consumers may style account UI to match the app while preserving the platform states below.

## Shared control

The optional UI helper is published at `/account-platform/ui/v1/index.js` with minimal structural CSS at `/account-platform/ui/v1/styles.css`.

```js
import { mountThiepnAccountControl } from '/account-platform/ui/v1/index.js';

const control = mountThiepnAccountControl({
  account,
  root: document.querySelector('#account-control'),
  onSignInRequest: () => openAppSpecificSignInPanel(),
});
```

The control shows normalized account state, performs **local** sign-out through the SDK when signed in, and requests sign-in rather than inventing its own credential flow when signed out. Without a callback it dispatches `thiepn-account:signin-request` from the root element. Network/service failure disables the action and displays `Account temporarily unavailable`; it never renders that condition as signed out.

## Required states

- `Checking account…` while the canonical session is resolving.
- `Sign in` when there is no session.
- signed-in identity display may use the account email where appropriate.
- `Account temporarily unavailable` for network/service failure; do not present this as signed out.
- `Session expired` only when authentication is actually invalid.
- clear `Rate limited` / retry-later feedback for 429-class failures.

## Actions

Primary entry points may be Email/password, Google, or both, as declared by the consumer manifest. Password recovery should be available whenever email/password is exposed.

Ordinary app sign-out means **local sign-out**. “Sign out other sessions” and “Sign out everywhere” are security/account-management actions and must be labeled explicitly.

## Error language

Do not expose JWTs, Supabase internals, provider error dumps or raw database errors. Translate the SDK failure category into a user-facing state while retaining the request/correlation ID only when it genuinely helps support/diagnostics.
