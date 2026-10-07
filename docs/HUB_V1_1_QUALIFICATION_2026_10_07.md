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
| TMS60 paired owner fixture | `21d733b015f12a7c58e0d1728ef9edf5fa30a074` |
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
- Pair Account, managed Notes and TMS60 CI with the current immutable Account revision.
- Wire staged Notes and TMS60 owner sessions into Prism Continue/Now/Study/Recent.
  Reuse their existing managed PKCE/consent/projection contracts; credentials stay
  in the RAM-only owner session. Preview cannot start canonical authorization.
- Use only permitted visible summary/Continue reads. Search is never automatic.
  Empty or unavailable cloud snapshots do not fabricate Study counts.
- Publish hidden-operation removals immediately, withhold private data from
  hidden block DOM, and clear contributions on disconnect, identity changes,
  backgrounding, translation changes and late callback cancellation.
- Correct low-contrast shortcut hints and mobile navigation labels while
  retaining Prism's neutral palette.
- Expire summary-only Recent data without a new request. Retained private
  snapshots also expire when another provider rebuilds the shared runner.

## Verification performed

| Check | Evidence |
| --- | --- |
| Deployed main source baseline | Typecheck, 266 unit tests, build, validation, release gate and smoke fixtures passed |
| Current Prism source | Typecheck: 0 errors, 0 warnings; 329 unit tests passed |
| Prism UI Chromium | 14 tests passed: desktop/tablet/mobile composition and editing, plus 320/1440 light/dark axe checks on Home and Account dialog |
| Hydrated Prism accessibility | Two additional local axe audits passed at 320/1440 with actual staged Notes contributions; zero selected WCAG A/AA violations |
| Studio Chromium | 185 of 186 initially passed; the failing Byte image case passed after vendoring its assets |
| Real Library Chromium | 21 cases passed, including canonical Prism Continue/Recent, summary-only expiry with Continue hidden, consent/revocation and exact-edition handoff |
| Managed Notes Chromium | 15 real Hub/Account build cases passed, including Prism at 320/1440, Continue-only and summary-only permissions, expiry/revocation, late hydration and preview denial |
| Managed TMS60 Chromium | 18 real Hub/Account build cases passed, including Prism at 320/1440, translation changes, summary counts, unavailable/unsupported data and hidden-data clearing |
| Account owner | Typecheck, 135 unit tests, production build passed |
| Current Account + Hub Chromium | All 21 isolated real-build/SDK tests passed; synthetic identity service, no real user authentication claimed |
| Standard production build | 58 pages; 27 apps, 7 release routes, 51 hashed artifacts; validation and built performance budgets passed |
| Release gate | Device-reading-pilot qualification with managed features disabled; rejection tests and isolated smoke fixtures passed |

The local environment could run Chromium from an official packaged executable,
but Playwright Firefox/WebKit downloads failed. All ten GitHub workflows passed on the preceding qualification commit
`f5c21fcf94d21162d140995ba62053bf775fa38c`, including 558 Studio browsers,
63 paired Account browsers and 60 Library browsers across all three engines.
Every provider hydration source revision must rerun the same matrix; current
run IDs/results are attached to draft #94. Synthetic fixture artifacts are
isolated under ignored cache directories; the standard production build is
restored and release-gated separately.

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
  sync readiness. The inspected protocol gives conceptual push/pull/bootstrap shapes, but the
  Gateway source has no general Document Sync handler or deployed Hub document
  adapter. P7 still requires durable IndexedDB/outbox/base/cursor storage,
  conflict/recovery/history behavior and actual owner-scoped server transport.
  Existing localStorage Home preferences do not satisfy that requirement. No
  fake sync success was added.
- Physical S21/iPad acceptance remains open in the existing device matrix.

## Remaining qualification inputs

1. Require all-engine CI success on the exact reviewed source revision.
2. Owner must provide a controlled authenticated test session and the required
   physical S21/iPad evidence. Use secure browser sign-in handoff, never chat
   credentials. Account login alone does not enable the disabled Hub profile.
3. Resolve/review the Core API custom domain and Languages AI production
   dependency with the existing Cloudflare owner access; rerun production smoke.
4. Complete the agreed authenticated Prism production profile and approve
   canonical `/home/` promotion after parity evidence. Do not label the current `review-candidate`
   device-reading profile as authenticated production qualification.

Draft #94 and the other staged integrations remain review work. Passing isolated
fixtures, READY Vercel status, and public pilot tests do not satisfy the missing
authenticated, physical-device, or canonical-route release acceptance.
