# Hub Office O7 — selected Markdown documents in one ZIP

Same open/draft PR #175 on feature/hub-office-o1-native-documents. O6 started at b963660dd60a7b6050a2a3242e7908cb36566db0. Hub main remained 04618de9ffb08fc96c1b5086f10c55be3ae0256b, with no intervening O6 branch commits at the start of O7.

## Existing gates
O6 Quality #39162112938 was cancelled during its audit, so it was **not** an exact-head green result. O6 specialized Account, Notes, Inbox, Capture, TMS60 and cross-app workflows succeeded. Library #39162112916 was 48 pass/6 fail and Reading #39162112941 42 pass/5 fail, showing separate unwanted thiepn-hub-account IndexedDB initialization before consent. These remain release blockers, not allowed to be silenced by Office.

## O7 implementation
- Owner-only Office sidebar has per-document checkboxes, explicit "Select visible", "Clear selection", live selected count and a single "Export selected Markdown (.zip)" action. Selection can span filters; no implicit exporting. Selection is ephemeral, cleared on owner/privacy transition, never persisted.
- Export is read directly from the existing Office owner-partitioned IndexedDB, not a new writer. The export action refuses unsaved current edits, conflict, held draft and hidden identity; after the asynchronous read, it checks the same source/owner/epoch again.
- A new pure ZIP writer emits UTF-8, uncompressed ZIP entries with CRC32 and standards-compliant central directory, bounded to 24,000,000 bytes and 100 documents. Each original title is sanitized; a full original record ID suffix prevents same-title collisions and directory traversal. Unicode Markdown bodies are exported unchanged.
- A manifest records only the selected original document IDs, titles, revisions and timestamps, to help interoperability; no false owner attestation or client sync. **This is an export of saved current Markdown, not a revision-history backup.** Existing O3 JSON backup/O6 restore remains the only archive-preserving-original-history workflow.
- Unit ZIP layout, determinism, filename collision and size-limit tests; desktop/browser/Android-sized Playwright tests download the archive, verify Markdown and manifest, and test selection and privacy.

Original Office IndexedDB schema and source-owned IDs, history CAS, KEEP, Manuscript, StudyOS, Folio, Hub v1 and Account authority are unchanged. No OAuth, HTML import, duplicate editor, cloud writes, migrations or release. PR remains draft with no merge, deployment, production data changes, credentials or costs.

## Qualification
Check the latest O7 exact-head Quality job, original Astro/TypeScript/Vitest/Vite and full desktop/mobile Chromium/Firefox/WebKit regression; repair demonstrated failures on this same branch. Library/Reading Account consent faults remain release blockers.
