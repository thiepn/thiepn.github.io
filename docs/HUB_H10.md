# THIEPN Hub H10 — Identity qualification

H10 prepares a real-provider qualification path after H9 (`e25e007903737dcf5834231f0094278cc50e86be`). It does not enable production identity or certify private app authorization. The public release gate still rejects `hubSignIn: true`; all production flags remain false. Supabase remains the canonical identity provider. Account and Hub retain separate sessions; shared identity does not confer app-scoped access.

## Changes

The callback accepts exactly one nonempty code and one 256-bit flow nonce, with no fragment or additional parameters. Duplicate fields, implicit tokens, provider errors, control characters, malformed codes, expired and non-finite initiation times fail before exchange. Callback query/fragment removal still happens immediately, even with identity disabled. Pending state is consumed on rejection as well as success.

Server verification must identify the same canonical UUID as the SDK session. A mismatch hides account customization instead of selecting another account's local partition. Generation checks prevent an older verification response from restoring identity after a newer sign-out.

The paired suite adds real pinned SDK tests for callback injection, refresh rotation, revoked refresh, mismatched identity and a delayed verification response after cross-tab sign-out. Provider responses and tokens in these tests are fictional. These checks are regression proof, not Google, hosted configuration or physical-device certification.

## Operator-run real authentication

Use a trusted desktop with Node 24, this exact repository revision and a headed Playwright browser. The operator signs into Google personally. No credential automation, existing browser profile, traces, HAR, screenshots or provider error logs are used. The fresh context is destroyed on completion. The run initiates real Supabase sessions, so use authorized test accounts and finish local sign-out. Aborting destroys local browser storage but does not revoke an already-created server session; revoke that test session through Account if needed.

Build into an isolated directory; obtain the existing project's **publishable** key through the approved Supabase control surface. Never use a secret/service-role key. Set `PUBLIC_THIEPN_SUPABASE_PUBLISHABLE_KEY` in the local process environment, then:

```sh
npm ci
npx playwright install chromium
PUBLIC_HUB_ACCOUNT_ENTRY=v1 \
PUBLIC_HUB_AUTH_ORIGIN=https://thiepn.dev \
PUBLIC_THIEPN_SUPABASE_URL=https://hycegznamzjhwinegaai.supabase.co \
npm run build -- --outDir .cache/h10-identity-dist
npm run hub:identity:operator -- --real-auth --dist .cache/h10-identity-dist --browser chromium
```

The command requires an interactive terminal and rejects CI, the public disabled build and known fictional keys. It serves the isolated candidate at `https://thiepn.dev` **only inside its new browser context** through request interception. Account, Google and Supabase use their actual HTTPS services with normal certificate verification. Production hosting, DNS, redirect settings and grants are unchanged. Private REST, Functions and Storage requests to the canonical project are blocked and counted. This is a local-browser candidate observation; it does not certify deployed headers, CSP or serving behavior.

The runner checks actual code exchange and user verification, reload, cancelled switching, a different account, natural refresh followed by re-verification, and local/cross-tab sign-out. It never clicks Continue with Google. Natural refresh must happen after the second login; skipping it produces a failing check. The default JWT lifetime can make that step take about an hour. Do not shorten production token lifetime or modify real token storage for this test.

The report contains only candidate file hashes, browser version, deployed Account commit, timestamps, boolean checks and endpoint-success counters. It contains no emails, UUIDs, tokens, codes, request URLs, headers or bodies. Candidate auth assets are held in memory so their hashes match the files served during the run. `productionCertified` is always false, even when every observed check passes. This report is evidence for review, never an enablement token.

## Exit criteria before production sign-in

| Requirement | Required evidence |
| --- | --- |
| Hosted configuration | Authoritative review of the existing project's Google provider and exact `https://thiepn.dev/home/auth/callback/` callback with its generated `flow` query; verify redirect matching against current Supabase docs. A provider redirect alone is not proof of the allowlist. Avoid broad domain wildcards. |
| Real lifecycle | Completed operator observations per supported engine, including natural refresh, cancellation, different account and both tabs signing out. |
| Preference partitions | Manually verify guest/A/B pins and daily settings through reload/switch/sign-out; guest state must not silently become account state. |
| Separate Account session | Sign into Account independently, complete Hub local sign-out and verify Account remains signed in. No tokens or verifier cross origins. |
| Revocation | Use two authorized test devices; revoke the other session in Account, record behavior before/after access-token expiry and refresh. Do not claim immediate JWT revocation from `getUser()` alone. Strong private-operation revocation later requires owner-side session/grant enforcement. |
| Real devices | Android Chrome and iPad Safari round trip, storage, reflow, back/replay and recovery observations; desktop engines are not physical-device proof. |
| Serving/recovery | Separate reviewed identity release profile, exact deployed candidate hashes, live lifecycle verification and a tested return to the public disabled profile. The H8 production gate is not loosened here. |

Private pilots retain H3's separate prerequisites: bounded owner projections, consumer-purpose authorization, other-owner denial, grant/consent revocation and workspace/translation boundaries. A successful Google round trip cannot satisfy those prerequisites. No Supabase app OAuth client, Cloudflare/Vercel backend, namespace migration or production grant is created in H10.

## References and status

Reviewed the Supabase changelog on 3 October 2026; relevant Node support changes are satisfied by Node 24. Current managed PKCE/session guidance: [PKCE flow](https://supabase.com/docs/guides/auth/sessions/pkce-flow), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [sessions](https://supabase.com/docs/guides/auth/sessions). Sign-out invalidates refresh sessions; existing access JWTs can remain valid until expiry, so future sensitive owner endpoints require their own authorization guarantees.

Real Google authentication, callback administration and physical-device observations remain pending. The operator command is ready for those observations; synthetic CI must not be described as their completion.
