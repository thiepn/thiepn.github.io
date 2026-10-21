# Hub Office O3 — source-owned library and recovery, draft PR #175

Based on qualified O2 head 1c2bbdb631ba35d37709dcccde1d962bc6fbcebd.
- Verified O2 exact-head Quality #39154955195: zero type errors, 349 Vitest passes, Astro/Vite 63-page build, 734 Playwright passes (4 skipped), plus owner release gates successful. Chromium/Firefox/WebKit Office suites passed.
- O2 Library #39154955157 and reading-pilot #39154955190 still fail on the existing \`thiepn-hub-account\` IndexedDB opening without prior consent; unrelated Account authority, do not relax assertions.

O3 adds native local-only search over current owner's titles/bodies, recent-first or title-alphabetical organization, display of recent/earlier groups and matching excerpts, keyboard-focusable Markdown heading outline that ignores fenced examples, and manual JSON recovery export of all *saved* documents, original IDs and full capped revision histories. This does not add databases or modify records; all projection UI is in memory and disappears behind the same Hub privacy/identity gate. Query is not put in URL or external network. No automatic backup/upload, importer, sync, cloud or deletion; archive export has a safe bounded size limit and explicitly refuses when current draft is unsaved/conflicted to avoid implying data is complete. Unsaved active draft remains exportable by the existing Markdown exporter; reconnection and CAS recovery stay unchanged.

Native source ownership: \`thiepn-hub-office-v1\` IndexedDB \`documents\` object store and original document schema v1 unchanged. No KEEP/Manuscript/StudyOS/Folio/Hub v1 storage opened or migrated by Office O3.

Exact-head gates: typecheck/Vitest/Vite, Chromium+mobile and existing Account/Library/reading pilot; source-verified exceptions must remain release blockers, not be suppressed. Same draft, no merge, production writes, credentials, costs or deployments.
