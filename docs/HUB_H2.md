# THIEPN HUB H2 — Account entry and isolated Home preferences

Status: implementation and paired browser validation complete; live Google/callback certification pending. H1 remains PR #55, open with its quality CI passing as checked 2026-10-01. H2 is stacked on that branch, so its review diff excludes H1.

## Reconciled authority and decision

Account source inspected at `80bfe2d908de3a4feec701acd161478b4bb8e981` (2026-10-01). Canonical identity remains the existing THIEPN Supabase `auth.users.id`; Google PKCE, `auth.getUser()` verification, local sign-out and other-session revocation already exist. Account's OAuth return validator accepts internal routes only. There is no supported cross-origin session/token bridge or Hub preference RPC. Profile locale/timezone capabilities do not imply a pins/spacing sync capability.

Hub now initiates PKCE using the same identity project and a dedicated storage key, then navigates to Account `/hub/entry` with a tokenless authorization request. Account accepts only the pinned issuer, Google, S256 challenge, account chooser and exact Hub callback with one 256-bit flow nonce. It rejects alternate destinations, duplicate parameters, fragments, credentials and unsupported fields. The Account entry page explains the separate browser sessions and offers Continue with Google or Return to Hub. Existing Account sidebar/drawer gain a fixed Return to Hub link.

The verifier stays on Hub; Account sees no Hub access token, refresh token or verifier. Google/Supabase return a one-use authorization code to Hub, which checks its tab-local pending nonce and ten-minute initiation window, consumes pending state, strips the callback URL, exchanges the code with the pinned SDK and verifies the identity with `getUser()`. External return paths cannot be selected. No arbitrary redirect or `postMessage` identity/session bridge is implemented. Browser back/replay and invalid callbacks show a recovery path rather than opening account preferences. Concurrent PKCE attempts may safely fail because the SDK has one verifier slot; no experimental overlapping-flow API is used.

## Session and preference ownership

| State/action | Hub behavior |
|---|---|
| Unconfigured release | Working directory/launcher and browser-local guest preferences; visible Account link; sign-in controls unavailable |
| Checking or unavailable identity | Previous account pins cleared, customization closed/disabled, defaults only |
| Verified UUID | Load only `thiepn:hub-preferences:user:<uuid>:v1` |
| Guest | Continue using H1 `thiepn:hub-preferences`; never silently adopt/upload it |
| Switch account | Hide current preferences first, revoke current Hub session locally, then request Google account chooser through Account |
| Cancel switch | Return to signed-out Hub; previous identity is not restored |
| Sign out of Hub | Local Hub session only; other app/Account sessions remain independently managed |
| Sign-out failure | Hide account preferences and report that revocation was not confirmed; retry rechecks authority |
| Same-origin tabs | SDK auth events and focus/visibility verification update identity; preference storage events affect only the active partition |

Pin/spacing storage is a browser convenience, not an authorization boundary or encrypted private vault. Existing per-account preferences remain locally stored for the next sign-in. No app data or private provider results are stored by H2. Theme remains a device preference using H1's existing key. Account profile/security/apps/data/privacy remain authoritative in Account. No cloud preference synchronization, generic sync control, app grants, provider certification or global instantaneous logout is claimed. Account's local sign-out cannot revoke Hub's independent session. Account's supported other-session revocation affects refresh eligibility; already issued access JWTs can remain valid until expiry.

## Release and live certification gate

Default release leaves `PUBLIC_HUB_ACCOUNT_ENTRY` empty. Deploy variables are wired but not enabled by this PR. The client activates only for `v1`, the exact production Hub origin, the pinned existing identity issuer and a public publishable key. The SDK is dynamically imported only on configured Home/callback pages. Legacy same-origin Notes/default Supabase storage is not touched.

