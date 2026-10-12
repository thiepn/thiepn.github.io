# THIEPN HUB — approved adaptive workspace build plan

Status: **ready for implementation**. Design approved by the user on 12 October 2026. This document is the governing build plan; earlier design documents are supporting context. No UI implementation or deployment is claimed by this status.

Repository: `thiepn/thiepn.github.io`. Main rechecked at `29537702c4e3698cb780bcc3c479e385d29bd3c8`. The local `/workspace/thiepn-hub` directory is a selected source snapshot, not a runnable full checkout. The build must begin by obtaining the complete repository and recording its current baseline.

[Approved combined desktop design](/workspace/generated_images/exec-f04f05ea-98b6-4d46-b973-53baa11a040b.png). The image depicts layout editing and example data. Use its shell, spacing, typography and hierarchy as the target; implement consistent real state rather than copying illustrative names, timestamps or progress values.

## 1. Product decisions — settled

1. Home is a customizable daily workspace, not an app catalogue.
2. Left navigation expands to about 224px or collapses to a 64px rail. Remember the user's preference.
3. The right planner stays visible on wide desktop: date/calendar, tasks and agenda. It is independent of central layout editing and workspace selection.
4. The middle is a real widget grid: add, move, resize, configure, change view and remove widgets.
5. The three earlier concepts become presets of this same engine. Theme and density remain independent from layout.
6. Multiple named workspaces share underlying tasks, notes, events and trackers. Layouts hold references, not duplicate records.
7. Preserve the Apps catalogue and its current behavior. Keep `/` as the catalogue and `/apps/` as its existing alias for this release. The new workspace lives at `/home/`.
8. The first release works locally without login. Show truthful local-save state. Connected app projections and cloud sync are later releases.
9. Keep Astro, TypeScript and progressive enhancement. No React/framework rewrite or canvas editor is required.
10. Building the approved design can start without another visual-selection step. Further design work is implementation refinement of this target.

## 2. First-release scope

**Ship:** adaptive shell; functional layout editor; shortcuts; real local tasks/events; quick notes/capture; manual count/duration/checklist trackers and history; recent local activity; light/dark/system theme; compact/comfortable density; three presets; named workspaces; versioned persistence; migration; export/import and recovery; keyboard/touch operation; useful mobile views.

**Follow-up releases:** verified Library/Notes resume resources, connected calendar/task sources, owner-scoped layout sync, recurring-event rules, cross-app writes with receipts, intelligent shortcut suggestions, optional focus timer and additional widgets. These features do not block the local workspace release.

The right planner and customizable layout are first-release foundations. Do not ship a fixed dashboard and leave customization as future work.

## 3. Existing source integration

| Current file/surface | Build treatment |
| --- | --- |
| `src/pages/home/index.astro` | Replace fixed Home composition with the new shell and workspace renderer. Preserve route and local/private separation. |
| `src/pages/index.astro`, `HubCatalogue.astro`, `hub-catalogue.ts` | Preserve current catalogue/search/filter/open behavior. Do not redesign these as part of Home. |
| `src/pages/apps/index.astro` | Currently redirects to `/`; preserve that behavior and make the Apps navigation destination resolve correctly. |
| `src/lib/hub.ts` / `getHubProjects()` | Reuse the registry as the source for available apps, slugs, labels, icons and launch URLs. |
| `src/scripts/portal-home.ts` | Replace Home initialization with the new controller. It currently harvests app data from catalogue DOM and assumes specific fixed panels/dialogs. Removing the catalogue requires replacing those assumptions explicitly. |
| `src/lib/hub-preferences.ts` | Preserve existing pins, density, validation and limits during migration. Keep the original source until migration is verified. |
| `src/lib/home-view.ts` | Reuse `homeDay()` timezone/date behavior and migrate relevant preferences. Existing module toggles are not grid positions. |
| `src/lib/hub-auth.ts`, `portal-auth.ts` | Reuse validated identity and account-scoping behavior. Preserve guest/account isolation, checking/unavailable handling and privacy hiding. Do not enable gated auth/provider features. |
| `src/layouts/BaseLayout.astro` | Add a workspace mode that retains shared metadata/theme/skip-link behavior while suppressing legacy header/footer/navigation and duplicate catalogue-search mounting on workspace routes. Other surfaces keep their current behavior. |
| Prism branches | Review only the needed layout/document/migration/durability slices against current main. Extract compatible pieces; do not merge a whole historical stack. |

