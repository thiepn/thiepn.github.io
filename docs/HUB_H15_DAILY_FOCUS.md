# THIEPN Hub H15 — Daily Focus & Workspace Personalization

**Exact verified parent:** H14 draft PR #147 (`feat/hub-h14-unified-action-palette`) at `b5ac729e0c8dfb249b310bdbfea80effcd8d7126`, stacked on H13 PR #146, H12 PR #145, H11 PR #144, H10 PR #143 and H9 PR #142.

## Delivered native learner/user functionality

- **Daily Focus panel on Home.** Derived directly from the existing `WorkspaceState.tasks`, with real title, due status, actual priority and completion. Supports Today + overdue, high-priority, Inbox and all-open views. Queue ordering uses the original user-set priority and due dates; there is no AI-generated estimate or inferred urgency.
- **User-selected next action.** Select a genuine incomplete Hub task, open its original editor, mark it completed via the original checkbox and `mutate()` writer, move the task's deadline via the original H12 task-plan actions, or choose the next real task. All task writes retain the existing account-scoped WorkspaceStore, CAS/revision conflict logic, activity ownership and undo. Selecting a task never changes its due date, completion or owner.
- **Bounded focus queue.** Show 3/5/8 tasks, with accurate counts and an explicit disclosure when additional real tasks are hidden by the display limit. Empty queues offer native task capture/add actions. No duplicate tasks are created for focus.
- **Optional concentration timer.** User-controlled 15/25/45-minute session clock with Start, Pause/Resume and Reset. It is a volatile UI clock driven by wall time while this tab is visible. Hiding the tab pauses it, navigation/pagehide clears the active tick, identity changes reset it and existing privacy masking pauses it. Timer expiry **does not mark a task completed** or claim verified focus, training or mastery.
- **Quiet workspace presentation.** Toggles an accessible quiet view for Home, hiding supplemental overview cards, widgets, owner-app continuation, imported-calendar panel, mobile Today summary and the right-side planner while keeping the main focus task, search, original navigation and actions available. Leaving quiet mode restores them; none of their layouts or records are altered. Quiet preference, queue choice and focus selection remain in this tab only, not in a second personal settings store.
- **Practical mobile and keyboard access.** Direct Focus anchors from desktop and mobile Home Today; responsive single-column task and timer controls, touch-size actions, ARIA pressed states, native checkboxes/selects and Alt+Shift+F shortcut to reach the focus controls when the private workspace is available.
- **Privacy and interruption safety.** On account identity changes, reset selection, timer and quiet view. On personal content masking, pause and remove private content from rendered Home. On hidden-tab events, pause. A session is not silently resumed after a reload and no focus logs, time records, alerts, browser notifications, analytics or cross-app messages are written.
- **Source honesty.** The panel reads only local Hub tasks; it does not treat H10 Google Calendar exports, H11 owner metadata, Notes/TMS60 learning, StudyOS assignments, or source-unavailable apps as local tasks. Focus completion is always controlled by the existing task writer, never by a clock or owner-app integration.

## Exact changed files

1. `src/lib/workspace/daily-focus.ts` — new pure focus queue and task-aware panel.
2. `src/scripts/workspace-home.ts` — uses original Home render pipeline, session-only controller/timer, identity/privacy lifecycle, native action wiring and keyboard shortcut.
3. `src/lib/workspace/home-view.ts` — direct desktop/mobile Focus entry points alongside H9–H14 Today actions.
4. `src/styles/workspace-focus-h15.css` — responsive, accessible focus view, quiet-mode layout and timer/task presentation.
5. `src/components/workspace/WorkspaceShell.astro` — import of the original shell-scoped focus stylesheet.
6. `docs/HUB_H15_DAILY_FOCUS.md` — this implementation and H16 handoff.

## Hard boundaries and known limitations

- Focus queue, selected task, timer and quiet view are **deliberately ephemeral**, in-memory-only. They are not a new IndexedDB table, user profile, progress store or cloud sync. They reset on full page navigation/reload/account change. Existing task due/completion writes still persist through the **original** Hub store when granted and storage works.
- Focus time is advisory; not a guaranteed alarm in background or when the browser throttles/suspends/terminates. The hidden-tab event pauses it; exact remaining time is best effort at page interruptions. No push alerts, notifications or automated schedules are requested.
- Prioritized work is derived from actual Hub task dates and user-set priorities, not invented academic deadlines, scored productivity, auto-planned calendar slots or cross-app learning progress.
- The original local Hub calendar, imported H10 read-only calendars, H11 provider permissions and H12–H14 task/palette contracts remain unmodified.
- **No tests, type checks, builds, CI, browser/device acceptance, audits, migrations, merges, deployments, credentials, production actions or paid APIs were run.** This is unqualified committed source and cannot be presented as verified production behavior.

## H16 — Dashboard Recovery & Consistent Return Journeys

Consolidate the original Hub return/recovery experience with explicit session continuity and source freshness: useful return-to-Home state after interruption, original saved layout draft recovery, conflict-safe task/capture continuation, stronger local-versus-owner provenance, offline/locked recovery guidance, and consistent mobile task/notes/calendar transitions without creating a parallel persistence or sync authority. Avoid repeating heavyweight qualification; prioritize actual owner-safe product workflows.