1. Merge/deploy the paired Account entry change and verify `/hub/entry` on `account.thiepn.dev`.
2. Add the exact Hub callback `https://thiepn.dev/home/auth/callback/` to the existing Supabase redirect allowlist; verify nonce query preservation with actual Google. Do not substitute broad app-origin wildcards.
3. Set repository variables `THIEPN_SUPABASE_PUBLISHABLE_KEY` to the existing public publishable key and `HUB_ACCOUNT_ENTRY=v1`, then build/deploy Hub on its canonical origin.
4. Run a real Google A→Hub→Account→Hub flow, Account management return, Hub sign-out, chooser switch to B, cancellation, two tabs and another device. Confirm separate-session semantics and actual callback/code/refresh behavior.
5. Confirm Account other-session revocation is reflected on Hub refresh; do not expect JWT-wide instant invalidation. Keep private H3 providers gated until this live certification is recorded.

These production/account configuration steps were not performed by this implementation. No schema migration, paid service or new recurring infrastructure is added. Turning off `HUB_ACCOUNT_ENTRY` restores the guest launcher; it is not a server-side session revocation action.

## Validation and reproduction

Hub: 73 unit checks, Astro check (zero errors/warnings; seven existing hints), generated/catalogue/media/link validation, build (55 pages), release lockfile gate and existing bundle budgets. All 22 H1 browser regression checks pass on the final default-disabled build, including both themes, storage recovery, search, scale and axe. Account: 29 unit checks, typecheck and production build. Account's existing large-bundle warning remains.

The paired Chromium checks serve both actual built applications under distinct HTTPS origins using Playwright request interception, the real pinned Supabase JS SDK, and a fake Google/Auth service. They verify SHA-256 verifier/challenge correspondence, canonical UUID account isolation, no tokens/verifier in navigation URLs or Account storage, callback rejection and URL cleanup, failed verification, ignored foreign identity messages, cross-tab sign-out, switch cancellation, storage blocking, failed sign-out and 320/1440 reflow. The ten paired cases pass, including keyboard continuation and zero axe violations on both applications at 320/1440. API fixtures are not proof of real Google/Supabase configuration or Firefox/WebKit behavior.

Build Account using its normal locked dependencies with `VITE_SUPABASE_URL=https://hycegznamzjhwinegaai.supabase.co`. Build Hub with:

```sh
PUBLIC_HUB_ACCOUNT_ENTRY=v1 PUBLIC_HUB_AUTH_ORIGIN=https://thiepn.dev PUBLIC_THIEPN_SUPABASE_URL=https://hycegznamzjhwinegaai.supabase.co PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY=sb_publishable_fixture_not_a_real_key npm run build
H2_ACCOUNT_DIST=/absolute/path/to/account/dist npx playwright test -c playwright.hub-account.config.ts
```

Optional `HUB_TEST_CHROMIUM` selects a local browser executable; `H2_AXE_PATH` injects a locally installed axe-core into the responsive cases. Normal releases must use the real existing public key, not the fixture key. Never supply a service-role/secret key. Ordinary H1 browser tests use a default unconfigured build.

## Research used

Reviewed the current Supabase changelog on 2026-10-01: no identified managed-project breaking change requires a custom OAuth bridge. Self-hosted gateway changes and unrelated database upgrades do not apply to this static client change. Avoided experimental overlapping-PKCE options. SDK version matches Account (`2.117.2`), with exact dependency and lockfile.

- [Supabase PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow): local verifier, one-use code, same initiating browser, overlapping-flow limitations.
- [Supabase sessions](https://supabase.com/docs/guides/auth/sessions): token lifecycle, refresh and JWT revocation limits.
- [Supabase sign-out](https://supabase.com/docs/guides/auth/signout): local/others/global scope semantics.
- [Supabase redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls): callback allowlist and production redirect matching.
- [Supabase Google sign-in](https://supabase.com/docs/guides/auth/social-login/auth-google): provider configuration and OAuth flow.
- [Supabase changelog](https://supabase.com/changelog.md).

Next: H3 — certify the Notes, Library and TMS60 provider contracts, permissions, freshness and minimal projections. Do not infer a working provider from catalogue or Account registry membership.
