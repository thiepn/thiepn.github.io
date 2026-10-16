# THIEPN Hub H19 — Weekly Planning Follow-Through & Recovery-Friendly Actions

**Verified stacked parent:** H18 draft PR #151, branch `feat/hub-h18-daily-planning-review`, exact head `cffa43d79573a75f6c326279b6b70dc9de80af89`. Historical ancestry remains H17 #150, H16 #149, H15 #148, H14 #147, H13 #146, H12 #145, H11 #144, H10 #143 and H9 #142. `main` and production are untouched.

## Actual implementation: native, reviewable weekly follow-through

### Weekly task and calendar source review

H19 adds a distinct **Review unfinished work** section to the H18 Week calendar view. It is a pure, read-only projection of the original owner-scoped `WorkspaceState.tasks` and H18's original native `events`:

- Actual unfinished Hub task counts: due **before the selected week**, due **within the selected week**, **unscheduled Inbox**, due **after the selected week**, plus all unfinished records.
- Weekly local calendar workload: **timed event-day appearances**, **all-day event appearances**, and existing H18 **possible overlap occurrences**; the UI explicitly explains that a multi-day event can appear on multiple days and that counts are neither planned task hours nor external calendar availability. Task deadlines remain independent from timed appointments.
- Deterministic unfinished-task ordering from native due dates and user priorities, no inferred urgency or fake academic progress. Original task title/clock/priority and dates are shown before selection. Empty categories provide the native task Inbox route and other filter choices.
- User-selectable task filters **Before this week / Due this week / Inbox / After this week / All unfinished**, with an explicit bounded visible list of up to 40 matching rows. **Select shown / Clear selection / Review selected** have keyboard and touch controls. Task selection is session-only, not a new persisted progress state.
- Up to **25 unfinished tasks** per explicit carryover review. Selection persists while changing in-page filters but resets on identity change, local privacy masking or full page reload. No shadow task collection is stored.

### Review before any due-date write

- Clicking **Review selected** opens the original native Hub form. It defaults to **next Monday** of the selected week, or today's date if that Monday has passed. Users may choose another present/future valid date.
- A live read-only preview identifies each actual task by its original title, old due date (or Inbox), proposed new due date, and any clock time that the existing H12 planner will clear. The preview stays bound to the **same selected task snapshots** that were captured when the form opened.
- A separate required checkbox explicitly confirms that only the selected original **Hub task due dates** may change, and neither calendar events nor academic records will be created or modified.
- The pure `prepareWeeklyShift` checks every source ID, original title/due/time/priority/completion snapshot, unfinished status, selection uniqueness, nonempty actual change set and permitted batch count before changing anything. If **any** task changed, was removed or completed while reviewing, the entire batch is rejected and no partial native task mutation is attempted.
- The existing H12 `applyTaskPlan(task, 'today', chosenDate)` performs each actual due-date change within **one original `mutate → parseState → WorkspaceStore.save`** account-owner-scoped CAS/undo operation. No new scheduler, progress writer, backup table, recurring event engine, or parallel task store. The original activity journal records a truthful batch description, not fabricated completion or mastery.
- After the native mutation, the handler checks each changed record, original identity epoch and the original dirty/conflict state. On unconfirmed persistence it keeps the user in the review flow with **export/retry guidance**, rather than claiming saved success or automatically resubmitting.
- On confirmed save, the UI clears only the transient selected-ID set and navigates to the **target week**. A **Return to reviewed week** control restores the original week; the original user data and editor authorities are unchanged.

### Recovery-friendly date and keyboard navigation

- The existing calendar accepts only sanitized `?date=YYYY-MM-DD&mode=week` navigation state and an optional validated original-week return date. It rehydrates date/mode after reload without retaining private task IDs, document text, activity scores, grants, or owner-app content in the URL. Invalid or unknown parameters are stripped.
- Date/mode changes use `history.replaceState` with validated calendar-only navigation metadata. Account identity changes reset transient selections and week return state. Normal local task/capture backups, H16 recovery, H14 search and original routing stay intact.
- The original calendar navigation gains a **Review unfinished tasks** jump. On the calendar, **Alt+Shift+P** switches to Week mode and focuses the review action; H18 Alt+Shift+J/K/D/W and earlier H14–H17 keyboard behaviors remain available.
- Responsive accessible 2-/3-column workload cards, filter chips, checkbox task list, confirmation dialog, reduced visible-row count, and mobile-first touch controls. Focus is restored on task checkbox changes. All text remains HTML-escaped and labels identify the actual Hub source.

## Exact files changed (6)

1. `src/lib/workspace/weekly-followthrough.ts` — new pure task buckets, weekly workload, source snapshot validation, native task date mutation adapter and responsive weekly review renderer.
2. `src/scripts/workspace-home.ts` — session-only selection/filter state, owner/privacy lifecycle, explicit batch-confirmation dialog, date/return URL handling, keyboard and original storage/undo delegation.
3. `src/lib/workspace/planning-view.ts` — H18 Week view integration and return-to-week/review navigation.
4. `src/styles/workspace-weekly-h19.css` — accessible desktop/mobile weekly review, bulk consent preview and focus.
5. `src/components/workspace/WorkspaceShell.astro` — import of the H19 stylesheet in the existing shell.
6. `docs/HUB_H19_WEEKLY_FOLLOWTHROUGH.md` — this implementation and H20 plan.

## Important limitations

- **Not another scheduling authority.** Only existing Hub-local tasks and calendar events are read; no Google Calendar, StudyOS, ILIAS/KLIPS, university deadlines, Notes, Library or TMS60 records are claimed synchronized. All calendar event time blocks remain independent from Hub task due dates.
- **No automatic carryover.** H19 **never moves unfinished tasks without explicit selection, target review and final confirmation**. Batches cannot exceed 25 tasks. No existing task completion/priority/title is altered and the original time field is cleared when its due date changes, matching H12.
- **The current in-memory review is not a guaranteed durable edit.** Browser termination during a native IndexedDB write, storage denial or concurrent mutation may leave a dirty/conflicted local copy; the original H16 Export/Retry/Reload recovery route remains necessary. No automatic unsafe merge or silent retry occurs.
- **Navigation state only.** The URL can restore the selected calendar date/week, not a private selected-task batch or partially typed confirmation form. Selection/preview does not survive reload or account changes and is not an additional notes/draft store.
- **No runtime qualification performed.** Explicitly **NOT_TESTED / NOT_BUILT / NOT_DEPLOYED**: no tests, typechecks, builds, CI, audits, browser/database acceptance, migrations, merges, deployments, credentials, paid APIs or production changes were run per request.

## H20 — Unified Weekly Planning Experience & Native Workflow Refinement

The next implementation-first batch should unify H15 daily focus, H16 return, H17 context actions, H18 day/week calendar and H19 carryover into simpler task-first Today/Week flows; reduce redundant controls, make the original task/edit/confirmation journeys clearer on mobile and keyboard, improve explainable empty/permission/dirty/conflict states and coherent return navigation, and preserve every original source authority. No duplicate planner, external calendar writes, fabricated progress, automatic rescheduling, new persistence schema or qualifications-only release gate.
