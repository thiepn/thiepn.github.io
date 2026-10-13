# THIEPN Hub H10 — Consent-scoped calendar snapshots

**Parent:** H9 draft PR #142, branch `feat/hub-h9-daily-home-mobile-usability`, verified exact head `6ed93cf029a8bb8638de44f76256ff310a834e93`.

H10 is a source-only feature implementation. It adds a **working read-only iCalendar snapshot viewer** while retaining the existing Hub calendar as a separate local editable owner. It intentionally does **not** claim a live Google Calendar connection, StudyOS cross-origin API, or any new OAuth grant.

## Why the calendar transport is not automatically enabled

StudyOS P11 already owns a separately consented Google Calendar OAuth integration, encrypted refresh tokens, per-calendar selection and a busy/event cache for academic scheduling. That connection is independent of THIEPN Account, Study Drive, and the ChatGPT Google Calendar connector. At the inspected repository revisions, Hub's provider registry only supports Notes, Library and TMS60 handoffs; no certified calendar owner transport or Hub calendar grant was identified. Consequently, copying StudyOS tokens, reading its database, calling an undocumented cross-origin endpoint, or implying Account login grants calendar access would be incorrect.

The H10 UI says **not connected** until the user explicitly supplies a local `.ics` calendar export. The imported file's actual events are the source of every preview row. It does not search any Google Calendar account behind the scenes.

## Working implementation

- New dedicated **External calendar · read only** panel on `/` and `/home/calendar/`. It coexists with, but never writes to, the original editable Hub events and task calendar.
- Import up to six explicit user-selected `.ics` files, at most 2 MB each. Read via native File API in the current tab; no uploads, database schema, IndexedDB, localStorage, service worker cache, external fetch, new credentials, or token handoff.
- Each file is a selectable calendar source, labelled by its genuine `X-WR-CALNAME` (or filename), plus import timestamp and filename. Toggle or remove an individual source, reimport the same filename to replace its snapshot, or clear all.
- Parse original iCalendar `VEVENT` entries; handle `DTSTART` / `DTEND` for date-only/all-day and UTC/TZID/floating timed events. Preserve inclusive **display** dates for all-day `DTEND` (which is exclusive in iCalendar). Format timed events in the existing Hub planner timezone, respecting named IANA zones and DST-gap rejection.
- Expand a bounded subset of daily/weekly recurring events; honor `COUNT`, `INTERVAL`, `BYDAY`, `UNTIL` dates, `EXDATE`, and `RECURRENCE-ID` overrides. Reject unsupported recurring rule forms instead of pretending an inaccurate single occurrence is complete. The UI names unsupported extra dates and this-and-future exceptions.
- Show up to 30 visible seven-day preview rows; bound parsed events to 3,000 per file, total recurrence processing, source selection and output sizes. Exact UID+occurrence deduplication across explicitly selected calendar exports; identical titles with different UIDs are not collapsed.
- Display genuine filename/calendar provenance, source selection, imported-at freshness, display timezone, read-only indicators, import warnings and explicit states: disconnected, reading, empty, ready, stale, expired and error. Snapshots become stale after six hours and expire after 24 hours in the current tab.
- Clear imported data on Hub identity events, privacy masking, page navigation/pagehide and expiry. Do not include private calendar information in public HTML, URL parameters, analytics, exported Hub workspace JSON or other app data. Importing does not change local calendar records.
- Existing original Home, Tasks, Calendar, widgets, sidebar, local storage, Account/Core and production configuration remain authoritative. H9 parent is retained unchanged.

## Using the new panel

Export a selected calendar from Google Calendar to a genuine `.ics` file, then import that file in the Hub panel. If Google's whole-account export is a ZIP, extract the selected `.ics` files locally first. Choose which imported calendars to show. Existing ILIAS/KLIPS subscriptions appear only when included in the chosen Google export; they are not separately scraped. Since this is a file snapshot, reimport after changes and do not mistake the import time for Google's last sync timestamp. Never paste a secret iCal subscription URL into Hub.

## Known limits

- **No live refresh:** no certified Google Calendar / StudyOS → Hub read-only event endpoint has been implemented. This is a functional file-import path, not a certified API connection.
- **No permissions invented:** THIEPN Account login neither implies permission to read StudyOS/Google tokens nor obtains a calendar access scope. Future providers need user approval, scoped endpoints and owner-side authorization.
- iCalendar is complex: only daily/weekly recurrence forms listed above are handled; unsupported monthly/yearly, RDATE, RANGE=THISANDFUTURE and malformed/ambiguous rules require checking the original calendar. Snapshot coverage is bounded and can be incomplete.
- Selected calendars and events are session-only, so navigation/reloading the page discards the snapshot. This is deliberate to avoid a new external-event persistence authority.
- Google Calendar or StudyOS writes, event updates/deletions, ILIAS direct connections, automatic academic commitment creation and calendar reminders are not in this phase.
- **No tests, builds, CI, audits, migrations, deployments or production acceptance were executed**, per the H10 user instruction. Source correctness has not been certified by runtime checks.

## H11 direction — authenticated cross-app continuation

After a properly reviewed owner boundary exists, prioritize source-backed recent resources from Library, Notes and StudyOS:

1. Add explicit per-owner limited read scopes and session-lifecycle handling through existing THIEPN Account/Core identities.
2. Expose only approved resource metadata and canonical owner launch actions; avoid raw note content, full Library indexes, grade/mastery writes and provider fan-out.
3. Render real last-opened resource entries with freshness/coverage and incomplete/offline states, including independent per-provider revocation and clear-out on identity/lock changes.
4. Replace H9's handoff-only Continue cards incrementally when owner-authorized adapters are genuinely available, without new resource or progress stores.
