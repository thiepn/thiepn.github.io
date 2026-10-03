# THIEPN HUB H9 — Controlled public rollout and live integration

## Scope

H1–H8 was merged as one release at `0dbbb49172f335afebc9f4b9fe1c2ccb9433cefc` on 3 October 2026. Quality CI passed on that exact main revision. Deployment and exact Hub artifact smoke passed twice: 49 artifacts; site smoke covered 48 routes and 31 launch URLs. H9 adds repeatable post-deployment browser checks and reconciles the Account entry prerequisite. This does not activate Hub identity or private providers.

## Route ownership correction

The deployment's final Orrery version assertion failed after the Hub checks passed. Live `/orrery/` serves `APP_VERSION='1.4.0'` (GitHub response Last-Modified 30 September 2026). `/orrery/version.json` returns 404. Both ordinary and cache-busting GETs show the same page. The separate `thiepn/orrery` GitHub Pages project owns that route; the user-site repository's `public/orrery` v2.0.1 copy is not the served application. This is a real owner/version mismatch, not a successful 2.0.1 release or a formatting-only test defect.

Hub deployment keeps all site-route/launcher availability checks and its exact artifact gate. App-specific JPL/weather/version certification is removed from the Hub deployment job and remains in the existing separate Orrery burn-in workflow. That owner-release mismatch remains unresolved here: H9 does not overwrite the separate app or weaken its version assertions. Future owner release work must reconcile the actual served repository before claiming Orrery 2.0.1. Public-launcher availability does not certify app release versions.

General site-smoke fetches now have eight-second request/body deadlines. The verify job has a fifteen-minute ceiling. Existing bounded concurrency and retries remain.

## Account prerequisite

Reconciled Account PR #2 with main `65f49dd`, preserving the current visual design and adding Return to Hub to desktop/mobile navigation. The outer `/hub/entry` URL now rejects extra/duplicate fields and fragments. Valid continuation still accepts only the pinned Google S256 request and exact Hub callback. Account candidate including the contrast correction: `cceb04def401b117e23f082dab71c56ba60552f6`; paired workflow checks out that immutable revision, never an unreviewed moving branch.

Expanded paired testing found the Account explanation paragraph at 4.46:1 contrast. Account PR #3 uses its existing foreground-soft color; both Firefox reflow/axe checks then passed at 320 and 1440. The preceding 11 Firefox identity/lifecycle checks passed.

Local Account typecheck, 30 unit checks and production build passed. Account uses its existing deployment-after-green-CI workflow. No database, app grant, redirect allowlist or secret is changed. Source integration and tokenless entry verification are distinct from real Google authentication.

## Repeatable checks

- `Hub Account integration`: builds actual paired Hub and Account applications with the real pinned SDK and a fictional provider. Runs all existing paired identity/preference/PKCE tests on Chromium, Firefox and WebKit, including axe at 320/1440. The enabled fixture build is isolated in this job and never uploaded for deployment.
- `Hub live rollout`: runs after successful main Pages deployment, checks out that deployment's source and downloads that exact run's retained fingerprint report. Rechecks all 49 bytes before browser flows. Manual dispatch runs the same public flows without claiming an exact deployment report.
- Live browser flows: default-disabled release profile; fresh-context pin edit/reload; public Search; unavailable My resources; manual workflow navigation; no private backend calls; mobile reflow; runtime errors; deployed Account release metadata; valid tokenless entry link and history cleanup; attacker destination and outer-field rejection. Google continuation is never clicked; issuer navigation is blocked in the probe. These flows change only synthetic browser-local preferences in a fresh context.
- Live evidence has no real identity/session/token data. Browser traces are disabled for live checks; retained screenshots contain only public UI. Paired traces contain fictional data only.

Run `npm run test:hub-live` against deployed production. Run `H2_ACCOUNT_DIST=/absolute/account/dist H2_AXE_PATH=/path/axe.min.js npm run test:hub-account` against paired built applications. The Account build needs the canonical `VITE_SUPABASE_URL`; the Hub fixture build uses H2's documented non-real key.

## Enablement limits

All production H8 feature flags remain false: Hub sign-in, private reads, inline writes, Inbox feeds and automated transfers. H9's new tests do not bypass the existing build gate. The Account entry can be deployed independently while Hub stays usable as the public/local portal.

Remaining identity work: exact Supabase callback configuration; actual Google/code/refresh behavior; real account switching/cancellation; cross-tab and cross-device revocation. Remaining private pilots: owner-defined bounded projections, consumer-purpose authorization, positive owner and other-owner denial, grant/consent revocation and selected workspace/translation. Library device-private history must not be silently adopted. No real user Google session or physical Android/iPad device is certified by these automated probes.
