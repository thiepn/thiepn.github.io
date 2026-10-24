# THIEPN Hub Phase 10 — original Hub note reader

Same draft PR #189 on `feat/connected-hub`, Phase 09 parent `74bfdb969967d5adbc411c64aff18ea2c851eee4`. Reference implementation `personal-index-knowledge.ts` from original #166 exact `4c2280294edf3760948fa44c1a853100c3f03c6c`.

## Baseline
Phase 09 exact-head Library #40106262957 PASS and Reading #40106262933 PASS, including genuine 3-engine opt-in. Quality #40106262919 still executing full studio audit at inspection: original inventory, Calendar and Account gates completed. Thus no claim of a final Chromium/Firefox/WebKit pass.

## Implementation
- `/home/knowledge/` is a genuinely existing **native Hub-local note browser**. It is not the encrypted KEEP vault from PR #168, which remains separate, draft-only and unmerged.
- Only `WorkspaceState.notes` owned by the currently selected original Hub local owner are projected: bounded 60 results per local search, 100-character query, stable original IDs, full escaped body in a resizable responsive reader.
- Search query and selected note are tab-only, never embedded in the URL, Account identity, logs, exports or external providers. Identity and privacy transitions erase them.
- Search matching and original note preview use the source-authored pure projector, with no automatic link assertions. Related task rows are suggestions based on local Hub task context, opening the original Hub task dialog; confirmed decision/outcome relationships remain separate.
- Editing, creating, recovering, CAS and undo use existing original `editNote`/WorkspaceStore. No new note engine, duplicate storage, imported Notes/Folio text, privileged KEEP APIs or OAuth.
- Desktop navigation and mobile More expose Knowledge without replacing Today or Apps 31+12 or the independent Documents reader. Browser back/forward use original native Hub navigation.
- Source unit tests and responsive 320/390/768/1440 browser tests are adapted to the new real route, retaining long note, XSS, edit identity persistence, privacy masking and ID-reuse assertions.

## Gates
Exact-head Astro/TypeScript, Vitest, Chrome/Firefox/WebKit are required before release; owner account and device acceptance remains independent. No new PR, merge, live migration, new grant, deployment or production data write.

## Phase 11
Inspect genuine final exact-head CI and demonstrated Hub-owned defects. Proceed with consolidation of native context/search and clean up remaining original source contracts; do not misrepresent original KEEP ownership or duplicate engines.
