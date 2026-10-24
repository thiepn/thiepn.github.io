# THIEPN Hub Phase 08 — guided weekly review

Source draft PR #189 exact predecessor `eed0cfd694b4458b26a63d9a8de6cfbcbd9f1da3`; original opt-in P1 proposal #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Prior genuine CI
Quality #40093354970: Astro/TypeScript PASS, 85 unit files/600 tests PASS (including Notes reminder/focus), original Notes reminder popup + revocation across Chromium, Firefox, WebKit PASS. Full browser suite: 1216 PASS, 7 FAIL, 4 SKIP. 3 failures in guest Workspace route, 3 unfinished layout navigation/recovery, 1 separate Chromium-only Account token refresh (2 vs 1); do not weaken Account check. Library #40093354972 and Reading #40093354986 PASS three engines.

## Feature adoption
- Original P1 `weekly-review-journey.ts` and schema-v1 source-owned `outcome-board.ts`/`decision-register.ts`. Reviews proceed through five tabs: triage, Calendar, routines, decisions, finish. Counts come from original live Hub records; no cached, inferred external work, review completion stamp, grading or scheduler.
- Review uses original Hub task/date review, timed events, tracker check-in, explicit bounded Notes/Folio time-shares, source-approved decision/outcome IDs. Grouping metadata remains current-workspace widget config, original CAS/undo, max eight outcomes and twelve decisions, not a new database.
- Decision recording requires actual 2–4 alternatives, review date optional, original task/note reference optional; title/context/rationale entered by user. No copied source bodies, StudyOS assessment or external owner data.
- Outcome grouping references original task/tracker IDs only. Archive/reopen and removal use current active workspace/record snapshot consistency checks. Original tasks/events untouched by changing groupings.
- Five-stage Review and summary editable as temporary tab-only reflection and proposed priority. Only explicit Hub Notes form submission saves a note.
- Review URL mode is a public presentation choice; root Home remains Today. Identity/privacy wipe temporary reflection. Original focus, records, Apps/Docs, Account and connected provider permission boundaries unchanged.
- Reconciles initial deep-link restoration with owner known state rather than resetting view on repeated bootstrap. Interrupted layout resume returns to the native Workspace editor. Retains full original security/persistence assertions.
- Adds original author source unit and mobile browser proof tests; no decorative UI microcopy, duplicate engines, new pull request, merge, migration, deployment, OAuth or production write.

## Release gating
Actual exact-head Astro/TypeScript, Vitest, Chromium/Firefox/WebKit, Library/Reading and Account need genuine executed job logs. NO_GO until remaining source-owned defects and authenticated owner boundaries are verified.
