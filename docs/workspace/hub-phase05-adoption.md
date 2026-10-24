# THIEPN Hub Phase 05 — explicit Hub task/event relationships

Parent: `89a2793698e8b075e0bc8fc1253ee86d037e996f`, same draft PR #189 (`feat/connected-hub`). Original owner source: PR #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Exact-head Phase 04 evidence
- Quality #40075785481: Astro zero type errors, Vitest 584/584, Chromium calendar startup, Account cross-tab refresh PASS; full Playwright 1188 PASS, 20 FAIL, 4 SKIP. Failures cluster around source view after identity transition, obsolete welcome expectation, offline query-string cache, asynchronous navigation; not 20 independent data/persistence defects.
- Library #40075785522: PASS original Library owner and Chromium/Firefox/WebKit device-only consent.
- Reading #40075785484: PASS original Library owner build and explicit-opt-in three-browser reading pilot.
- No original Account authentication code or rotating-token tests changed.

## Implementation
1. Use the **existing Hub Workspace schema-v1 widget config** for up to 32 reviewed task–event relations per active workspace, with original IDs and controlled roles (work, prepare, follow-up). Validate unique relation ID and triple, source records and configuration; reject forged/missing source IDs.
2. Expose source-grounded create/unlink actions in native Today, task/event context and optional customizable Workspace widget, using original PR #166 pure engine and proof tests.
3. Reuse `mutate`, existing WorkspaceStore revision/CAS/undo, owner boundaries and normal confirmations. Stale unlink compares exact original snapshot; links with removed source show missing state rather than recreating copies.
4. Keep task due dates, event dates/times, statuses, external calendars and Folio/Notes untouched by link operations; no duplicate task or calendar engine.
5. Reconcile legacy tests to the **original data owner's view** following identity transitions (Today default remains intended); guest never receives previous owner's data. Keep originals' security assertions and only replace obsolete visitor onboarding expectations with actual optional workspace and no-grant behavior.

## Limits
- Associating an existing task with a Hub event is an explicit user decision; a due date is not an appointment. No implied availability, StudyOS curricular approval, imported records, OAuth permission, new schema version, background scheduler or KEEP encrypted-vault bypass.
- Full initial release remains NO_GO until exact-head Quality and three browser engines qualify.

## Phase 06
Inspect original exact-head CI before committing additional work. Fix genuinely reproduced storage/privacy assertions, not old screen defaults. Then selectively adopt the next source-grounded feature from PR #166 only if missing from canonical main and not subsumed by existing sources.
