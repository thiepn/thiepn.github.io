# Hub × KEEP K4: original P29 source revision integration

Status: source implementation on existing draft PR #168, NOT release-qualified.

## Product behavior implemented

The native Hub Knowledge workspace operates on the **original KEEP B3 note** in its already-existing same-origin `KeepNotesDB`, schema version 1. It never creates a second notes database or converts a KEEP note to a Hub note. New in K4:

- Original KEEP P29 `noteRevisionService.recordRevision` coalescing and bounded 50-revision semantics are adapted into `keep-b3-revisions.ts` with the exact `portableVaultSerializer.ts` FNV-1a checksum.
- Edits take an original-record pre-edit checkpoint, then record the new content in the note's existing `revisions` array. The source note's original ID, checklist IDs, tags, attachments, preferences, and unrelated fields remain intact.
- The native source editor now lists original P29 revision entries, and an owner action can restore verified title/content with a new pre-restore checkpoint, atomic IndexedDB transaction and exact original `updatedAt` compare-and-swap.
- Incompatible legacy `revisions` arrays fail closed rather than being overwritten or silently reformatted.
- Existing one-step session undo remains available, is revision-checked and is cleared by privacy lock, account changes, source disconnect or leaving the workspace.
- The original KEEP browser database version is constrained to version 1. An upgraded owner schema is refused, not written speculatively.
- Explicit owner-session disconnect removes displayed original KEEP records from Hub's Knowledge workspace.

## Exact original source files / required runtime

Original `KEEP_B3_updated_source.zip` source paths:
- `src/pkm/workspace/NoteWorkspaceView.tsx`: 2,670 lines, 33 direct local imports plus React/Lucide and the wider PKM modules.
- `src/pkm/resilience/noteRevisionService.ts` plus `src/pkm/portableVaultSerializer.ts`: original P29 versioning logic and checksum, now implemented in Hub's original-record writer.
- `src/pkm/encryption/vaultEncryptionService.ts`, `kdf.ts`, `aesGcm.ts`: actual KEEP Argon2id/AES-GCM unlock/autolock. **NOT mounted.** Needs the original `hash-wasm` implementation and the original encrypted storage path; no imitation or weaker substitute is permitted.
- `src/services/storage.ts`: original KeepNotesDB/schema 1 notes record writer, which continues to own records.
- Hub is Astro 7 without installed React/ReactDOM or an `@astrojs/react` integration. No runnable complete KEEP React build is available in the existing Hub checkout.

**The full original React editor and encrypted-vault runtime remain NOT integrated.** This batch integrates the original P29 record history, not the whole editor. Encrypted/locked records remain inaccessible. No new React mount was claimed or attempted with missing dependencies.

## Verification status

- Original KEEP B1b/B2/B3 standalone model suites run locally: 22/22, 33/33, 48/48 PASS.
- Original KEEP `npm run lint`: FAIL due to unresolved React and other dependencies and existing diagnostics.
- Original KEEP `npm run build`: BLOCKED (vite absent).
- New committed Vitest suite `tests/unit/hub-keep-b3-revisions.test.ts`: NOT_TESTED — no executable Hub checkout with installed dependencies. Covers checksum, pre-edit checkpoint, 50-record bound, coalescing, restore, tampering and legacy revision refusal.
- New committed Chromium desktop/mobile P29 restore journeys in `tests/studio/hub-keep-native.spec.ts`: NOT_TESTED — no runnable Hub build.
- New explicit owner-schema/disconnect browser journeys: NOT_TESTED.
- All post-K1 GitHub Actions runs on the PR head: none reported at time of audit. Earlier Quality failure with four failed tests was from older head and does not qualify the new commits.
- The modified PR's mergeability remains blocked while it is behind main / contains concurrent FD1 edits. No merge or production writes performed.

## Release blockers

1. Obtain/build a proper runnable workspace with npm registry access (currently offline) and qualify the exact PR SHA.
2. Package the original KEEP B3 module graph and React UI as a versioned source workspace and integrate through an approved Astro React island (not an iframe).
3. Integrate **original** Argon2id AES-GCM unlock, auto-lock and key purge through the original KEEP storage lifecycle, not a parallel key engine.
4. Test source ownership, cross-tab CAS, private accounts, downgrade/upgrade rejection, mobile keyboards, browser close/recovery, autosave and encrypted data.
5. Reconcile concurrent FD1 work, PR base and legitimate CI failures before considering merge.

No merge, deployment, migration, new credentials, production writes or costs.
