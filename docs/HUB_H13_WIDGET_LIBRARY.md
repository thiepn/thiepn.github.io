# THIEPN Hub H13 — Expanded Widget Library

**Stacked parent:** H12 draft PR #145, `feat/hub-h12-capture-task-scheduling` at verified exact commit `fd41d7ef173e3cab2bccaa589fcdd0354ca0eaf5`, stacked on H11 PR #144, H10 PR #143 and H9 PR #142.

## Source implementation

H13 adds **six working source-backed widgets** to the original registry, renderer, presets, saved layout editor, and existing task/note/event ownership. No new record store or writer exists.

| Widget | Real data, actions and limits |
| --- | --- |
| **Task Inbox** | Unscheduled, incomplete local Hub tasks from `WorkspaceState.tasks`, with one-tap Today/Tomorrow/7-day planning and the genuine task edit/completion controls. Count and link to the native Inbox filter; no external inbox access. |
| **Next Priorities** | Local tasks due/overdue or coming in 14 days, optional high-priority ordering, completion, task edits and true due labels; priority is user-set, not AI-ranked. |
| **Upcoming Commitments** | Merge only Hub's existing local `events` and scheduled `tasks` into one 3/7/14-day agenda, respecting the current planner timezone, all-day events, native event/task editing, and strict source labels. Read-only imported H10 snapshots/Google Calendar are deliberately not misrepresented as synced Hub records. |
| **Recent Captures** | True Hub local notes plus capture-history records from the existing `activity` array. Past captured-task activity is explicitly historical (no fabricated task ID or task resume). Capture-draft continuation launches the original writer. Filters: both, notes, task capture history. |
| **Quick Planning** | Pending unscheduled Hub task queue, quick actions using H12's original `applyTaskPlan` through `mutate()`, plus native capture/edit actions. Moves never add events or StudyOS work. |
| **Connected App Handoffs** | Choose Notes/Library/TMS60 app launch links, owner connection destinations and permission explanations. Additionally, reuse the H11 Continue desk's **same already validated RAM-only owner envelopes** when consented reads are available in this tab. Actual approved resource titles/progress/last-checked and native resume actions appear without a second reader, grant, cache or source writer. Disconnected, empty, loading, offline, expired and errors follow the original H11 owner state; private metadata is cleared on owner/session expiry, account changes, tab hiding and privacy masking. StudyOS remains unsupported without an explicit Hub read contract. |

### Original widget controls and personalization

- Registry entries have existing `typeVersion:1` and normal min/max column sizing, reorder, keyboard/pointer move, remove and layout-draft recovery. All records survive widget removal; none of the six are mandatory or auto-added to saved layouts.
- New bounded widget settings: **2/3/4/6/8/12 items**, **3/7/14 days**, capture source scope (notes/task-history/both), and per-owner link selection (Notes/Library/TMS60). Settings reside in existing `widget.config` within original `WorkspaceStore` schemaVersion 1. The registry validates these fields.
- Grouped widget picker: Plan & do / Open & continue / Track & reflect, with a direct **+ Widget** control on Home. Changes use the existing edit → Done layout flow; no independent widget registry or configuration writer.
- Optional fifth preset **Action dashboard** arranges all six new widgets with compatible widths and heights. Crucially, the first four original presets still instantiate **their original six widget types and positions**, even though the registry now contains twelve types. Existing saved workspaces are not migrated.
- Responsive layout: compact/expanded widget views, keyboard-focusable native actions, touch-sized planning and owner links, clear source labels and actionable empty states. Original root loading/privacy masking and H11 stale/offline metadata handling are reused.
- Native Hub task checkbox/change, task-date planning, edit task/event/note, and capture actions are delegated to existing `workspace-home` handlers. No duplication of task, calendar, note or progress stores.

## Files

- `src/lib/workspace/registry.ts` — six widget types, supported icon names, bounded config validation.
- `src/lib/workspace/widget-views.ts` — six pure views derived from existing records and reviewed app launch URLs.
- `src/lib/workspace/presets.ts` — compatible first four presets and optional fifth Action dashboard.
- `src/scripts/workspace-home.ts` — original renderer/registry integration, grouped picker and new item/date/source controls.
- `src/scripts/workspace-continuation.ts` — reuse existing H11 owner results for the owner widget, including revocation/expiry states; no new provider requests.
- `src/styles/workspace-widgets-h13.css` — keyboard/mobile layout and data-source presentation.
- `src/components/workspace/WorkspaceShell.astro` — original shell stylesheet import.
- `docs/HUB_H13_WIDGET_LIBRARY.md` — this document.

## Important scope and limitations

- New records are **not** made by widget rendering or preset selection. Existing tasks, notes, events and source-authorized readers are the only authorities.
- Owner-app metadata appears only if the **original H11 owner connection** on the same tab/route has genuinely produced a valid envelope, with its actual read scope. Opening Hub, signing in, or showing an app launch link does not itself grant access.
- Library's reading bridge remains gated to its original `/home/` path and explicit sharing consent; Notes and TMS60 require their original enabled provider flags and consent flows. A current owner session does not imply a verified per-note Notes deep link or a StudyOS transport.
- Widgets are local UI and may not reflect pending unsaved IndexedDB writes across tabs. Existing revision conflict/recovery logic is unchanged.
- Upcoming commitments includes local Hub events and task due dates only. A task due date is not a scheduled timed event. Recurrences, Google Calendar live sync, academic writes, owner resource modifications and reminders are outside H13.
- This is **source-only implementation**, not a tested or deployed release: user requested **no tests, typecheck, builds, CI, audits, browser/device acceptance, migrations, merges, deployments, credentials or paid services**. None were performed. Runtime correctness is not claimed.

## Next H14 — Unified Search & Action Palette

Extend the original Ctrl/Cmd+K command palette to safely query existing local tasks/notes/apps, add source-aware navigation and shortcuts into native task planning, capture and owner-app continuation. Preserve authorization fences, privacy masking, keyboard selection, mobile trigger and no unapproved private provider searches or parallel search indexes. Add explicit disconnected/no-result/error states instead of fabricated cross-app results.
