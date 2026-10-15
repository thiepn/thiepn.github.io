# THIEPN Hub — Daily Home & Mobile Usability (H9 feature batch)

Source-only development from verified `main` commit `3bd25aabaf8e759ef9296ee3d1033f2307a931f2`.

**Naming note:** The repository already contains `docs/HUB_H9.md`, an earlier historical *controlled public rollout* phase. This is a new user-requested H9 *daily-home feature batch*; the historical document is unchanged.

## Implemented

- New source-backed daily overview above the widget grid: upcoming/overdue Hub-local tasks, priority ordering, actionable task checkboxes/edit, upcoming Hub-local events, and direct task/event/capture creation using the original writer.
- Compact Today panel for viewport widths below 1020px on Home, Tasks, Calendar and Trackers, replacing the missing right-hand planner visibility with local counts, next local event and direct actions.
- Owner-app launch actions from the curated existing app registry for Library, Notes, TMS60 and French. These are labelled handoffs; they do not claim Hub has read reading positions or lesson progress.
- Continue widget now differentiates local Hub notes from owner-app actions, displays newest captured notes, and shows appropriate no-data guidance.
- Mobile bottom navigation has five primary choices instead of six; Settings remains available via the Account dialog and desktop sidebar.
- Account, privacy, local storage, recovery and multi-tab handling remain in their existing owner-scoped workflow. A storage-read failure retains its original data and presents a recovery export action.
- New CSS presentation for readable hierarchy, 44px-class touch actions, keyboard focus, source labels and responsive one-column panels without another independent widget engine.

## Data and release boundaries

- Tasks, events and notes above are local Hub workspace records only, *not* synchronized calendar data.
- Google Calendar, StudyOS progress, Library history, Notes cloud files and private app records are **not** queried, inferred or copied.
- Owner-app links are navigational, not authorization to transfer records or perform writes.
- Source-only: no tests, builds, CI, audits, database migrations, merges, deployment, live account access or production changes requested or executed for this feature batch. Runtime behavior has not been acceptance-tested.
- The currently reviewed app catalogue, Account/Core and app-specific authority are unchanged.

## H10 — calendar integration

Implement a read-only, consent-scoped calendar provider using the already-supported Google Calendar/StudyOS integration path where possible. Select source calendars explicitly, preserve source/calendar identity and freshness, handle all-day/timed events and timezones, and deduplicate imported ILIAS/KLIPS feeds. Keep external read-only events separate from Hub local editable events. Cancellation and clearing on account switch, revocation, visibility lock and expired consent are required. Do not introduce a separate ILIAS scraper or shadow calendar database.
