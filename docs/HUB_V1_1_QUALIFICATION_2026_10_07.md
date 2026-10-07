# Hub V1.1 qualification — 2026-10-07

## Disposition

**Review candidate; not yet production qualified.** Production remains the existing
GitHub Pages reading pilot. Prism remains on `/home/prism-preview/`; the canonical
`/home/` route, product URLs, identities, and manual promotion gates are preserved.
No authentication, private provider, or Core sync feature was enabled by this work.

## Source reviewed

| Component | Revision |
| --- | --- |
| Hub deployed main baseline | `32cb1bee04387119ff9f382f16fd5dfd699009a1` |
| Prism draft #94 baseline | `5e9ceba61cd5d159af3681ccc3b037881ad3bc21` |
| Account paired owner | `19abe54a605ee7fe121d91e4b5cbef0f0b74763b` |
| Core inspected main | `1189dd65cc6a5109db7657282173ebbb2d178dbf` |
| Real Library owner fixture | `b84930b991f4819c9c22fc1d63e23b12a5c6ff4d` |

The protected Vercel `thiepn-hub` candidate is READY but uses the older
`3e25c76157dbd5086865cf27249f27581edb1fa4` source, has no custom domains and is
not the serving production Pages build. It cannot certify the current Prism code.

## Corrections

- Remove the duplicate `connectedProviders` implementation that broke typecheck.
- Align Prism tablet CSS with its 1199-pixel controller/layout boundary.
- Preserve an existing site theme when bootstrapping a pre-V2 Home document.
- Serialize edits and Undo against the last persisted document; a failed save
  leaves the next operation usable and does not publish unpersisted state.
- Remove expired provider grants and their cached private contributions.
- Disable Library connection on the preview route, where the real owner rejects
  the caller. Exercise Prism Continue on canonical Home in the isolated fixture,
  without widening the Library owner allowlist.
- Serve Byte character previews from pinned first-party local assets.
- Pair CI with the currently inspected immutable Account revision.

## Verification performed

| Check | Evidence |
| --- | --- |
| Deployed main source baseline | Typecheck, 266 unit tests, build, validation, release gate and smoke fixtures passed |
| Corrected Prism source | Typecheck: 0 errors, 0 warnings; 319 unit tests passed |
| Prism UI Chromium | 10 tests passed at desktop 1440, tablet 1024, and mobile 390; dark theme, migration, editing, drag, Undo, theme editor, and search |
| Studio Chromium | 185 of 186 initially passed; the failing Byte image case passed after vendoring its assets |
| Real Library Chromium | 20 cases passed, including canonical Prism Continue, consent/revocation, expiry, hidden-page clearing, and exact-edition handoff |
| Account owner | Typecheck, 135 unit tests, production build passed |
| Current Account + Hub Chromium | All 21 isolated real-build/SDK tests passed; synthetic identity service, no real user authentication claimed |
| Standard production build | 58 pages; 27 apps, 7 release routes, 51 hashed artifacts; validation and built performance budgets passed |
| Release gate | Device-reading-pilot qualification with managed features disabled; rejection tests and isolated smoke fixtures passed |

The local environment could run Chromium from an official packaged executable,
but Playwright Firefox/WebKit downloads failed. Updated GitHub CI must provide
all-engine evidence for the corrected commit. Local fixture builds containing
synthetic publishable configuration were discarded and the standard build restored.

## Live observations and integration limits

- Live Pages Home loads normally. Customize, search, and the Account navigation
  work on desktop. Hub sign-in is disabled by the deployed reading-pilot profile.
- The last inspected live rollout job on main verified 50 exact artifact hashes
  and passed six public flow tests across Chromium, Firefox, and WebKit (390-pixel
  viewport). These tests explicitly exclude Google sign-in and physical devices.
- Account presents its real Google sign-in page. No real credentials or user
  tokens were used in fixture tests or deployment configuration.
- Core deploy run `37546929742` uploaded Worker version
  `678d968b-6925-4809-867a-7d7be2d4c64f` successfully. Its production check failed
  on the signed Languages AI dependency with `unavailable/NETWORK`.
- The actual `thiepn-core-gateway.thiepn.workers.dev/health` endpoint returned a
  healthy protocol response during this inspection. `api.thiepn.dev/health` and
  `ai.thiepn.dev/health` returned proxy connection-refused 502 responses from this
  environment. The Core deployment file has no custom-domain route; its runbook
  requires owner Cloudflare configuration before using the canonical API domain.
  This does not prove the workers.dev Gateway is down.
- General Core document/event/file sync remains a specification, rather than an
  implemented Hub capability. Narrow product routes do not establish general Hub
  sync readiness. No speculative implementation or fake sync success was added.
- Physical S21/iPad acceptance remains open in the existing device matrix.

## Remaining qualification inputs

1. Obtain all-engine CI results for the corrected source and review failures.
2. Owner must provide a controlled authenticated test session and the required
   physical S21/iPad evidence. Use secure browser sign-in handoff, never chat
   credentials. Account login alone does not enable the disabled Hub profile.
3. Resolve/review the Core API custom domain and Languages AI production
   dependency with the existing Cloudflare owner access; rerun production smoke.
4. Select and approve the appropriate release profile and canonical Prism
   promotion after parity evidence. Do not label the current `review-candidate`
   device-reading profile as authenticated production qualification.

Draft #94 and the other staged integrations remain review work. Passing isolated
fixtures, READY Vercel status, and public pilot tests do not satisfy the missing
authenticated, physical-device, or canonical-route release acceptance.
