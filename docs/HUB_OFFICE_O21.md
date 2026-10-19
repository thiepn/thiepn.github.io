# Hub Office O21 — Original citation-definition editing and preview back-references

Same original draft PR #175 on branch `feature/hub-office-o1-native-documents`; parent O20 `7e3456cc55174ae11d7c443e8903ba5aeb3cf85e`.

A selected, uniquely defined real Markdown footnote can now be edited through a bounded single-line field inside the original citation workbench. The change replaces only that original definition text; its ID, reference markers, source layout, Unicode, line endings, and original Office IndexedDB schema remain intact. Edits are applied to the existing Markdown textarea and reuse original autosave/CAS/revision history. Duplicate/missing/invalid definitions, changed source snapshot/revision, stale offset, malformed/oversized content, busy, private, and switched-owner states fail closed. An in-memory draft can be discarded; it never enters a second store.

Safe Markdown preview now offers a Back to citation action for unique, genuinely used footnotes, focusing the first actual original-source use. No untrusted HTML is executed and no independent citation index or persistence is created.

Tests cover source UTF/CRLF preservation, source snapshots and offsets, invalid content, duplicate and fenced fake definitions, overflow, reload/history, safe rendering/back-navigation, stale stage, mobile privacy and original multi-tab CAS.

Existing Account IndexedDB-before-consent and WebKit refresh failures remain independent release blockers. No migration, deploy, merge, external citation verification, production writes, paid CI manually triggered, or credential access.

Exact-head O21 qualification must be reported only after completed CI evidence.