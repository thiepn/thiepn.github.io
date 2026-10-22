# THIEPN Hub Office O2 — Markdown authoring
Same draft PR #175 and branch feature/hub-office-o1-native-documents, not deployed.

## O1 acceptance repairs
- CI on 90c1b193 had 726 passed/5 failed/4 skipped in Quality, with 3 Office failures (mobile Account selector aimed at hidden desktop sidebar; concurrent WebKit Save click racing 600ms autosave). Update mobile test to use the real topbar Account button; treat the autosave CAS receipt as the conflict outcome rather than clicking disabled Save. Existing WebKit Account sync timeout remains independent.
- Reading-pilot and Library failures report unrelated thiepn-hub-account DB; do not relax no-unapproved-reading-store tests or modify Account SDK outside Office scope.

## O2 delivered
- Native editing toolbar: heading, bold, italic, bullet/number list, quote, code, link and Markdown table.
- Pure selection transformer, Ctrl/Cmd+B and Ctrl/Cmd+I shortcuts.
- Write / Split / Preview presentation modes, including responsive layouts.
- Live DOM-constructed Markdown preview for headings, emphasis, lists, code fences, quotes, tables and http(s) links. Raw HTML is plain text; no innerHTML or script execution. No network resources fetched for preview.
- Original O1 Office record schema, IDB name and owner namespaces unchanged. No new writer, migrations, credentials, provider reads, cloud sync, Keeper/Manuscript/Hub/Folio/StudyOS mutations.
- Focused Vitest and Playwright scenarios, not yet a full editor suite.

## Remaining qualification
Exact-head npm ci, Astro typecheck, Vitest, Vite build, Playwright desktop/mobile cross-browser. Full source library and external Manuscript migration remain intentionally absent. Do not merge or deploy without qualification.
