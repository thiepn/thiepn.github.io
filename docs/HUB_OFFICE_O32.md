# Office O32 — External Markdown link workbench

Original draft PR #175, same feature/hub-office-o1-native-documents branch, exact O31 parent feeb6b8682aa3ee60301d0c1df013b2fbf7d6f8d. Main is independently diverged by one commit.

O32 inventories genuine external inline Markdown links in the original source, grouping exact URL targets and original line/offset sites. It distinguishes HTTP and HTTPS transport schemes and offers actual source navigation with bounded pagination. This does not fetch URLs, check that they work, judge source quality or verify citation authority. Internal #office-ref links and footnotes remain in their earlier Office owners. Scanner shares the original inert renderer's inline tokens and existing O19 source code-fence visitor; no duplicate renderer/parser.

Users may choose an authentic target and provide a new HTTPS destination. All genuine occurrences of that exact target are changed in an explicit read-only whole-source preview, preserving labels, other links, code, plain URLs, Unicode, CRLF and all unrelated authored text. Cancel never saves. Confirm recomputes and verifies the preview against the same original source before dispatching input to the original Markdown textarea. Normal Office device CAS/autosave, IDs and immutable retained revision history are the only persistence writers.

The workbench stores review and preview only in memory. It guards owner scope, original document ID, saved revision, exact source, title, current tab, dirty/busy/conflict and privacy status. Changes to source, document or owner and privacy masking erase staged review data. Unsupported lengths >200k body, >240 real uses, >80 distinct targets and >2048-character targets fail closed instead of truncating.

Focused Vitest covers exact URL-site offsets, inline/fenced pseudo-links, Unicode/CRLF, grouping, safe HTTPS substitution, no-op/malformed URLs, size and count limits. Genuine Playwright Chromium/Firefox/WebKit desktop and 390px mobile cases cover source focus, full preview/cancel, saved reload and revision history, original peer CAS and privacy clearing. Actual PASS requires exact-head CI, not static source inspection.

O31 Quality #39394250158: completed SUCCESS, 488 Vitest PASS, 1,070 browser PASS and four skipped. O31 Library #39394250128 and Reading #39394250291: completed FAIL due to independent Account IndexedDB-before-consent regressions. Historic WebKit Account token refresh remains a separate blocker. No merge, deployment, migration, production writes, credentials, paid CI trigger or costs.
