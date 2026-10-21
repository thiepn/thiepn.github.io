# Hub Office O14 — history search and saved revision comparison

Same open draft PR #175 and branch feature/hub-office-o1-native-documents from verified O13 HEAD d8ea481e14021c17ee35a645bdf00345ee0edd72; main unchanged at 04618de9ffb08fc96c1b5086f10c55be3ae0256b, no intervening commits.

O13 Quality #39174897733 cancelled before finishing browser tests; completed source typecheck, build, 398/398 Vitest passed. Library #39174897749 showed 48 pass/6 fail and Reading #39174897729 42 pass/5 fail, both independent thiepn-hub-account IndexedDB initialization-before-consent regressions. No weakened privacy assertions or all-green O13 claim.

O14 adds literal, bounded 120-character search of the ORIGINAL retained Office revisions (titles and saved Markdown) with case-sensitivity switch and 160-character source snippet, rendered solely through inert DOM textContent. Search results use original revision IDs newest-first and do not create a secondary index, store or cross-owner data authority. Query is volatile, private UI state; identity/privacy transitions clear it.

O14 allows comparison of TWO authentic saved retained revisions, not only historical vs latest. A user selects a baseline in the timeline and another saved revision; the readonly panel uses existing bounded revisionHunks (800 detailed lines, 60 original hunk cap, 8-line snippets) and displays up to 40 inert hunk pairs, honest truncation and summary mode for large Markdown. No writer or automatic restoration. Original CAS, immutable history, 12-snapshot retention and recovery confirmation remain unchanged.

Unit tests validate source/title/case/Unicode matches, literal HTML snippets, immutable arbitrary revision pairing, pruned-revision rejection and large-document fallback. Browser tests cover timeline filtering, unchanged source, cross-historical pairing, restoration of view after reload and mobile privacy clearing. Execute at exact head; do not call unrun tests PASS.

No merge, deployment, migrations, production writes, credentials, costs or KEEP, Manuscript, StudyOS, Folio, Hub v1 and Account source writes. Same draft only.