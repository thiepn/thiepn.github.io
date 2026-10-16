# Hub Integration I1 — Native Daily Board and Core Language Summaries

Branch: feature/hub-integrated-daily-language-readmodels
Original main: e0f64a41b519710136477511144de44f0fcfe3c4

## Implemented

- Home displays today's Hub-local due/overdue tasks, calendar agenda and newest local note titles immediately. Original task completion, edit and note handlers remain authoritative. The panel does not create a second store.
- A verified first-party Hub Account session can read the existing THIEPN Core P9 Languages dashboard. Core derives the account server-side and returns only publisher-authorized P8 models with visible enrollments. Japanese and French have source-owned publication capabilities; Chinese is not presumed to have a Core publisher. Each card shows the original due count, activity, streak, progress metrics, producer update time and a guarded native app link. Missing snapshots never mean zero due.
- A bounded, no-store GET to the Core Gateway uses the existing Hub first-party Account token. The Core Gateway has a documented thiepn.dev production CORS allowlist entry. This is not an H20 managed Notes/TMS60 grant and does not activate any blocked purpose-scoped OAuth client.
- Language summaries refresh on first signed-in Home load, explicit refresh, return/online, and at a bounded interval while the Hub is visible. A transient failure can retain only this tab's memory snapshot with an explicit unavailable/stale label. Backgrounding, pagehide, switching account and hiding content clear that memory. No Core snapshots, account tokens, private note bodies or raw StudyEvents are persisted by this integration.
- Native continuation uses independently reviewed owner routes, with an exact origin and app-path guard. Each source continues to own grades, review scheduling, completion, and progress.

## Provenance and outstanding permissions

| Surface | Real authority | Current I1 status |
|---|---|---|
| Hub tasks, local agenda and local notes | THIEPN Hub WorkspaceStore | Live projection of device-local canonical records |
| Folio planner, notes and habits | Folio IndexedDB plus its own optional cloud sync | Not accessible through a qualified Hub summary scope or unified identity; not claimed as connected |
| Google/University calendar | Calendar provider | No approved Hub OAuth/ICS read provider; not claimed as connected |
| Notes cloud titles | Notes managed metadata projection | H20 managed authentication and owner RLS/isolation gate still blocks activation |
| Japanese and French | Native P8 read-model publishers into Core P9 | Display when an actual producer snapshot is available and its enrollment is visible |
| Chinese | Native Chinese learner and review state | No verified Core P8 publisher; not counted as zero |
| TMS60 | Translation-dependent native review scheduler | H20 managed grants not activated |
| Library | Separate H23/H24 device reading consent bridge | Stays in its existing explicitly consented dialog |

## Qualification and operating boundaries

Vitest source tests cover local dates and source filtering, authentic Japanese metrics, enrollment hiding, invalid producer contracts, route containment and GET request settings. Repository build, browser/mobile workflows, hosted Account bearer availability, Core endpoint behavior and current producer publication require exact-branch executable acceptance before merge; static source review is not live production proof.

No migration, existing app mutation, deployment, merge, OAuth client enablement, private Notes activation or paid service is included.

## I2 native continuity and browser repair

The integrated board now also renders the actual next-seven-day local agenda and current daily/weekly Hub tracker totals through the existing canonical tracker logs. It offers original tracker-log and task-completion handlers, not parallel writes. The summary's Add task/event/capture actions use unique controls to avoid hijacking planner focus, and the optional integrated dashboard is omitted while editing the draggable widget layout. An exact-head Playwright run exposed duplicate task selectors, incorrect dialog focus return and drag interference; these are concrete fixes in this batch. Folio's independent D18 Supabase email/password session and local IndexedDB data are explicitly outside Hub authorization, and are not silently queried. New unit coverage includes the date-shifted upcoming list and tracker totals.
