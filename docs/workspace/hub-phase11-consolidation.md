# Hub consolidation — Phase 11 candidate (nondeploying)

## Owner-safe implementation

- Draft PR #189 `feat/connected-hub`: native Today, Calendar, Tasks, Trackers and local Knowledge become primary workflows.
- The redundant Folio/Notes cards, source queue and owner-share prompts no longer appear on default Today, local Workspace overview or Calendar; existing Hub records use original persistence, record IDs, CAS, undo and export.
- The immutable 31-entry launch manifest retains the original `notes` ID, owner, URL and alias for deep-link/backward compatibility. Active catalogue/shortcut presentation excludes that one legacy entry (30 visible published apps plus 12 independent shortcuts). Saved old pin IDs and legacy data are not rewritten or deleted.
- `/home/legacy/` explicitly preserves Folio Today, Planner, Habits, Folio Notes and standalone Notes links, and keeps the previous owner-nonce read-only summary workflow available only after deliberate navigation and consent.
- Native Hub Knowledge currently edits only Hub-local notes. **KEEP B3 Argon2id/AES-GCM React vault is not integrated or qualified**. There is **no** automatic migration from Folio, standalone Notes or KEEP and no implication that the encrypted originals can be opened in Hub.
- No legacy source files, browser storage, IndexedDB schemas, credentials or cross-provider data were mutated. Account owner changes/privacy still invalidate volatile read-only source snapshots.

## Qualification and release decision

This is a source candidate, not a production retirement. Existing read-only original Folio/Notes modules and historical routes remain accessible via the legacy recovery page. Browser/unit tests cover active-mode non-leakage, legacy consent, unchanged manifests, escaped content and mobile entrypoints. Their existence is not proof of execution.

Before merge/deployment: execute exact-head Astro/TypeScript/build, Vitest, Chromium/Firefox/WebKit across 320–1440 px, Account/private source consent, old-note/backups, saved-pin recovery, Hub Knowledge edit/reload, all category counts, and source-reader security. Resolve existing PR #168 full React/Argon2id/AES-GCM runtime and end-to-end encrypted vault qualification before calling standalone Notes a full functional replacement. Review any existing unsynced Notes/Folio content and exports independently; never clear user storage as part of retirement.

**GO/NO-GO:** NO_GO until exact-head qualification and original KEEP functionality are proven. No merge, deploy, migration, source deletion, rights approval, account grants or billing changes.
