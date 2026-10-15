# THIEPN Hub H17 — Contextual Work Handoffs & Workspace Coherence

**Exact stacked parent:** H16 draft PR #149, branch `feat/hub-h16-recovery-return-journeys`, commit `0a8d8ac10f482403c7ee6f06f42cdd809ab7a6ce`. Previous H15 #148, H14 #147, H13 #146, H12 #145, H11 #144, H10 #143, H9 #142 remain unchanged. No merge to main or production.

## Actual implementation

H17 adds real contextual task, note and calendar workflows to the original Hub `WorkspaceShell`, without changing `WorkspaceState.schemaVersion`, creating an association table, or importing another owner's private progress.

- **Contextual next actions for original records:** Task rows, Home priority rows, mobile Today, H16 returning-user cards, H13 task/note/event widgets, the original calendar agenda and the native local-notes widget expose explicit **Next actions** for an actual record ID. A context dialog identifies the source as **Hub local task**, **Hub local note** or **Hub local event** and offers native editing/next-step actions.
- **Task → reviewable Hub calendar block:** Selecting a real incomplete task opens a review form with task name/due context, proposed Hub date, local start time, 30/45/60/90/120-minute options, optional all-day event, and an explicit confirmation checkbox. All times are validated by the existing `zonedInstant()` timezone/DST authority, end time must follow start and stay within the chosen calendar day, and invalid or identical locally saved events are rejected. On explicit submission the **original** `mutate → parseState → WorkspaceStore.save` creates a separate native `CalendarEvent`; the source task due date, time, priority and completion remain **unchanged**. The event carries a fresh event ID and has no fabricated synchronization or persistent task relation. Owner permissions, H10 read-only .ics imports, Google Calendar and StudyOS calendars are not written.
- **Task → editable local note:** The user can open a new `editNote` dialog seeded from the actual task title/details. The draft isn't stored or sent to Notes until the user explicitly saves it in Hub. Uses original `Note` ID creation, editor, owner namespace and undo. No implicit progress or permanent task/note relation.
- **Note → editable local task:** A local note's title/body may seed a new Hub task editor. The new task defaults to **no due date** (Inbox), and the user can review, change priority/due and save through the original task writer. Text is explicitly editable and not automatically synchronized back to the note.
- **Event → editable Hub task:** An original local event may seed an unscheduled task after user review. No external calendar event or other app data is copied without explicit action.
- **Return to original source:** One session-only, account-epoch-scoped `WorkOrigin` pointer holds the original task/note/event ID while contextual forms are open. A visible **Return to source** bar opens the original native editor; **Dismiss** clears it. It disappears automatically when the original record is absent, the account changes, the workspace becomes locked or personal content is masked. This pointer is **not** a new record, table, history log, stored deep link or unauthorized shared progress. It intentionally does not survive route reload.
- **Owner-app handoff:** The context for a local note can open the original approved Notes app action URL, without transferring Hub note body or claiming a per-note deep link. Other owner-app connection routes remain the existing H11 authorized status view with their original grants; no owner API request was added.
- **Mobile/keyboard and provenance:** Responsive contextual actions in desktop Home, local task rows, returning-user and mobile Today, agenda rows and H13 widget cards; accessible button labels, keyboard focus and explicit local-versus-owner labels. Original Ctrl/Cmd+K, Alt+Shift+F and Alt+Shift+R remain unchanged.
- **Interruption and conflict boundaries:** Calendar handoff requires the original owner-scoped IndexedDB store to be ready without an unresolved CAS conflict or dirty local changes. Event creation revalidates the actual task at native mutation time and blocks duplicate identical Hub calendar slots. If a committed write cannot be confirmed, the form reports an unsaved state and advises export/retry rather than claiming synchronization. Original H16 backups/recovery and account isolation are reused.

## Changed source files

1. `src/lib/workspace/context-handoffs.ts` — reviewed calendar event proposal validation, duplicate detection and task/note seed helpers.
2. `src/scripts/workspace-home.ts` — original native task/note/event context flows, explicit event create, current-tab return pointer and edit forms.
3. `src/lib/workspace/home-view.ts` — desktop and mobile contextual actions.
4. `src/lib/workspace/return-journey.ts` — context handoffs in H16 returning-user Home.
5. `src/lib/workspace/widget-views.ts` — context actions for H13 task/note/calendar widgets.
6. `src/components/workspace/WorkspaceShell.astro` — return-to-origin presentation and stylesheet import.
7. `src/styles/workspace-handoffs-h17.css` — keyboard, mobile, source context and calendar review presentation.
8. `docs/HUB_H17_CONTEXT_HANDOFFS.md` — this scope and H18 direction.

## Limitations and guardrails

- A task and its proposed calendar block are **two independent Hub records**. H17 does not introduce a foreign key, auto-block all time conflicts or automatically reschedule a task when the independent event changes; identical-event prevention covers the same local title/date/slot but not all overlaps.
- A source-to-new-record seed copies text into an editable form. **No target record exists before Save**, and a saved target has its own ID and provenance; there is no durable task-note or task-event relationship.
- Return-to-origin is deliberately **tab-local** and resets on account change/route navigation; it is not cross-device state. H16 handles browser interruption with original capture/layout backups, but it cannot guarantee recovery of uncommitted form fields after an abrupt browser termination.
- Owner Notes is only a launch destination. No Notes private content, Library progress, TMS60 state, StudyOS assignments or Google Calendar contents are fetched or changed. No owner permissions or account authorities were expanded.
- The original `mutate()` writer reports storage errors via dirty/conflict state and preserves the local copy; scheduling rejects an unsaved starting state and does not claim that an in-memory event is durably saved until the writer completes.
- **NOT_TESTED:** User explicitly excluded tests, typechecks, builds, CI, browser/database acceptance, audits, migrations, merges, deployments, credentials and paid APIs. Source committed, runtime behavior unverified.

## H18 — Daily Planning Review & Local Calendar Coherence

Expand the existing native task/event agenda into a meaningful, user-controlled planning review: surfaced date conflicts, explainable due-versus-scheduled labels, local event overlap hints without an independent scheduling engine, optional confirmation-driven event adjustments using the original calendar editor, coherent mobile day/week agenda navigation, and source-aware owner-app launch actions. No silent calendar writes, duplicate date stores, unsupported Google/StudyOS/ILIAS sync, or fabricated cross-app deadlines.
