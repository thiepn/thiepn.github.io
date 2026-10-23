# Phase 02 — Today and native planning

Parent: `1f9e8f0b995506a7ae096b51aaf796cf0a233abd`; reviewed source PR #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Adopted
- Make native Today the default while preserving explicit Focus/Workspace routes and existing account/guest storage.
- Show a bounded, read-only Folio/Notes/language next-action queue from consented owner summaries in the current tab. Unavailable or stale sources do not become zero; actions open their original owners.
- Compare only the explicitly shared Folio timed events against existing Hub events. No claiming free time or synchronizing Folio data.
- Reuse original 3/5/7-day distribution of up to 25 selected Hub tasks. Preview every changed date and load count. Require explicit confirmation and existing detached native `mutate`, `parseState`, `WorkspaceStore` CAS and undo. Revalidate original snapshots, owner/epoch, source consent if included, and storage safety. Task due dates are not time blocks.
- Preserve existing Focus engine, weekly carryover, Calendar, Documents, source app rights, IDs, privacy and restore behavior.
- Desktop labels Today and Plan; mobile primary Today/Apps/Tasks with Plan, Trackers, Documents in More.

## Gates
Run original Vitest source scenarios plus full TypeScript/Astro/three-engine Playwright automatically. Account/Library/Reading and StudyOS edge checks must still pass. Real account sessions, physical mobile devices and exact production releases have separate acceptance gates. Do not merge/deploy/migrate/approve provider grants here.

## Next
Phase 03: reconcile remaining P0/P1 user-visible task/knowledge handoffs from PR #166 only after the selected native routes and original encrypted KEEP requirements can be independently verified.