Current route checks found no existing Tasks/Calendar/Trackers pages that would conflict with the routes below. Recheck if main changes before implementation.

Proposed new structure:

```text
src/components/workspace/
  WorkspaceShell.astro       Left navigation, header and persistent planner slots
  WorkspaceGrid.astro        Default accessible server-rendered widget order
  Planner.astro              Shared selected-day calendar, tasks and agenda
  LayoutEditor.astro         Editing toolbar and widget picker/configuration dialogs
  widgets/                  Shortcut, capture, tracker and activity surfaces
src/lib/workspace/
  types.ts                  Persisted contracts and command types
  registry.ts               Widget specifications and validation
  layout.ts                 Pure collision, resize and responsive projection logic
  presets.ts                Three preset definitions using the same schema
  store.ts                  IndexedDB transactions and scoped repositories
  commands.ts               Shared task/event/capture/tracker commands
  migrations.ts             Legacy conversion and versioned upgrades
  export.ts                 Export/import validation, preview and recovery
  selectors.ts              Derived counts, periods, agenda and history
src/scripts/workspace-home.ts
src/styles/workspace.css
src/pages/home/{tasks,calendar,trackers,settings}/index.astro
tests/unit/workspace-*.test.ts
tests/studio/workspace-*.spec.ts
```

The registry supplies app data directly to the renderer/controller through safely serialized data. It must not depend on hidden catalogue markup. No separate duplicate app catalogue or identity controller should be introduced.

## 4. Shell, routes and responsive contract

Navigation: Home `/home/`; Apps `/`; Tasks `/home/tasks/`; Calendar `/home/calendar/`; Trackers `/home/trackers/`; Settings `/home/settings/`. Preserve `/home/auth/callback/`, existing `/search/` and old deep links. Authentication return-path rules remain unchanged in the local release; expanding them is a separate reviewed change.

The right planner appears throughout the new workspace surfaces at wide desktop widths, including full task/calendar views, using the same underlying store. It does not modify the existing catalogue shell. Global search lives in the workspace header and avoids mounting the old catalogue overlay a second time.

| Width/space | Behavior |
| --- | --- |
| 1440px+ | Expanded or collapsed left navigation, fluid 12-column center, 320px right planner. |
| 1280–1439px | Same three regions; planner can narrow to 304px. Preserve readable minimum widget widths. |
| 1024–1279px | Left rail defaults collapsed. Keep planner visible when the center has at least 520px; otherwise use the dedicated planner view. Honor saved navigation preference when space returns. |
| 768–1023px | Compact navigation; center reflows to 1–2 columns; planner available through Tasks/Calendar destinations. |
| Under 768px | Single-column widget order, compact app shortcuts, bottom navigation and full Tasks/Calendar screens. |

Responsive decisions use actual available center width after sidebars and zoom, not just viewport labels. Focus/tab order follows stable visual reading order. Reflow must never overwrite saved desktop placement. Sidebars and workspace content use explicit scroll regions without trapping scroll or focus.

Visual tokens: 4px base spacing with 8/12/16/20/24/32px steps; 14–16px body; 12–13px secondary labels; 20–28px headings; 8px controls and 8–12px surfaces; one icon family; blue accent as the default approved visual. Use semantic theme tokens and reuse the existing `thiepn:index-theme` preference where compatible. New CSS is scoped to the workspace and must not restyle the existing Apps catalogue through global selectors.

## 5. Layout contract and editor

Use CSS Grid for rendering and a Hub-owned, pure TypeScript layout engine for placement. Start with pointer-event drag handles plus accessible move/resize controls; no editor-library dependency is required for the initial supported widget count. Keep the editor adapter separate so a library can replace it later without changing saved data.

