# THIEPN Hub H20 — Unified Weekly Planning Experience & Native Workflow Refinement

**Verified original parent:** H19 draft PR #152, branch `feat/hub-h19-weekly-followthrough`, exact commit `41916dfbc8086a78287afffed0486caed37c791e`. H18 #151, H17 #150, H16 #149, H15 #148, H14 #147, H13 #146, H12 #145, H11 #144, H10 #143 and H9 #142 remain separate stacked drafts. No merge to `main`, production or any earlier development branch.

## Actual source functionality

H20 unifies the experience of the original H15–H19 implementations without a new workspace, database, task writer, scheduler, task/event association, private provider API, progress store or source migration. The original Hub Account/Core identity fence, `WorkspaceStore` CAS and original task/note/calendar/edit/capture mechanisms remain authoritative.

### One default Today work surface with intentional alternate modes

- Original Home now defaults to **Today**, a task-first single page derived from the existing `WorkspaceState.tasks`, `notes`, `captureDraft` and H18 `reviewDay` native local events. It shows the real **due + overdue** task queue (at most five displayed), **unscheduled Inbox decisions** (up to four), genuine local timed/all-day events (up to four), actual source counts, existing capture draft, possible interrupted layout draft, potential local timed overlaps and the original most-recently-edited Hub note.
- Every displayed item identifies its native Hub source: task **deadline**, Inbox entry, actual calendar **time block**, or local note. A task due date is never represented as a calendar reservation. More records than visible are counted and linked to the original Tasks/Calendar pages. No Google/StudyOS/ILIAS/Notes cross-app progress, calendar events or reminders are inferred.
- One Home mode selection now offers **Today / Focus / Workspace** with a canonical **Week plan** link. **Focus** is the original H15 learner-controlled timer/queue and quiet mode. **Workspace** is the original H16 returning-user card, H13 widgets, H11 consent-controlled Continue desk, H10 export-based read-only calendar and saved layout customization. Switching views changes **presentation only** and never duplicates progress records. The original full workspace components are preserved rather than deleted.
- On Today or Focus, redundant old mobile Today, right-side planner, owner Continue desk and external calendar import surface are visually hidden; they're restored in Workspace mode. This avoids showing three calendars and multiple task queues simultaneously. No owner grant/state is changed by hiding an unused panel.
- The Today view exposes direct **Capture**, **Inbox task**, **Plan**, **Focus**, **Next actions**, **Open local note**, and canonical task/calendar/weekly-review navigation. The original native editors and H17 contextual record handoffs are used; no new owner Notes writer or fabricated durable task↔note association.
- Any Home layout customization continues to show the full Workspace automatically while editing, then returns to the chosen ordinary view after editing completes. This preserves original widgets, account boundaries and H16 draft recovery.

### Explicit task triage rather than duplicated one-tap controls

- New **Review due date & priority** dialog for an actual unfinished Hub task, reachable on Today and from the original Tasks list. It displays the original title, saved due date or Inbox status, clock, priority and an editable proposed due date/Inbox choice and priority.
- Requires a separate confirmation checkbox and validates the source's frozen **original `taskSnapshot`** before mutation and again inside the queued native writer. The proposed due date must be today or later (unless the task stays in Inbox), and the existing H12 `applyTaskPlan()` updates due/clock only when the date changes; priority changes use the same original task object and original writer. No calendar event, completion, academic assignment, or external app record is created.
- If original storage is unavailable, content is masked, an unresolved CAS conflict exists or local writes are dirty, the dialog refuses to start or submit. Following mutation, the task's real current values and dirty/conflict state are checked; unconfirmed writes are not reported as durably saved. Users retain original H16 Export/Retry/Reload recovery actions.
- The original Tasks page now emphasizes **one reviewable Plan** action, **Next actions** through H17 and a separately reviewed **calendar block**, replacing the crowded set of visible one-tap due-date/priority controls. Earlier task commands and H12 native `applyTaskPlan` implementations remain available for prior widgets/routes and are not duplicated.

