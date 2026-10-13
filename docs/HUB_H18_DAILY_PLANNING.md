# THIEPN Hub H18 — Daily Planning Review & Local Calendar Coherence

**Stacked parent:** H17 draft PR #150 on `feat/hub-h17-contextual-work-handoffs`, verified exact commit `7206ea7406ccfeb12f98361b463533ac42c1dc52`. Previous stacked PRs H16 #149, H15 #148, H14 #147, H13 #146, H12 #145, H11 #144, H10 #143 and H9 #142 remain intact; main and production remain unchanged.

## Real source functionality

H18 extends the original Account/Core-owned Hub `WorkspaceState` and `WorkspaceShell`. There is **no new task engine, scheduler, event store, source transport, or persistence schema**.

### Native Day / Week planning review

- `reviewDay` and `reviewWeek` derive current day/week views **on demand** from the original saved Hub `CalendarEvent[]` and `Task[]`, using the original account-scoped planner timezone, `dayKey`, `weekDays`, and existing date helpers.
- **Distinct sources:** timed Hub calendar blocks have real start/end instants; all-day Hub commitments have inclusive dates; Hub task due dates are deadlines, **not** reserved appointment time. Unscheduled Inbox tasks and overdue tasks appear as separate attention items for the present day.
- Full calendar page includes individual Today/Tomorrow, previous/next day, previous/next week, Day/Week switch, an actual 7-day preview, seven interactive day entries, direct task/owner action buttons and native edit links. The original monthly calendar remains available beneath the detailed review. Right-side native planner keeps its existing agenda while showing source labels, counts and dedicated day-by-day controls.
- **Read-only overlap analysis** uses actual local timed event intervals and end-exclusive timestamp comparisons. It identifies pairwise intersection only on dates where the intersection actually occurs (including multi-day intervals), lists the involved original event names and offers a direct *Review time* action. Overlap minutes describe the intersecting time interval; all-day entries, task deadlines and Google/StudyOS/ILIAS events are not treated as exact timed conflicts. Warnings do not change records or silently resolve overlaps.
- Week view shows each day's timed event/all-day/deadline counts, sampled actual titles and a clearly labeled overlap warning. Display limits are explicit; this is not a cloud sync or event availability confirmation.
- Task deadline quick actions allow explicit reassignment of the selected review date through the **existing** H12 `applyTaskPlan` and original `mutate → parseState → WorkspaceStore.save` CAS/undo pathway. Moving a task due date clears its old clock value, leaves unrelated calendar events unchanged and never creates an academic assignment.

### Explicit native calendar event time adjustment

- New *Review time* flow operates on an **existing original event ID**. User reviews start/end date/time, same Hub timezone, or switches the record between timed and all-day, with a live **read-only** preview of event identity, proposed interval and local potential timed overlaps.
- Requires a separate confirmation checkbox; validates valid date ranges, DST-sensitive local times and end-after-start with original `zonedInstant`. It preserves event title and ID, rechecks the actual original record before the queued mutation and writes **only when the user explicitly submits**. Uses existing activity record, undo, owner namespace and CAS. It refuses to run if the local store is unavailable, private content is masked, or unconfirmed writes/conflicts are present.
- If the resulting event cannot be confirmed saved, the existing dirty/conflict path is disclosed rather than fabricating success. No independent editing engine or owner-app writer.
- Original H17 task-to-local-calendar review now displays a **live proposed event preview**, detects exact duplicate local events and highlights actual timed overlaps before its existing explicit confirmation. It does not silently rewrite the original task or imply Google Calendar/StudyOS availability.

### Mobile and keyboard workflows

- Original Home desktop calendar card and mobile Today offer direct **Day agenda** and **Week agenda** links. The calendar honors `?mode=week` when opening, then removes the query in its existing privacy-respecting navigation logic.
- Compact touch-sized navigation, accessible Day/Week selected states and stacked planning/event controls.
- On the calendar page (outside form controls and dialogs): **Alt+Shift+J / Alt+Shift+K** moves back/forward one day or week, while **Alt+Shift+D / Alt+Shift+W** switches Day/Week mode. Original H14 Ctrl/Cmd+K, H15 Alt+Shift+F, H16 Alt+Shift+R and normal calendar/month navigation remain unchanged.

## Exact changed files (7)

1. `src/lib/workspace/planning-review.ts` — original local event/task day/week projections, day-scoped timed overlaps, and validated existing-event change preparation.
2. `src/lib/workspace/planning-view.ts` — full desktop/mobile Day/Week UI, event/time warnings, task due groupings, week tiles, source labels, actions, sidebar summary.
3. `src/scripts/workspace-home.ts` — current renderer integration, volatile agenda mode, day navigation, explicit H12 task-date actions, reviewed original event-time edit with live overlap preview, enhanced H17 task-calendar preview and keyboard controls.
4. `src/lib/workspace/home-view.ts` — desktop/mobile direct Day and Week access.
5. `src/styles/workspace-planning-h18.css` — responsive calendar review/overlap/time-confirmation presentation and focus states.
6. `src/components/workspace/WorkspaceShell.astro` — import of source-only H18 styles.

7. `docs/HUB_H18_DAILY_PLANNING.md` — this implementation record.

## Explicit limitations

- **No new scheduler or availability source.** Overlap analysis covers only currently loaded Hub-local timed calendar events. It does not detect room/attendee conflicts, travel buffers, Google events, StudyOS deadlines, ILIAS/KLIPS courses, Notes/TMS60 learning or calendars not actually present in the original Hub event list.
- Multiple-day events may be represented on multiple day cards, intentionally; week totals are counts of **day/event occurrences**, not unique events. An overlap's reported minutes are the length of the underlying timed intersection, which can span dates.
- A task deadline remains independent from a user-reviewed H17 calendar block: moving one never moves the other. Timed task `time` is not a booked event slot. The UI does not invent durable task↔calendar links or inferred progress.
- An explicit reviewed event change may still overlap another Hub event; H18 warns but does not veto all overlaps, auto-reschedule or modify external records. Invalid times and unchanged proposals are rejected.
- Only the existing original `WorkspaceStore` owns durable writes; a browser may terminate before IndexedDB commits or another tab may trigger an original revision conflict. H16 export/retry/reload are the supported recovery paths. Local Day/Week display mode is deliberately ephemeral, not another persisted preferences engine.
- **NOT_TESTED / NOT_DEPLOYED:** No tests, builds, typechecks, CI, audits, migrations, browser/database acceptance, merges, deployments, credentials, paid APIs or production actions were run as requested. Committed source is not evidence of verified runtime operation.

## H19 — Weekly Planning Follow-Through & Recovery-Friendly Actions

Continue implementation-first in the native Hub: practical weekly task deadline review, unfinished-to-next-week user-controlled carryover, transparent original event vs task workload summaries, explicit confirm-before-change batch planning for local Hub tasks only, stable return to an original planning date after native editors, and useful mobile keyboard controls. Keep owner-scoped CAS, H9–H18 sources, no new planner/progress store, no fabricated cross-app sync or silent calendar changes.
