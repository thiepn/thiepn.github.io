# THIEPN Hub Office O9 — source-owned long-document navigation

Same draft PR #175, branch feature/hub-office-o1-native-documents. Starting O8 HEAD 272477781e6bb56918b8d26bc50f04dfbbdae651, main 04618de9ffb08fc96c1b5086f10c55be3ae0256b with no intervening commits.

O8 exact-head Quality #39164600773 PASS: Astro 0 errors, 373/373 Vitest, 63 built pages, 785 Playwright pass and four skipped, full original Chromium, Firefox and WebKit Office suites including batch import/capacity and backup/ZIP. Library #39164600511 48 pass/6 fail and Reading #39164600477 42 pass/5 fail: unwanted thiepn-hub-account IndexedDB initialization prior to consent. These independent failures remain release blockers.

O9 uses the original local Markdown textarea and O1 CAS autosave: find literal case-sensitive/insensitive text, navigate all bounded matches (up to 500), and explicit confirmation before replace-all (bounded to MAX_BODY, no regex patterns or replacement metasyntax). The query and replacement exist only in UI memory; no new index/store. Find state refreshes on editing and document switches, clears on privacy/Account changes. The existing heading outline is supplemented by select-full-section and same-parent section up/down actions. Operations preserve exact original Markdown characters and nested heading blocks and queue normal original revision-checked saves; another tab's CAS conflict continues to block destructive writes, keeping unsaved Markdown export available. Movement is refused when no adjacent sibling exists; code-fenced pseudoheadings do not appear. Focus works from Preview layout.

New pure module tests cover literal matching, Unicode, regex punctuation, case handling, bounded replacements, nested heading boundaries and reversible section movement. Browser tests check editor find/replace, revision history after save, selection and moving nested sections, mobile privacy clearing.

No rich-text engine, original Office schema change, additional store, KEEP/Manuscript/StudyOS/Folio/Hub v1 data reads/writes, Account ownership changes, credentials or costs. PR stays draft; no merge, deployment, production migration/writes.