### Coherent Today, Week, Focus and return navigation

- Home retains only a safe public `?mode=focus` or `?mode=workspace` navigation choice, defaulting to clean Home for Today. No selected task ID, note title, private search term, timer progress or owner provider data enters the URL. The initial mode can be reopened after navigation/reload, while transient Focus task selection and timer remain in the original H15 in-memory state and reset when identity changes.
- The Tasks page includes direct **Today / Focus / Week plan** navigation using canonical existing routes. The original H18 Day/Week calendar, H19 explicitly confirmed weekly carryover and H16 recovery date-return flow are reused unchanged. No H19 carryover batches are silently applied.
- On mobile, Home avoids redundant action grids when Today or Focus is active, and the top-level three-mode switch remains touch-friendly with keyboard focus and `aria-pressed` state.
- The unified status row distinguishes **offline**, **unavailable local storage**, **dirty edits**, **CAS conflicts**, and genuine **account-scoped browser storage**, with existing Export/Retry actions where appropriate. Privacy masking continues to suppress private Home content and prevents triage writes; original H16 recovery strip is not removed.

## Exact changed files

1. `src/lib/workspace/unified-journey.ts` — new purely derived, source-honest Today view and Home mode navigation; native task/note/event continuation.
2. `src/scripts/workspace-home.ts` — original Home/Tasks render integration, volatile modes, validated public route mode, original focus controller, explicitly reviewed single-task triage via existing H12 writer, account/privacy/dirty handling.
3. `src/lib/workspace/home-view.ts` — removes duplicated action overloads in the legacy Workspace and mobile summary; canonical task/weekly navigation.
4. `src/styles/workspace-unified-h20.css` — responsive Today/Focus/Workspace layout, accessible focus/confirm controls, hiding redundant presentation without changing source authority.
5. `src/components/workspace/WorkspaceShell.astro` — original shell stylesheet integration.
6. `docs/HUB_H20_UNIFIED_PLANNING.md` — this implementation and H21 handoff.

## Limitations

- Mode and task selection are **presentation-only**. Home's display preference is in its sanitized route, not a new persistent preference or progress engine. Focus sessions are still in-memory and never award completion or mastery.
- Native task deadlines, H17 reviewed local calendar blocks and H19 weekly carryover continue to have separate owners and IDs. H20 does not silently keep task and calendar date/time changes synchronized or introduce a task/event foreign key.
- Task completion checkboxes remain user-initiated native original actions. H20's due-date/priority review requires its separate explicit confirmation. The historical H12 one-tap actions may still exist in earlier widgets; this change does not pretend to remove or rewrite all legacy actions.
- The H11 Continue desk remains the sole existing approved owner-metadata source. H20 hides it outside Workspace mode without initiating any new Notes/Library/TMS60/StudyOS/Google provider reads, grants or writes.
- Existing IndexedDB CAS failures may leave a current-tab unsaved mutation. No guaranteed page-crash recovery, automatic cross-tab merge, external offline sync or browser-background timers are claimed.
- **NOT_TESTED / NOT_BUILT / NOT_DEPLOYED:** No tests, typecheck, builds, CI, browser/database acceptance, audits, migrations, merges, deployments, credentials, paid services or production changes were run as requested. Committed source is not proof of runtime correctness.

## H21 — Task-Centered Capture, Completion & Context Return

Prioritize substantial original-workflow improvements: simplify capture → Inbox → review → Focus → explicit complete or defer, provide a source-grounded recent action/return path with honest task/note/calendar identities, preserve in-memory draft and conflict notices across native dialogs, make mobile form and keyboard transitions more recoverable, and strengthen task context previews without creating a second progress/task store, background schedule, owner-app transfer, fabricated source links or external calendar writes. Keep H9–H20 original authorities and return-to-origin boundaries intact; continue implementation-first, no qualification-only phase.