Logical desktop grid: 12 columns; 16px gutters; vertical positions/heights snapped to 8px units. Widget registry defines min/default/max sizes. Keep logical placement independent of viewport pixels. Cap the initial editor at 32 widgets per workspace and 10 workspaces; communicate limits before an operation rather than truncating saved data.

```ts
type GridRect = { x: number; y: number; w: number; h: number };
type WidgetInstance = {
  id: string;
  type: string;
  typeVersion: number;
  config: Record<string, unknown>; // validated by registered type
  view: string;                   // allowed view variant for that type
  desktop: GridRect;
  order: number;                  // semantic/mobile reading order
};
type WorkspaceDocument = {
  schemaVersion: 1;
  id: string;
  title: string;
  revision: number;
  widgets: WidgetInstance[];
  updatedAt: string;
};
```

This is a proposed new contract, not a claim about the current Prism format. Reconcile it with existing formats before implementing a migration. Store preferences separately: active workspace, theme, density, preferred rail state and planner timezone/date behavior.

Collision behavior: move the selected widget to its snapped valid rectangle, push overlapping widgets downward in stable `(y, x, id)` order, retain unaffected positions, and commit the whole edit as one command. Resizing follows the same collision rule and respects registry minimums. Reject impossible imported coordinates. Narrow layouts are deterministic projections derived from saved placement and semantic order; they are not new writes.

Normal mode shows content and a quiet Customize action. Edit mode shows handles/resize controls, Add widget, Undo/Redo, Cancel and Done. Whole-widget geometry is editable; calendar/task records are not dragged into the grid. Double-clicking a header is not required for any action.

- Adding a widget chooses type, useful size/view and validated content settings.
- Widget overflow menu provides Configure, Change view, Move, Resize and Remove.
- Keyboard controls allow movement/resizing with live announcements and preserve focus on the selected widget.
- Done validates and transactionally commits the draft against its base revision.
- Cancel restores committed layout. Persist interrupted edit drafts separately and offer Resume/Discard on return.
- Removing a widget removes only its instance; source records remain available.
- Preset replacement preserves a recoverable prior layout; Create new workspace is the safe default when applying another preset to a customized workspace.

## 6. Initial widget contracts

| Type | Source/configuration | Views and minimum useful width |
| --- | --- | --- |
| `app-shortcuts` | Valid registry app IDs and supported direct actions; reuse existing pins during migration | Icon strip, labelled tiles, grouped list; 260px minimum, defaults wide. |
| `continue` | Real local drafts and supported resume references | Compact/detailed list; 260px. Hide unsupported sources; an app launch alone is not a resumable resource. |
| `capture` | Local task/note default; current draft | Compact input, editor; 280px. No provider save implied. |
| `tracker-summary` | Selected tracker IDs and period | Table, compact summary, progress rows; 260px. |
| `tracker-history` | Selected tracker/logs and period | Single-unit chart, weekly matrix; 320px for chart, otherwise compact summary. |
| `recent-activity` | Bounded local action history and limit | Compact/detailed feed; 260px. |

Registry specifications define title/icon, type version, default configuration, validators, allowed views, size constraints, renderer, migrations and empty/error/loading states. Unknown types preserve configuration/placement and display an unavailable placeholder until supported. A newer document version must not be rewritten by an older client.

Presets: daily summary with shortcuts, Continue/capture and trackers; dense console using list/table variants; grouped workbench using configured tracker/capture/resume widgets. All keep the same planner and data. Labels may use friendly preset names; theme is not encoded into the preset. A blank workspace is also allowed.

## 7. Local content and planner contracts

All records have stable IDs, namespace, revision and timestamps. Use one command/store layer for full-page views, widgets and the right planner.

