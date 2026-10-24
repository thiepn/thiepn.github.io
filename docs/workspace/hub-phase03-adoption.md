# THIEPN Hub Phase 03 — native Today and knowledge continuation

Base draft PR #189 `b215a471cc2e35fc3abcb18866d4219e68e3aa37`, same branch `feat/connected-hub`. Original source ancestry #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Qualified evidence before this change
- Quality #40035679127: Calendar startup, StudyOS public edge, Account cross-tab PASS; original `audit:studio` failed at Astro check on two null-state references introduced by Phase 02 in `src/scripts/workspace-home.ts:790` (TS18047). Both references now explicitly narrowed in the existing guarded native Today render.
- Library #40035679137: PASS actual owner build, hub fixture and consented Chromium/Firefox/WebKit.
- Reading #40035679257: CANCELLED; owner/pilot builds and device-only release check passed, real browser tests NOT_TESTED. Do not claim a successful reading acceptance.

## Implemented
1. Original seven-day `projectTodayWorkbench` from PR #166 uses existing Hub `reviewDay`, `trackerTotal`, local Notes, original task IDs and optional fresh Folio projection. Render source at Home Today, never as a new store.
2. Source-approved Folio time conflicts link only to original Hub event `review-event-time` action. Re-render on original one-time share and clear, and after existing owner/privacy transitions; no Folio task writer, third-party auth, or inferred availability.
3. Reuse original `taskKnowledgeContext` / `noteWorkContext` pure suggestions in existing `showTaskContext` and `showNoteContext` handlers. Match local existing titles only; optional one-time Notes/Folio title sources require matching current owner and freshness; no durable relation or copied note body.
4. Remove only unqualified draft event-preparation/reminder extensions from the original workbench; native Calendar and existing source attention queue continue to own these functions.
5. Original Vitest proof for exact seven-day counts, strict source freshness, escaping, unrelated/no-match records, IDs and ownership. Browser checks for responsive Today, privacy mask and independent workspace routes.

## Not included
Full native KEEP encrypted B3 vault, unqualified external Note/Folio persistence, new permissions, migrations, notification scheduler, duplicate planner/assessment engines, production publication. No UI filler text beyond real state/action/consent indicators.

## Next after required gates
Phase 04: qualify exact-head Node/Astro/TypeScript/Vitest and full Chromium/Firefox/WebKit with owner-accurate device tests; reconcile historical Home-default tests by using explicit native Workspace route for layout-only scenarios, while retaining their original assertions, consent and required behavior. Then extend actual Today navigation only where original source evidence proves missing actions.
