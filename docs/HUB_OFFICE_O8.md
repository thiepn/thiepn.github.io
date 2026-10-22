# Hub Office O8 — safe multi-file Markdown import

Source of truth: the same open draft PR #175, original Office schema v1 on branch feature/hub-office-o1-native-documents; starting verified O7 SHA 697987634e46b78f403ee6e0c5c98619c4c7b056. Hub main 04618de9ffb08fc96c1b5086f10c55be3ae0256b with no intervening commits.

## Feature
User selects between 1 and 20 local Markdown files, at most 256000 bytes per file and 4000000 bytes total. Preflight validates all files as strict UTF-8, rejects binary controls or HTML files masquerading as Markdown, uses original 200000-character body limit, and holds all validated content only in memory. It renders bounded text previews with the original HTML-inert DOM Markdown renderer, editable per-file titles, names and counts. Nothing is written until the explicit confirm; cancel clears staged content.

After original unsaved work passes the original CAS save path, the original OfficeDeviceStore creates all documents in one existing owner-scoped IndexedDB readwrite transaction. The transaction rechecks current document capacity, validates all new schema-v1 records, generates original-style unique UUIDs and add()s only new keys. Duplicate user-facing titles are allowed but original IDs never collide intentionally; original records are neither overwritten nor migrated. Failure of any insertion aborts the whole batch, including a concurrent-tab destination capacity increase. On Account identity/privacy changes the pending preview is discarded and late file reads are ignored. Does not ingest ZIP, JSON or HTML archives.

Unit tests cover preflight, Unicode, malicious mixtures and 4MB boundaries. Original Playwright desktop/mobile includes cancellation and reload, duplicate titles and distinct IDs, rejected mixed batches, concurrent 99-record capacity rollback, privacy clearing. These are acceptance gates, not evidence of a pass until executed.

## Release boundaries
O7 exact-head Quality #39163562511 had not completed at O8 start. Library #39163562450 and Reading #39163562427 still fail unrelated unwanted Account `thiepn-hub-account` IndexedDB initialization (48 passed/6 failed, 42 passed/5 failed). Their privacy assertions are unchanged and remain blockers. No live deployment, merge, migrations, credentials, production writes or spending. KEEP, Manuscript, StudyOS, Folio, Hub v1 and Account sources remain untouched. Original Office single-file import and backup/restore continue unchanged.
