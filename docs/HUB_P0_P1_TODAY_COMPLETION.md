# THIEPN Hub P0/P1 — Daily-driver consolidation and source-owned Today

Date: 2026-10-17. Initial verified main: \`0ea6ea49c9c1254ba642b3b88d45d68de97e3c06\`.
Continuation: existing draft PR #166 (\`feature/hub-reviewed-cross-source-planning-spread\`).
This is source implementation, **not** deployment or a claim of acceptance.

## P0: audited product inventory and PR overlap

GitHub returned **61 open PRs** as of the baseline read. They are not 61 independent missing features:

| Existing functionality on main | Canonical source | P0 assessment |
| --- | --- | --- |
| Local Today/Focus/Workspace and due/inbox/agenda | \`src/lib/workspace/unified-journey.ts\`, \`daily-focus.ts\`, \`src/scripts/workspace-home.ts\` | Present; better source visibility and navigation needed |
| Tasks, capture, weekly carryover and local event reviews | Original WorkspaceStore and commands, \`planning-review.ts\`, \`weekly-followthrough.ts\` | Present; never create a second planner |
| Device-only Folio and Notes owner shares | \`folio-device.ts\`, \`notes-device.ts\`, existing owner handoffs | Consent and single-tab scope; not background sync |
| Learning read models | Core P9 \`language-read.ts\` | Japanese/French qualified in supported publisher paths; no Chinese source fabricated |
| Source search, layout, recovery | \`search-palette.ts\`, \`store.ts\`, \`return-journey.ts\` | Local-first; private provider authorization remains gated |
| Reading pilot | H21–H24 Library owner bridge | Existing narrow opt-in; broader account/cross-device progress not claimed |
| KEEP full editor/vault | Draft PR #168 | Blocked pending original complete React source, dependency closure and qualified encryption lifecycle |

PRs #143–153 are an old stacked H10–H20 sequence with source overlap on current main. Do **not** merge them blindly or recreate their features. PR #166 is the active task/calendar product branch. PR #168 is a separate KEEP ownership boundary and must not be incorporated opportunistically. The older Prism/CI/release-admission stacks require separate reconciliation; this batch does not close, rebase, merge, delete or deploy them.

## P1: coherent user-visible batch

This continuation extends existing PR #166's reviewed multi-day due-date distribution and approved Folio time comparison.

1. One **owner-sourced next-action queue** on Today. It combines only a currently accepted Folio one-time share, accepted Notes one-time reminder share, and non-stale qualified published language review counts. Items are bounded to seven, ordered by overdue/today/review/upcoming, escaped, and open their **original owner**. Missing sources never become zero due.
2. Snapshot-day fence: a Folio share from a different day is not presented as today's work. Notes reminders are compared against Hub's chosen timezone; items more than seven days away do not crowd Today. Source aggregate counts exceeding the bounded share show an explicitly incomplete summary.
3. Desktop navigation emphasizes **Today → Plan → Tasks → Trackers → Apps** using existing real routes. Primary mobile navigation retains **Today, Apps, Tasks**, with Plan and Trackers in More; no broken not-yet-available Knowledge/Learn route is added.
4. Today adds immediate **Quick note** next to original task capture. Both delegate to the existing Hub actions, not an alternative note writer.
5. The existing Today source details, Folio comparison, language publication checks, privacy masking, focus and local CAS/recovery are preserved.

## Non-goals and authority

- No Folio/Notes/Library/KEEP/learning database writes or copied shadow task objects.
- No guessing source deadlines, lesson progress, calendar availability or completion.
- No provider fetch initiated by the pure queue; only owner read models already authorized by current controllers may be displayed.
- No schema migration, new service, secret, backend, paid API or production deployment.
- No automatic external sync; missing/stale data remains explicitly partial.
- KEEP encrypted notes and cross-app durable links remain outside this PR.

## Qualification required before merge

- Exact-head typecheck, Vitest, build and full Quality workflow.
- New \`hub-daily-source-queue.test.ts\`: source-day/authority fences, rank, cap, escaping, incomplete results.
- New \`hub-p1-daily-driver.spec.ts\`: desktop Today + native capture + Plan route and Android-sized mobile Today/Apps/Tasks + More Plan + no overflow.
- Existing PR #166 \`hub-cross-source-planning.spec.ts\`: native scheduling and owner-approved time comparison regressions.
- Physical phone and approved owner-share journeys remain separate from emulated browser acceptance.
- CI for prior SHA does **not** qualify this branch head.

## Next product gaps after P1

1. Complete actual KEEP B3 React and encrypted vault source integration (separate owner PR #168).
2. Replace opt-in one-time shares with independently qualified provider readers only where needed; obtain real authorization/RLS/browser acceptance.
3. Verify cross-device local storage/sync restore, dirty/CAS interruption recovery, and supported offline functionality end to end.
4. Add Study OS and other learner publishers only after original owner-qualified read models exist.
5. Improve unified search, durable context relations and scoped ChatGPT actions after source ownership and permissions are proven.
