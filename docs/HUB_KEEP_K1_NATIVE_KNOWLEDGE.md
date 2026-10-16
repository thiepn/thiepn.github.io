# Hub KEEP native integration K1

- Actual Hub Knowledge route /home/knowledge/ uses the existing persistent Hub WorkspaceShell, native note writer and account-scoped WorkspaceStore CAS.
- Editing/creating notes and creating tasks with an explicit stable original note reference work inside Hub, without an iframe or external application navigation.
- KEEP B3 source ZIP inspected: its original KeepNotesDB and encryption are independent. **The full KEEP B3 editor is not imported, mounted or synchronized in K1.** This is an honest incremental integration, not a complete KEEP port.
- KEEP B3 inspired the unique-title and stable-ID Wikilink resolution; current K1 operates ONLY on the native Hub notes and tasks without duplicate stores.
- Folio/Vault/Notes retain original ownership and no records are copied, no encryption is bypassed, and no migrations or provider writes are attempted.
- Later batch requires the KEEP repository/package and real owner-authorized adapters before full KEEP note editing in Hub.
- User input saved by existing Hub writer and validated by original parseState; encrypted KEEP records, cross-app provider records and remote calendar writes are not writable from this route.

## K1b — Real KEEP B3 source integration (2026-10-16)
- `src/lib/workspace/keep-b3-source.ts` adapts KEEP B3 original `src/pkm/tasks/taskParser.ts`, `src/pkm/planning/planningNoteClassifier.ts`, `src/pkm/planning/projectTaskEngine.ts` to the canonical Hub `Note.body` shape; original Hub record IDs and existing CAS persistence stay authoritative. Markdown task extraction, explicit due dates, priority, heading, anchors, and frontmatter project classification are genuine source-derived behavior.
- Project list, progress (only when `progress: tasks`), deterministic next action, note-local checkboxes, and a reviewed project note template are available in native Hub Knowledge. Checkbox changes require exact source note/line/revision and use the original Hub writer; no task record is created for a Markdown checkbox. Stale/ambiguous lines reject modification.
- `src/lib/workspace/keep-b3-owner-refs.ts` ports KEEP B3's original `src/pkm/integration/ownerResourceRefs.ts` identity contract. Valid owner URI references are visible inside the note but never grant provider read/write access or copy external records.
- Old Home/Apps/Tasks mobile navigation restored after the original exact-head Quality regression. Knowledge is reachable from the original persistent sidebar / More navigation.
- Tests: `hub-keep-b3-source.test.ts`, `hub-keep-owner-refs.test.ts`, expanded `hub-keep-native.spec.ts` desktop/mobile. Qualification requires the exact new commit build/CI and browser results; no historic successful CI is counted as exact-head success.

## Still missing
The actual KEEP B3 React editor, attachments, encrypted KeepNotesDB, rich view engines, real Folio/Vault/Notes adapters, and source-owned calendar/habits integration are **not** imported. Moving or binding those records requires the original KEEP runtime/package, original encryption unlock controls, backup/recovery and owner approval. This PR does not claim final unified KEEP functionality or external synchronization.


## K3: Original editor/runtime dependency gate and reversible KEEP write receipts

Audit of the immutable local KEEP B3 source archive `KEEP_B3_updated_source.zip`:
- Original `src/pkm/workspace/NoteWorkspaceView.tsx`: 2,670 lines, 101,150 bytes; SHA-256 starts `becbf970ce957bf3c645e2e4`. It has 33 direct relative imports and a broad reachable dependency graph across the full PKM codebase, media, export, editor, workspace provider and UI. Copying just this TSX into Hub would be an inoperable imitation.
- Original vault engine `src/pkm/encryption/vaultEncryptionService.ts` (SHA-256 starts `5433c877c1ba650b3669d7e8`) imports `kdf.ts`, `aesGcm.ts`, `cryptoTypes.ts` and vault purge logic; Argon2id requires `hash-wasm` and the React editor requires `react`, `react-dom`, `lucide-react` and transitive UI dependencies. Hub is Astro without a qualified React integration/dependency lock.
- Original `src/services/storage.ts` confirms `KeepNotesDB` version 1 and `notes` store and encryption gate. The current same-origin unencrypted-only adapter keeps its own K2 explicit source consent. It **does not** mount the original React component or unlock encrypted records.

Implemented in the K3 incremental recovery batch:
- Source-backed one-step undo receipts returned from original-KEEP note edit and checklist operations, retained **only in RAM**. Undo uses the full unmodified previous note, rejects any intervening source revision and writes back to the original KEEP store; no duplicated backup store, migration or invented task IDs.
- Hub owner-mode switch, route leave, privacy hide, identity reset and vault header changes clear in-memory KEEP source snapshots and undo receipts. A returning user must explicitly reconnect.
- The original `NoteWorkspaceView` mounting remains blocked until an **upstream versioned KEEP source package** can bring its dependency closure and the original passphrase/auto-lock lifecycle into a buildable Hub React island, with original `vaultEncryptionService` wired to storage, and independent browser recovery/lock tests.

### Required qualification (not yet passed on K3)
A full exact-head `npm ci`, `astro check`, `vite`/Astro build, focused Vitest and actual Chromium desktop/mobile tests must pass before this source path is qualified. Earlier green specialized workflows and the previous `Quality` failure are evidence from **older commits**, never from this final SHA. Keep this PR draft and unmerged.
