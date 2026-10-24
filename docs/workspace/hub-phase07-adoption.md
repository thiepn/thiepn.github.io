# THIEPN Hub Phase 07 — owner-scoped Notes reminders

Source branch: same draft PR #189 `feat/connected-hub` from `ce65cfd49b84e824df6060d77021ee5d2f5bc946`. Reference source PR #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Genuine Phase 06 baseline
- Library #40091862244 PASS, actual owner library build and Chromium/Firefox/WebKit consent.
- Reading #40091862291 PASS, actual reading pilot checks.
- Quality #40091862265: original release boundaries, Calendar startup and Account durable-token cross-tab smokes PASS. Full `npm run audit:studio` executing at initial inspection; cannot claim Vitest or browser result before completion.

## Phase 07 integration
- Original `notes-reminder-continuity.ts`, PR #166 unit tests and three-browser/mobile popup tests. No borrowed public-domain documentation, no fabricated reminders.
- Authorized Note summaries originate exclusively from existing popup approval and exact nonce/opener/origin/owner matching. Reject one-time replies when Hub identity is unverified. Reject unrelated or expired owner provenance.
- `authorizedNotesPlanningSnapshot()` is read-only and returns only `freshNotesReminderShare` for a matching current owner, unlocked and unhidden Workspace and `ready` Notes status.
- Expiry timer clears the owner snapshot and removes existing rendered source rows after five minutes from generated timestamp. Revocation, privacy holds and owner changes cancel the timer and hide source titles, including context-dialog titles. Nothing saved to WorkspaceStore, Account, Calendar or backups.
- Today seven-day workbench contains up to six source reminders (civil days in Hub timezone). Original Calendar day/week plan displays the same owner-only reminders separately; source timestamps are never presented as Hub event bookings, completions or time blocks.
- Use existing `connect-notes-source` / `clear-notes-source` action handlers. No new action authority, scheduler, permissions, duplicate calendar engine or note writer. Layout CSS provides readable real data, controls and provenance.
- All original native Hub event/time editing and StudyOS Calendar authority remain unchanged.

## Phase 08
First qualify exact-head Node/Astro/TypeScript/Vitest and Chromium/Firefox/WebKit evidence; fix demonstrated integration bugs on this PR. Then implement the next substantive missing original source workflow, preserving established ownership, record IDs, consent and user-chosen editor paths. No verification-only commits or release operations.
