# THIEPN Hub H11 — Authorized Cross-App Continuation

This feature batch is stacked on H10 draft PR #143 at exact commit `70e3e96658c458488dbb6a68d3baaa83fb896aa5`, itself stacked on H9 PR #142.

## Implemented

- New **Continue from your apps** desk in the Hub Home workspace, the existing `/home/connections/` owner connection center and the original `/home/` Account/reading dialog. Compact placement responds to phone and tablet width.
- Source checkboxes for Notes, Library and TMS60; hiding a source discards its visible metadata immediately. There is no duplicated progress or selection database. A manual refresh button delegates to the **existing enabled, visible owner refresh controls**, not to invented endpoints, OAuth grants or hidden reads.
- Existing native owner scripts (`portal-notes`, `portal-tms60`, `portal-library`) publish only their already-validated private `ProviderEnvelope` metadata after owner permission checks, request-lifecycle checks and response validation. A lightweight in-memory notification subscriber renders up to six approved items per source (two in compact mode), with source coverage and checked/source timestamps.
- **Notes**: approved synced note titles and update timestamps; because the owner lacks a verified resource-specific deep link, an item opens Notes itself, explicitly labelled *Open app* rather than pretending to resume the exact note.
- **Library**: actual EPUB/PDF reading metadata and observed current progress in this browser, only when the existing device consent and `/home/` reading-pilot conditions allow it. Exact resume goes through the existing `libraryContinueUrl(item)` owner-approved route and retains edition/release identity.
- **TMS60**: approved translation-scoped references/dimension and, where the existing summary allows, due review counts. Exact resource actions reuse the already implemented TMS60 `#hub=` route.
- **StudyOS**: visible unsupported integration status. The existing StudyOS owner has no verified cross-app Hub metadata grant/transport or production app URL in its reviewed documentation; H11 does not guess a private API, hostname or course progress.
- Explicit ready/empty/loading/unconnected/offline/stale/error/unsupported/revoked state vocabulary. Failure never implies an empty account.
- Owner data expires when the original envelope expires (at most five minutes), disappears on identity change, pagehide, BFCache restore, hidden tab, privacy mask or per-owner invalidation, and is never persisted in Hub IndexedDB, localStorage, sessionStorage, backups, remote telemetry, URLs or public HTML. Subscription is a same-tab view notification, not new auth.
- No changes to the owner permission/grant protocol, app data stores, resource indexes, academic mastery, calendar authority or search/capture writers. Existing provider flags remain unchanged and default-disabled where not activated.

## Where real data can appear

| Area | Notes | Library | TMS60 | StudyOS |
|---|---|---|---|---|
| `/` Home | owner handoff/status | owner handoff/status | owner handoff/status | unsupported |
| `/home/connections/` | real title metadata when owner feature flag + Account consent + existing Notes return flow allow | Library reading handoff, no direct bridge on this route | real references when owner feature flag + approved translation grant allow | unsupported |
| `/home/` Account/reading dialog | owner handoff | genuine device reading metadata after explicitly joining the enabled pilot and granting Library sharing | owner handoff | unsupported |

These labels must not be interpreted as proof of feature flags or live credentials being configured in production. Existing owner scripts are activated only behind their original flags. No account sign-in alone conveys a private read permission.

## Implementation files

- `src/lib/workspace/owner-continuation.ts` — bounded RAM-only delivery of existing validated envelopes.
- `src/scripts/workspace-continuation.ts` — source selection, metadata presentation, native resource links, freshness and privacy clear lifecycle.
- `src/components/workspace/ContinuationDesk.astro` — original owner-aware continuation UI.
- `src/styles/continuation.css` — accessible responsive layout.
- `src/scripts/portal-notes.ts`, `src/scripts/portal-tms60.ts`, `src/scripts/portal-library.ts` — notify the deck only after existing authenticated/consented owner reads and on invalidation.
- `src/components/workspace/WorkspaceShell.astro`, `src/pages/home/connections/index.astro` — mount in previously authorized routes.
- `src/scripts/workspace-home.ts`, `src/lib/workspace/home-view.ts` — replace misleading handoff-only language and avoid duplicate large launch grids.

## Known limits

- The home page **does not fetch private data automatically**. Cross-route private snapshots are intentionally not transferred from `/home/connections/` into `/`, even if the same account is signed in. Connection and read must be performed in the existing native owner flow on the same page.
- Library's owner bridge stays inside its pinned `/home/` reading host and preserves the join and consent gate; it is not silently rehosted at the root or on the Connections route.
- Notes does not currently provide an approved per-note deep link. StudyOS is not yet a Hub metadata provider.
- No new library/account connection, live permission check, backend API, OAuth scopes, private grants, new sync, shared resource index or data migration was introduced.
- `ProviderEnvelope` freshness is rechecked in the view. The native owner readers are still the actual permission authorities. The UI notification and selection controls are **not** an authorization mechanism.
- **NOT RUN:** no tests, typecheck, build, CI, browser qualification, audit, merges, deployment, credentials or production interaction, per the H11 instruction. The implementation is committed source, not verified live functionality.

## Subsequent work (H12)

Simplify local capture, task capture and scheduling without introducing new app-owned notes/tasks. Add explicit routing choices and safe draft handoffs into owner apps, better task recurrence/reminders within their native capabilities, original author/write authority, mobile keyboard workflow and offline recovery; avoid automatic academic writes, unsanctioned owner mutations and duplicated persistence. Preserve H9/H10/H11 branches and privacy/permission boundaries.