- **Task:** title (1–240 chars), optional notes, priority, due date, optional local time/timezone, completion timestamp, optional tags. V1 supports add/edit/complete/reopen/delete with Undo; recurrence follows later.
- **Event:** title, either all-day date range or timed UTC start/end plus IANA timezone; optional notes. End must follow start. Support add/edit/delete with Undo. Calendar distinguishes actual events from task due dates.
- **Quick note:** title/body, autosaved draft and last-saved state. Content is text, not executable markup. Capture remains local until a later explicit owner-authorized export/send operation exists.
- **Tracker:** title, `count | duration | checklist`, unit, daily/weekly goal and optional color/icon. **Log:** tracker ID, local-date key, recorded value or checklist item state, time and optional note. Manual logging is enough for the first release.
- **Activity:** bounded local action records used by Recent activity; retain the most recent 500. Do not imply app-wide telemetry or automatically observe private resource activity.

Date-only due dates remain date strings, not midnight UTC timestamps. Use the selected planner timezone, initially existing preference or device default. DST-invalid time entry needs explicit correction; do not silently shift it. Period selectors use the same timezone across tasks, agenda and tracker totals. Future days remain empty; comparisons identify their period and units clearly.

The right planner defaults to Today; selecting a date changes tasks and agenda together. Task completion updates every relevant selector with one command, and Undo restores it. App launch records can support Recent launches but cannot invent reading progress. Fresh installations use real empty states and setup actions; mock screenshot data is restricted to fixtures/explicit demos.

## 8. Persistence, migration and recovery

IndexedDB stores workspace documents, edit drafts, tasks, events, quick notes, trackers, logs and activity. Small theme/rail preferences may use existing localStorage keys. Document/content changes require a transaction and revision comparison; update the visible saved state only after commit succeeds.

Namespace local data by guest or validated account identity. Reuse existing account-boundary logic. While identity is checking/unavailable, do not expose another account's records. A guest workspace is not silently copied into a signed-in account. Switching identity immediately clears private projections and scopes the new store; user content remains in its proper namespace.

BroadcastChannel announces scoped revision changes; other tabs reread the store. A stale editing revision fails commit and preserves the draft. Offer reload/compare or Save as new workspace for layout conflicts rather than last-write-wins data loss. Do not silently merge incompatible whole-layout changes.

Migration reads existing `preferenceKey()` records, validates through the current parser, backs up the original, and imports pins/density/timezone/privacy once. Preserve hidden Home behavior. Relevant module choices can inform starter widgets; unsupported choices remain in the backup. Never delete old preferences at the first successful render. Do not reset account-scoped preferences into the guest namespace.

Storage denied/quota/full: retain the active in-memory content/draft, label Unsaved, offer retry/export, and never claim Saved. Unsupported future-schema records stay untouched. Export is user-initiated JSON with schema/version and selected local content; import validates size, records, duplicate IDs, widget constraints and namespace, previews merge/new-workspace/replace choices, and takes a backup before replacement. Authentication material and provider snapshots are excluded.

## 9. Search and progressive enhancement

One command surface searches public apps, local tasks/notes and configured shortcuts. Separate result types; support keyboard selection and Open/Edit actions. Private text stays out of query URLs/analytics. The existing `/search/` remains compatible. Scope Ctrl/Cmd+K so it does not override a focused text editor unexpectedly.

Server-render app links and a readable default shell. Without JavaScript, app links still work and local-data/editor regions clearly state that their interactive features require JavaScript. With JavaScript, hydrate local stores before showing personal data or saved indicators. Existing privacy masking remains available in workspace settings/header.

## 10. Ordered implementation backlog

