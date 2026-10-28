# Hub Phase 04 — actual workflow and legacy qualification reconciliation

Source baseline: `1222de4b6675511544880657a55f3ee9857c1203` on draft PR #189. Owner P0/P1 source #166: `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Exact owner-visible baseline
- Quality 40045953195, job 120727602902: original owner, account and StudyOS checks PASS; authentic browser suite 1047 passed / 155 failed / 4 skipped. Broad failures clustered in legacy Home/Workspace suites after Today became default, plus other failures that may have independent causes. Do not imply all 155 are resolved.
- Library 40045953328, job 120727603104: PASS full original owner build and Chromium/Firefox/WebKit device consent.
- Reading 40045953182, job 120727659700: FAIL 51/52; only WebKit optional-join initial Account control locator.click stability timed out while rendering. Not evidence for unsafe source modification.

## Implementation
- Reconciled historical layout tests to load the existing explicit `?mode=workspace` native presentation without changing original assertions for drag/reflow, saved layout, cookies/identity, privacy, CAS, export/import, App shortcuts, consent, source counts, and Account continuity. Kept new Today-default tests unchanged. Updated only labels reflecting the real Today/Plan navigation. Fixed strict locator for the **actual** duplicate weekly-review actions.
- Preserve explicit `?mode=workspace` across reloads; fresh root `/` still defaults to Today. This is presentation choice, not a duplicated workspace or persistent private record.
- Adopted original source-bound event-preparation projection, local unfinished/completed task suggestions, local note suggestions and approved fresh Folio/Notes title references. No third-party writable route, invented relation, ID copying or auto-created assessment.
- Event context reuses the exact original `showEventContext` and native `editTask`/`editNote` writers with explicitly reviewed preparation, follow-up and event-note drafts. No write until submit. Existing `context-task`, `edit-note`, and `review-event-time` actions remain original.
- Upcoming seven-day actual Hub calendar event preparation available on Today. Kept the original week/Today projections; do not invent Folio/StudyOS meetings or availability.
- Added original focused event-preparation unit suite, responsive browser actions, and modest styling only for actual data/actions.

## Exact-head gates
Requires full original TypeScript/Astro, 579+ unit suites, genuine Chromium/Firefox/WebKit, Account and Library/Reading qualification. A focused source defect can be fixed within this same draft PR. No new PR, merge, migration, OAuth grant, production source write or deployment.

## Phase 05
Use only exact-head runner failures, preserve Today-first semantics and original protected tests; then choose the next still-missing owner-grounded Hub task/Calendar relationship workflow from PR #166 if it is truly independent of the existing native context.
