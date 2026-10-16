# THIEPN Hub H12 — Capture, Task Inbox & Local Scheduling

**Stacked parent:** H11 draft PR #144, branch `feat/hub-h11-authorized-continuation`, exact verified commit `2b03aca2a1878d7d88b41818e37c524cfa40de46`; H11 remains stacked on H10 PR #143 and H9 PR #142. This source-only batch introduces no schema migration, cloud writer, provider grant, or extra storage system.

## Implemented native functionality

- **Unified quick capture:** The existing `capture` action now opens a direct, keyboard-friendly dialog with a single editable title/details field, local note/task routing, optional task due-date preset and priority, and an explicit source label. The original Capture widget uses the same fields and invokes the same `saveCaptureData` function.
- **Canonical Hub writer only:** `prepareCapture` validates and prepares the existing `Task` or `Note` record. The record and activity trail are written through **the same existing `mutate → parseState → WorkspaceStore.save` pipeline**, keeping optimistic updates, undo, per-account keys, IndexedDB CAS/revision conflicts and backups. No alternative notes/tasks persistence was created.
- **No arbitrary implicit task deadlines:** New captured tasks default to unscheduled **Inbox**; explicit Today/Tomorrow/In 7 days/custom date options set real due dates. Task body first line is the title (≤240 characters), remaining details up to 2,000 characters; longer content can be captured as a local note. Invalid dates and priority values are rejected.
- **Practical task Inbox:** The existing Tasks page now offers Today + overdue, Inbox, Upcoming, All and Completed views with live counts. Unscheduled tasks are not silently treated as today’s deadlines.
- **One-tap planning:** Task rows use the existing task identity and writer for Today, Tomorrow, In 7 days, back to Inbox, priority high/normal and Edit details. Moving the due date intentionally clears the old time rather than carrying a hidden clock appointment forward. This does **not** create a calendar event.
- **Native task editor:** In addition to editing due date and time directly, Today, Tomorrow, In 7 days and Clear due date shortcuts appear in the original task editor.
- **Faster home access:** Both desktop and mobile Today have a direct **Inbox task** capture action. Home priorities disclose the count of unplanned local tasks and link directly to the Inbox view via a safe filter-only query parameter, which is removed from the URL during page initialization.
- **Interruption-resistant local draft:** Capture entry continues to update the sole existing `WorkspaceState.captureDraft` with debounced IndexedDB persistence. There is an explicit **Save draft now** action, a close-dialog flush and best-effort navigation flush, and the existing dirty-state navigation warning. Undo restores the prior workspace state, including the draft after capture. No sessionStorage shadow draft is added.
- **Explicit owner handoff:** A Notes app action reuses the reviewed `providerAction('notes','capture-text')` URL, and **Copy draft** can place the current text on the clipboard on user action. The Hub never sends, appends or silently writes the draft to Notes; the user must paste/save in its own app.
- **Mobile & keyboard:** Ctrl/Cmd + Shift + Space opens Capture when the workspace is accessible; Ctrl/Cmd + Enter submits a capture editor; Escape closes the native modal without deleting the local draft. Filters, date presets and task action controls use responsive touch targets and accessible labels.

## Files

- `src/lib/workspace/task-flow.ts` — capture preparation, date presets, inbox filters and existing-task mutations.
- `src/scripts/workspace-home.ts` — original WorkspaceShell behavior, capture form, task views, priority/date controls and shortcuts.
- `src/lib/workspace/home-view.ts` — direct mobile/desktop Inbox actions and unplanned-task navigation.
- `src/styles/capture-tasks.css` — responsive capture and task planning UI.
- `src/components/workspace/WorkspaceShell.astro` — import original shell-scoped stylesheet.
- `docs/HUB_H12_CAPTURE_TASKS.md` — this specification and boundary record.

## Scope and honest limitations

- All new tasks, notes, due dates, priorities and captured drafts are **Hub-local records in the current browser and account namespace**, not Notes cloud entries, StudyOS tasks, university assignments, Google Calendar events, third-party notifications or synced reminders.
- The original Hub calendar event editor and its data authority remain unchanged. New task due dates appear in the existing task/calendar displays only through those original mechanisms; no new calendar or reminder engine is implied.
- A precise owner write from Hub to Notes (or StudyOS) requires separately supported and authorized target-side writes. H12 deliberately provides a human-reviewed clipboard/launch handoff instead.
- The original capture draft is one shared text field across dialog/widgets. Instant browser termination or account switching before IndexedDB commits can still lose unsaved keystrokes; **Save draft now** and the local backup/export mechanism mitigate this but do not guarantee recovery from storage denial.
- Task scheduling is a due-date planner, not automatic time allocation, recurrence, calendar conflict detection, reminders or an academic schedule write. Rescheduling a timed task intentionally clears its prior clock time.
- **No tests, builds, CI, audits, migrations, merges, deployments, credentials or production updates were run** per this task. The changes are source-committed, not qualified or deployed.

## Next: H13 — Widget library & context-rich, opt-in Home

Expand the existing `registry`, `WorkspaceShell` and layout presets with focused widgets: local Inbox, upcoming commitments, quick task planning, source-labeled connected app links, recent Hub captures and attention/review summaries only from authorized existing providers. Preserve the original planner/task writers, allow each widget to be removed/reordered without losing records, avoid duplicate progress/custody systems and keep explicit empty/stale/offline states.
