# THIEPN HUB H8 — Production qualification

H8 prepares a **public-handoffs review candidate**: the public portal, browser-local personalization, app launchers and manual workflow guides. It does not certify authenticated federation, cloud preference sync, private Inbox reads, inline saves or automated transfers. This branch is not deployed.

## Reconciled source

H7 `8f5325ab107d25909a481735b241f37d11928367` passed [Quality CI](https://github.com/thiepn/thiepn.github.io/actions/runs/37026320774): 148 unit tests and **525 browser checks** across Chromium, Firefox and WebKit, plus scale and automation gates. Byte images and workflow history passed. This supersedes H7's earlier local image limitation; it does not erase H6's historical failed CI.

Main advanced to `8a07cf2bf98b886bff7018506c8a456d3ec8d839`. H8 merges its 18 Orrery maintenance/release commits. Public Orrery v2.0.1 bytes remain identical to main. Integration typecheck found a literal `\n` outside a string in main's smoke script; H8 fixes that syntax error and the escaped prerelease regex. Script syntax is checked; remote Orrery services are not recertified by this correction.

Hub PRs remain open and stacked: [H1 #55](https://github.com/thiepn/thiepn.github.io/pull/55), [H2 #56](https://github.com/thiepn/thiepn.github.io/pull/56), [H3 #57](https://github.com/thiepn/thiepn.github.io/pull/57), [H4 #58](https://github.com/thiepn/thiepn.github.io/pull/58), [H5 #59](https://github.com/thiepn/thiepn.github.io/pull/59), [H6 #60](https://github.com/thiepn/thiepn.github.io/pull/60), [H7 #61](https://github.com/thiepn/thiepn.github.io/pull/61), then H8. Reconciliation does not merge the PRs or deploy main.

Owner heads rechecked on 2026-10-02:

| Owner | Main revision | Implication |
|---|---|---|
| Notes | `a14d671bebe8715640c11ad5c8c5988749bfd820` | H3 baseline unchanged; capture handoffs only |
| Library | `f8ccec78d2290d1b3dfde7343d5e19db32ccdf43` | Device-private history stays in Library |
| TMS60 | `be068d9476fe045680d59113d8adfa40f2ce2b80` | Selected-translation projection remains disabled |
| Account | `65f49dd3162492d77dd466326706ae4614bd34bb` | [Hub-entry PR #2](https://github.com/thiepn/account/pull/2) remains open at `dccdb0460f6e6cb8c93e7f14a7deead38fa5f0a0`; live Hub identity uncertified |

## Frozen public profile

`release-hub.json` records the Hub review profile separately from preserved historical Phase 15 records. `/hub-release.json` reports build-derived capability flags and the reviewed count. It contains no identity, key, user preferences or private results. This declaration is neither authorization nor proof that CI passed.

| Capability | H8 release state |
|---|---|
| Apps / public Search | 27 reviewed apps; admission ceiling 250 |
| Home | Browser-local pins, density, sections and privacy controls |
| Account | External Account link; Hub sign-in disabled |
| Daily modules | Public/app-owned handoffs; private runner unwired |
| My resources / Inbox | Explicit unavailable coverage; no reads or fake totals |
| Workflows | Three manual guides; no automatic transfer or save receipt |
| Private reads / writes / transfers | Disabled; provider and attention transports null |

Keep production `HUB_ACCOUNT_ENTRY` unset. An actual compiled build with `PUBLIC_HUB_ACCOUNT_ENTRY=v1` is rejected by this profile. Identity enablement needs a separately reviewed profile after live Google/Account/callback, account-switch and session certification. A frontend flag cannot satisfy that gate.

## Enforced gates

`npm run hub:qualify` checks the built profile and provider registry against source: disabled features, handoff-only transports, bounded budgets, matching Home/pin/Search rosters, seven HTML routes, personal-route noindex/sitemap exclusion and analytics exclusion on Home, Search, Inbox and callback. It checks directly referenced scripts/stylesheets and fingerprints 49 current public artifacts. A failed qualification removes the preceding success report first.

`npm run test:hub-release` accepts a valid isolated artifact, then rejects seven faults: auth enablement, provider-operation drift, Home indexing, Search analytics, personal sitemap leakage, missing app card and missing referenced asset. Each failed gate removes stale evidence. Unit tests reject unknown/missing fields, non-boolean flags, stale profiles and invalid counts. The new browser test seeds a fictional stale local identity and requires disabled account controls, no private requests and explicitly disconnected Inbox coverage.

Quality CI runs source/built gates and artifact fault tests after the full studio matrix, preserving the fingerprint report. Deployment runs the source audit, payload budget and built-profile gate before upload. It retains the report in a separate Actions artifact. The post-deploy job downloads this exact build report and compares served canonical Hub pages/assets byte-for-byte, rejecting redirects, missing/stale bytes and profile drift. Reads are bounded to six concurrent requests with eight-second deadlines; no login or private operation occurs.

The older source audit reported 46 obsolete expectations. H8 uses a separately reviewed featured count, excludes projects by current source visibility instead of an obsolete Markdown Guide hold, accepts Astro's boolean `noindex` syntax, and checks current THIEPN branding. Duplicate identity, generated metadata, launch/route integrity, fallback and retired-brand checks remain. Historical visual/browser workflows do not replace the current Hub studio matrix.

The first complete H8 matrix passed 527/528 checks. WebKit stalled on a lazy-loaded Signal Earth thumbnail after scrolling into an image card with `content-visibility:auto`. H8 removes layout skipping from image cards and keeps ordinary native image lazy loading; text-only Search rows retain progressive layout. The complete corrected candidate must pass its own matrix. Serving fixtures additionally reject same-size hash tampering and oversized bodies, not just missing files.

## Qualification evidence

| Local check | Result |
|---|---|
| Unit suite | 155 passed / 24 files |
| Typecheck | Zero errors/warnings; seven existing hints |
| Generated output, catalogue/media/link syntax, source audit and lockfile | Passed |
| Build and payload budgets | Passed; 27 genuine Hub captures verified |
| Built profile | Passed: 27 apps / seven routes / 49 hashed artifacts |
| Artifact faults | Valid copy accepted; all seven faults rejected; stale report removal verified |
| Actual auth-enabled build | Rejected |
| Exact-artifact smoke | 49 matching artifacts against local preview |
| Firefox stale-identity check | Passed |

Local Firefox required test-process sandbox adjustments. Default Chromium download was blocked and the alternate launcher failed; **H8's complete matrix must come from its own CI**, not H7's earlier run. Local/emulated checks do not certify physical Android/iPad/desktop devices. No real Google session, other-owner denial, grant revocation, private projection or automated transfer was exercised.

Current Supabase changelog and [redirect documentation](https://supabase.com/docs/guides/auth/redirect-urls) were reviewed on 2026-10-02. Relevant listed breaking entries concern database upgrades or self-hosted configuration, neither changed here. Production redirect/session behavior remains a live-identity gate. H8 changes no SDK, database, RLS policy, auth setting, key or grant.

## Promotion and recovery

1. Require H8's complete CI on the reconciled candidate; review the composite diff against main. Reconcile and qualify again if main advances.
2. Promote the reviewed stack with private flags disabled. Main pushes deploy automatically: avoid publishing intermediate phase heads as separate production releases.
3. Deploy the exact approved candidate through Pages. Require both build qualification and exact-artifact smoke; an uploaded artifact with a failed smoke is not certified.
4. Recover by restoring a known complete pre-promotion site revision, including current app assets, then rebuilding/deploying with its matching smoke procedure. H8 adds no database migration or app-data mutation and does not delete guest preferences during rollback.
5. Record physical-device checks separately. Complete H2 identity and H3 owner endpoint/authorization gates before adopting an enabled profile.

Next: **H9 — Controlled public rollout and live integration certification**. Promote the public candidate, verify serving/device behavior, then certify Account entry and scoped pilots as separate enablements.
