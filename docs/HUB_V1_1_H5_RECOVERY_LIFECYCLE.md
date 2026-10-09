# THIEPN Hub V1.1 H5 — Recovery & Lifecycle Certification

## Stack and exact prerequisites

H5 is a separate **unmerged draft** branched from the fully qualified H4
PR #97 at `10d964fcd232f604110aa4105bd397923ff9e57e`,
which is stacked on H3 PR #98 at
`b67a9590a5cf01c144caf00ac7f98c6c07642ef9`.
Both predecessors passed all eight mandatory exact-head CI checks.
H5 requires its own fresh exact-head qualification; inheritance is not a substitute.

## Functional recovery and privacy controls

- Notes, TMS60 and Library share a minimal cross-tab clear signal with **only**
  `{ "type": "clear" }`. It includes no account, translation, device,
  consent, token, permission, resource or private snapshot information.
- Remote signals with extra keys or unexpected payloads are ignored. Valid
  local-tab disconnects clear corresponding RAM sessions and broadcast the
  signal; receivers clear their own session without echoing it.
- TMS60 translation changes clear the previous managed session **before**
  replacing the consent-bound connection and notify same-origin tabs.
  The change does not assume that a different translation inherits consent.
- Device Library disconnect and nonce-bound owner invalidation clear
  device-local sessions across same-origin Home tabs. Identity changes
  invalidate Library and require the device owner to authorize reconnection.
- An offline transition clears managed account/translation and Library
  provider contributions immediately. Returning online never silently
  reconnects, requests consent or reads private provider content.
- Page lifecycle and BFCache restoration clear Library state, requiring
  explicit device reconsent. Existing pagehide/visibility and Account
  sign-out clearing remain in effect.
- Account-dialog provider statuses are polite atomic live regions and
  provider buttons have distinct accessible names. The modal retains its
  native Escape behavior and restores focus to its opener.
- No background private search or writes, cross-owner aggregation, new
  production API, OAuth change, Core HomeDocument sync, or visual redesign
  is implemented.

## Evidence

Unit fixture regressions cover clear-signal payload validation, rejection
of leaked metadata, synchronized private snapshot removal, device consent
revision partitioning, fresh reconsent and logout recovery. Browser
regressions cover 390px/1440px focus, Escape, live status, offline/online
data withholding and an actual two-tab same-origin Library-clear signal.

The browser fixture is **not** evidence of two physical devices or live
authenticated account providers. This draft does not authorize activation
of production owner APIs, a release merge, deployment or a screenshot golden
update.

## Operator acceptance remains open

Require independent documented decisions for: real signed-in A/B accounts,
managed Notes and TMS60 owner grants including translations, Library
owner-issued consent on at least two real devices, revocation and BFCache/
offline recovery on Android Chrome, Samsung Internet and iPad Safari,
keyboard and TalkBack/VoiceOver evaluation, privacy/security review,
manual Prism reference comparison and non-deploying release rehearsal.

Each decision must identify its operator, real hardware/browser, observed
result, date, and evidence URI; missing proof remains **unapproved**.
Only explicitly approved owner API registration, permission scope changes,
merge or deployment can enable a later release.

## H6 candidate

**H6 — Release Candidate & Ecosystem Acceptance:** cross-phase exact-head
release evidence, human accessibility/device acceptance, authenticated
owner/device isolation, safe rollback, non-deploying rehearsal and independent
visual signoff. H6 is **not started**; it depends on full H5 qualification.