| ID / PR | Deliverables | Depends on | Exit evidence |
| --- | --- | --- | --- |
| B0: runnable baseline | Full checkout; current-main/PR state; supported dev/build commands; source screenshot; inspect selected Prism modules; record migrations. | None | Runnable baseline and documented source SHA. No whole-stack merge. |
| B1: visible shell and renderer | Workspace mode in BaseLayout; new Home, expandable rail, fixed planner region, tokens, app registry adapter, grid/schema, shortcuts. | B0 | Desktop and mobile screenshots; existing Apps routes unchanged; new Home never mounts the full catalogue just to obtain pins. Preview is explicitly incomplete until local features arrive. |
| B2: layout editor and storage | Registry, deterministic geometry, drag/resize and keyboard equivalents, widget picker/configuration, draft commit/Cancel/Undo, IndexedDB namespace/revisions, legacy preferences migration. | B1 | Reorder/resize/add/remove survive refresh; Cancel and Undo restore correct state; saved desktop placement survives narrow-window reflow. |
| B3: tasks, calendar and capture | Shared commands/selectors and local stores; functioning right planner; full task/calendar views; quick notes/tasks; date and timezone validation. | B2 | Add/edit/complete/Undo persists and updates every view; valid agenda dates; no duplicate records when switching workspace. |
| B4: trackers and real activity | Tracker definitions/logs; goals, table/chart/matrix variants; real local Continue/capture/activity. | B3 | Log/edit/Undo updates summaries/history; no fabricated progress; units/periods agree. |
| B5: presets and personalisation | Three presets, blank layout, named workspace duplicate/rename/switch/delete, theme/density, command search, local Settings. | B2–B4 | All three compositions use one renderer and shared data; no content loss on preset/workspace changes; complete light/dark screenshots. |
| B6: recovery and qualification | Import/export, future-schema handling, storage failure, multi-tab conflicts, accessible focus/touch/zoom/reflow, CSS/performance review. | B5 | Meaningful scenario checks pass and failures expose recoverable states. |
| B7: release | Integrated candidate checks, screenshots, supported deployment and served-source verification; update docs and mark superseded UI branches. | B6 | Actual deployed UI matches candidate and primary workflows work in production. |

B1 should be the next visible implementation PR. Layout/persistence work is built before creating several rigid dashboards. Keep PRs small enough to review, but qualify the combined candidate before release. A reasonable planning range is 15–22 developer days for B0–B7, subject to runnable preview access and existing migration complexity; this is not a promised schedule.

## 11. Verification and release conditions

Required unit/contract scenarios: deterministic collision/resize; invalid configuration/import; migration idempotence; account isolation; optimistic revision conflicts; removing a widget does not delete content; date/period/DST rules; tracker selectors; Undo inverses. Avoid tests that merely repeat markup.

Required browser scenarios: app launch; left-sidebar preference; edit/create/resize/remove widgets with pointer and keyboard; Done/Cancel/Undo; refresh persistence; workspace/preset switching; task/calendar/capture/log workflow; storage-denied recovery; two tabs editing concurrently; private-state clearing when applicable. Use existing project Playwright/Vitest setup.

Visual acceptance: approved composition at 1440 × 1024, expanded/collapsed rail, normal/edit modes; three presets; light/dark; widths 390/768/1024/1280/1440/1920; 200% zoom; keyboard-only and reduced motion. Confirm readable contrast, named controls/landmarks, focus return, dialog trapping and chart summaries. Current screenshot infrastructure cannot be assumed working: obtain a real local preview/browser and capture it during B0/B1.

Check the existing relevant validate/typecheck/unit/build/browser/performance gates on each candidate. Do not represent public-contract success as private paired integration acceptance. Source CI PR #132 is still open as checked today; #133/#134 depend on it. If #132 remains unmerged, stack the UI branch on its reviewed head and identify the dependency explicitly; otherwise start from newly fetched main. Neither media-generator PR #133 nor Orrery PR #134 is a prerequisite for rendering this workspace.

Deployment remains a separate concrete release action through the repository's supported process. Record source SHA, build configuration/artifact, deployed result and capability profile. Smoke the served Home, Apps routes, local persistence, task/calendar/capture and layout editing. Do not label completion based only on a PR or local screenshot.

## 12. First build handoff

The builder starts at B0, then creates B1 without reopening the selected visual direction. Read this plan, the approved image and existing auth/preference modules. Obtain a complete current checkout, inspect applicable repository instructions, preserve catalogue and account boundaries, and build an accessible shell plus registry-backed shortcuts. Produce an actual preview screenshot and a focused PR. Continue through B2–B7 with these acceptance criteria.

Completion of this planning task means the approved visual, decisions, source integration map, storage/layout contracts, backlog and release criteria are all present. Completion of the product means the user can customize and use the real deployed workspace.
