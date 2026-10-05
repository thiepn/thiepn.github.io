# H22 — Pilot Feedback & Reading UX Refinement

H21's ten PR checks passed and its activation PR was merged before this phase. No participant feedback has been supplied. H22 therefore implements findings from a direct flow review; synthetic browser progress is not claimed as real pilot usage.

## Friction addressed

- Setup previously relied on status text. A three-step guide now explains joining, Library sharing and connection. It explicitly warns that opening Library or switching tabs ends the session, so the return flow is predictable.
- A title link did not clearly signal resume. Pilot reading cards now have a named Continue reading action that preserves the owner resource, edition and release.
- Current and furthest percentages were plain text. A native accessible progress bar now visualizes the current position; the two percentages remain separate so rereading is not mistaken for lost progress.
- An empty, consented result offered no next step. It now provides Browse Library and explains EPUB/PDF, this-browser scope and how to create eligible progress. Missing consent and unavailable storage do not show this successful-empty state.

Cards reuse Hub's colors, borders and buttons, reflow at 320 pixels, support keyboard navigation and forced colors, and add no animation. Titles and controls are erased with the existing snapshot. Search, cloud access, writes, accounts and mobile cohort membership are unchanged.

## Acceptance and actual feedback

The dedicated browser suite now contains 23 cases: seven per desktop engine plus Android and iPad exclusion. It checks the actual owner bridge, explicit actions, current-position semantics, connected-card accessibility, narrow reflow, genuine empty progress, and clearing alongside H21's consent and pause protections. Actual participant acceptance remains open.

For volunteered feedback, record the task attempted, browser/device, expected result, observed result and whether Library sharing was enabled. Do not request book titles, reading history or account tokens to diagnose general setup friction. No telemetry, report transmission or automatic private-data collection is introduced.

Next proposed phase: **H23 — Mobile Reading Pilot & Device Acceptance**. Keep the mobile cohort excluded until the reading flow is qualified for those devices; prioritize usable reading over additional release machinery.
