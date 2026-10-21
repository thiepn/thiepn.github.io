# Hub Calendar C1 — opt-in, owner-bound read-only preview

Draft, not deployed. The native Hub calendar and existing manual .ics preview are preserved. C1 adds a separate opt-in Google Calendar source panel to Hub Today and /home/calendar/. It uses the existing THIEPN Hub signed OAuth token and the StudyOS owner projection endpoint. It does not copy credentials, persist event rows or create/edit calendar blocks.

Configured only when `PUBLIC_STUDYOS_ORIGIN` matches `https://study.thiepn.dev`. Every fetch is GET, no-store, credentials-omitted, redirect-denied and no-referrer. The response validator bounds timestamps, IDs, content, event count and horizon; event text is escaped. Changes to Account identity, privacy state, page lifecycle or visibility abort pending reads and clear the ephemeral snapshot. Last StudyOS synchronization and stale/partial status remain visible rather than claiming real-time Google availability.

Hub academic PR #174, workspace PR #166, and Account/Core owner code remain unchanged. The source-owned StudyOS calendar read endpoint is a separate C1 draft. Before live enablement, qualify exact-head tests/build, authenticated two-account/revocation/browser consent, original RLS rights, fresh Google sync, cross-browser behavior and joined native calendar deduplication. Account scopes and tokens must not be broadened silently. No production activation, migrations or billable CI were initiated.


## C3 — source-derived weekly course envelopes and unreserved capacity

A temporary read-only `studyos-exam-roadmap-v2` JSON import is available on the original Hub Today/Calendar source panel. It validates the user's 23 consecutive weeks (2026-10-21–2027-03-23), per-course hour totals, defined 08:00–20:00 study window, meal breaks and 3–4h weekend limitation. The JSON file is read on-device only after a user explicitly chooses it, kept solely in memory and dropped on privacy hiding, identity change, pagehide and hidden tab. Its course hours are projections, **not** completed study, a new calendar scheduler, or native committed StudyOS weeks. No user-specific roadmap, credentials or calendar records are checked into this repository.

If an active native StudyOS week is provided by the existing signed-client owner read endpoint, that week takes priority over the imported reference. No plan is invented when zero active plans exist. The composed source view can expose candidate free intervals wholly within 08:00–20:00, excluding original local/Google busy events and **proposed** 12:30–13:15 lunch and 18:00–18:45 dinner; it does not book them. Free-time estimates and intervals are suppressed if source coverage is stale or incomplete, and weekends remain limited to a 210-minute target rather than claiming all unoccupied time as study. Tests include original Node/Vitest schema, DST, overlap and privacy and Playwright desktop/mobile coverage.

C2 pre-existing unowned failures: Firefox original pointer drag/reflow and Library/Reading source-absence test contracts. C3 fixes its own 390px browser test by using the visible desktop event control before switching to a genuine mobile-sized viewport; it does not make hidden buttons artificially visible or relax expectations.

The Calendar-purpose Account permission and live signed two-user verification are **not** completed. C3 is draft/source-only. The Google Calendar snapshot is stale (last verified 11 Oct 2026). Do not deploy, grant scopes, write production data or merge until explicit owner approval and complete qualification.
