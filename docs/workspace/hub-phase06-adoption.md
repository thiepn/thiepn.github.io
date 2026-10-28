# THIEPN Hub Phase 06 — Focus work continuity

Starting draft PR #189 head `4931a015827b20d8ebcc847717b7942d550f1979`, original source #166 `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## True prior evidence
- Quality #40080382518: original release, Calendar and Account cross-tab smoke PASS, Astro/TypeScript PASS, 83 Vitest files / 589 tests PASS. Full Playwright: 1208 PASS, 6 FAIL, 4 SKIP. Failures: returning from Apps to explicit Workspace did not restore its view; post-focus Account discovery assertion looked for an input hidden by the intended Today owner-switch view. Both reproduced across Chromium, Firefox and WebKit.
- Library #40080382517 PASS across original device/browser owner qualification. Reading #40080382540 PASS.
- No evidence of the earlier Account refresh race in this run.

## Integration changes
- Accept `mode=workspace` as a public presentation route during initial query sanitization and internal navigation, while `/` remains Today and external IDs/data stay out of query params.
- Retain the original Account test's guest IndexedDB persisted draft and new owner's empty draft assertion, now entering Workspace explicitly after identity switch instead of assuming a hidden widget must be visible. Do not relax either.
- Adopt source-only Focus work pad `focus-work-handoff`, bound to the original selected unfinished Hub task. Independent task pads in a RAM Map, no IndexedDB/cloud/owner writes, clearing on identity change and privacy hold. Enforce field length, HTML escaping and no automatic score/completion/time logging.
- Existing Focus timer and task selection are authoritative. Review-as-note passes a seed into the original Hub Notes editor, saves only on user submission. Plan task and open task context use original controllers. Explicit discard clears only current scratch, not notes or tasks.
- Add original source unit and mobile browser journey tests, functional styling and update canonical ownership inventory.
- No new PR, schema migration, additional writer, OAuth, KEEP vault edit, deployment, merge or production data modification.

## Phase 07
Review exact-head Quality, Library, Reading and Account logs. Fix demonstrated Hub-only regressions without weakening owner-isolation tests. Continue missing real functionality from #166 (such as a source-owned weekly review) only after checking present dependencies; no verification-only phases.
