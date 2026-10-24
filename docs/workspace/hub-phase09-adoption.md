# THIEPN Hub Phase 09 — original Hub record pins with safe schema-v1 references

Parent draft PR #189 at `545bd7a01c1523af7cba9e5fdfe1a2229346c739`, original PR #166 at `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Genuine inherited runner evidence
- Library #40102049054: PASS, actual H16 Library owner and device consent in Chromium/Firefox/WebKit.
- Reading #40102048871: PASS, genuine owner pilot browser check.
- Quality #40102048965: still IN PROGRESS in `npm run audit:studio` when examined. Original release, registry, Calendar startup and Account cross-tab smoke completed successfully. Do not declare full Vitest or Playwright result until the exact-head job completes. Phase 07 baseline all Notes-reminder and Focus mobile three-browser cases passed; prior Chromium Account refresh race remains its own owner and was not modified.

## Implementation
- Original #166 `record-pinboard`: selectively pin up to 20 original Hub tasks, notes, events or trackers from the current workspace; store only `kind:ID` within existing typeVersion-1 Workspace widget metadata and its CAS/undo writer.
- Today resolves pinned work and a customizable Workspace widget displays all current pins with original actions, explicit unpin/reorder, source-missing continuity and no copied record content. Original user-task, calendar-event, note, tracker editors remain authoritative.
- Source-grounded `confirmed-hub-backlinks`: task/note context opens confirmed decision/outcome relationships only when an original referenced record still exists. No inferred keyword links or external app copies.
- `widget-metadata-safety`: block silently deleting a pinned reference, task-event relation, decision or outcome through widget removal, layout saves or 'Replace preset'. Workspace duplication and recovered presentation layouts remove copied record metadata rather than cloning original workspace owners. The originals remain untouched.
- `additive-import-references`: atomically rebase imported original IDs by source kind and every typed widget reference. Handle colliding task/note/event/tracker legacy IDs without cross-linking. Reject unsupported future widget metadata rather than loading ambiguous references.
- Reuses original WorkspaceStore/CAS, original native actions and exact source IDs. No new database, migration, second task/Notes/calendar writer, inferred availability, OAuth grant, publication or production data write.
- Original source unit/browsers for metadata, pinboard, collision-safe imports and confirmed backlinks are added unchanged except for removing decorative filler.

## Phase 10 qualification
Inspect genuine final exact-head TypeScript/Astro, Vitest and Chromium/Firefox/WebKit before further changes. Repair demonstrated Hub-owned issues, especially stale guest mode or interrupted layout recovery if actually reproduced, without changing the Account rotating refresh contract or original privacy checks.
