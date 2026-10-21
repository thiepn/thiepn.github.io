# Hub Office O4 — templates, portable HTML, print/PDF via browser

Same draft PR #175, branch feature/hub-office-o1-native-documents; original O3 HEAD ea20ac4f59234b441397facc9cbe164592a9a24a, main 04618de9ffb08fc96c1b5086f10c55be3ae0256b. No intervening commits.

O3 Quality #39157014432: 0 Astro errors, 354/354 Vitest, Vite/Astro 63 pages, 739 browser PASS, 1 WebKit Account tab reconnection FAIL. All O3 Office Chromium/Firefox/WebKit browser acceptance PASS. Library #39157014405: 48 PASS, 6 FAIL; Reading #39157014358: 42 PASS, 5 FAIL; both fail due unrelated thiepn-hub-account IndexedDB initialization without consent. Preserve their assertions.

O4 features:
- Local, generic, fixed Markdown templates: blank, meeting notes, project brief, structured report, study notes. Placeholder text is not user content. The original Office schema-v1 document is created with a single atomic IndexedDB add; no additional write/scheduler or migration.
- Portable standalone HTML created with the existing safe Markdown DOM renderer, escaping user-supplied HTML, with deny-by-default Content-Security-Policy. No raw HTML interpretation, scripts, network or external assets.
- Paper-only print sheet built from current editor content. Browser Print supports selecting Save as PDF; Office does not generate PDF bytes itself. Privacy masking clears print sheet and disables all export controls.
- Existing Markdown export, JSON backup, history, CAS, owners, KEEP/Manuscript/StudyOS/Folio/Hub storage untouched.

No merge, deployment, production data, credentials, provider writes, migration or costs. Qualify new O4 exact HEAD with npm ci, Astro, Vitest, Vite and Chromium/Firefox/WebKit desktop/mobile. Retain unrelated Account safety gates.
