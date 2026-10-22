# Hub Office O13 — original native revision timeline

Same open draft PR #175 and branch feature/hub-office-o1-native-documents from O12 HEAD da5bca1e910ce72ec9005871fef14be4601cd3c9, main 04618de9ffb08fc96c1b5086f10c55be3ae0256b. No intervening commits at start.

O12 Quality #39173546417 was cancelled during WebKit after Astro typecheck 0 errors, 394/394 Vitest tests, 63-page build and all O12 Office tests completed successfully in Chromium and Firefox; O12 full WebKit coverage was NOT verified. Library #39173546305 48 PASS/6 FAIL and Reading #39173546527 42 PASS/5 FAIL, both with unrelated thiepn-hub-account IndexedDB creation prior to consent. Do not weaken those tests.

O13 implements a native accessible revision timeline derived exclusively from the original OfficeDocument.history and current persisted revision. Newest-first entries show the authentic revision number, saved title, timestamp, line/character counts, and changed-span to next revision (not a fabricated exact hunk count). The summary clearly states 12-snapshot history retention, and never invents earlier truncated revisions. Native keyboard-usable buttons select a snapshot; preview shows only bounded 45 lines/5000 characters using inert DOM textContent, not raw HTML. Original source is untouched and not stored in a new engine.

An inspected historical snapshot can invoke the existing history select, Compare action and Restore selected with original confirmation and CAS save. New timeline controls never write document records, bypass Account ownership or restore silently. A selected preview is fenced to original Office scope, ID and revision. Privacy/Account changes, document switching and authoritative revision updates clear staged historical DOM and disable actions.

New pure unit tests cover order, real revision retention, bounded Unicode/inert previews. Browser acceptance covers exact revision metadata, safe HTML-as-text, comparison without write, original restore confirm, new-document clearing and mobile privacy. Original Office schema, UUIDs, history and CAS, KEEP, Manuscript, StudyOS, Folio and Hub v1 sources stay intact.

No merge, deployment, production writes, migrations, credentials or costs. Exact-head Quality and independent Account consent gates remain mandatory for release.