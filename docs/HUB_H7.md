# THIEPN HUB H7 — Scale to 100–250 apps

H7 qualifies public catalogue growth, pin discovery and bounded provider selection. The production membership remains the reviewed 27 apps; synthetic apps are confined to tests. H2 identity and H3/H5 private-provider gates remain unchanged. This branch is stacked on H6 and is not deployed.

## Scale blockers and resulting behavior

| Area | Previous constraint | H7 behavior |
|---|---|---|
| Release validation | Hardcoded exactly 27 entries/counts | Declared reviewed count from 27 through 250; computed category counts must match |
| Baseline | Fixed original roster | Original 27 IDs/order remain the prefix; exclusions and category taxonomy remain enforced |
| Onboarding | Adding an entry failed the studio gate | Append reviewed entries with contiguous unique order, public metadata and HTTPS launch URL |
| Pin discovery | All choices required manual scanning | Local title filter with zero-result status; filtering preserves checked pins and order |
| International search | ASCII-only normalization discarded non-Latin names | Unicode letters/numbers participate in existing matching and ranking |
| Long directories | Every card/row laid out eagerly | Progressive `content-visibility:auto` with intrinsic-size estimates; ordinary rendering fallback |
| Private selection | Registry size could be mistaken for request fan-out | Explicit requested order, maximum six selected candidates and reasons for omitted sources |

The release validator continues to reject duplicate slug/order, unknown category/badge, missing project/preview metadata, unavailable/unlisted projects, insecure launch URL, count mismatch, noncontiguous order and explicitly excluded apps. Existing baseline/category minimums stay protected. Declared expected category totals must match actual membership; future apps are not added merely by changing expectedCount. The separate genuine-media gate still requires a checked capture for every reviewed app.

H7 removes fixed-count assumptions from current Home/Search browser assertions while preserving today's source-backed expected count. The 27-app baseline is not silently populated with placeholders, cloned products or unreleased apps. Arbitrary reordering of the original baseline is outside this append-only expansion and requires a separate reviewed change.

## Onboarding procedure

1. Register a real project through the existing catalogue tooling; keep it excluded/on hold until its launch and basic workflow are reviewed.
2. Add its source capture and media manifest entry using the current media pipeline. Do not use a synthetic scale card as production evidence.
3. Append its Hub record with the next unique order, one existing category, concise description and supported badge. Update expectedCount and exact expectedCategoryCounts.
4. Add public task aliases when useful; preserve stable slugs and canonical HTTPS launch URLs. Run generated-output, catalogue/media/link syntax, typecheck/build and the release checks.
5. Private integration is separate: certify owner capabilities, grant scopes and transport before registering/enabling a provider. Catalogue membership is not permission.

No bespoke Home module, Account schema change or custom page is required merely to list an app. Pins remain bounded at twelve; the six core daily modules stay finite. A 250-app directory does not become a 250-card daily dashboard. Owner workflows and public Actions remain individually reviewed capabilities.

## Pin filtering and public search

Customize gains a labeled Find an app to pin search field, exposed only after enhancement initializes. It matches title words with bounded 200-character input and case/accent normalization, including non-Latin text. Its polite count reports how many choices are visible. Zero matches does not clear any pin, hide the separate Pin order controls or rewrite preferences. Selected apps can be filtered out without being unselected.

Opening Customize resets the filter; it does not persist the query into a guest/account namespace or a URL. The existing account-isolated preference envelope, storage failure handling, twelve-pin cap and keyboard reorder behavior are retained. Native search-input Escape may clear its query first; Done and dialog Escape remain the explicit modal recovery controls. With JavaScript disabled, existing public app links remain available.

Search normalization now preserves Unicode letters and numbers after the existing accent/case transformation. Korean/Japanese fixtures verify useful results instead of treating their queries as empty. This is script preservation, not certified linguistic segmentation, transliteration or multilingual semantic search. The shared ranking weights and direct launcher semantics remain unchanged.

Long public card and search-row lists use CSS auto containment with approximate remembered intrinsic sizes. Cards remain in the DOM, and no virtual list replaces canonical links or find-in-page/keyboard access. At unsupported browsers the normal complete list renders. Intrinsic estimates are not exact card-height or field CLS guarantees, especially under enlarged text; browser/reflow and focus qualification remains necessary. Hidden filter rows retain their existing outer hidden behavior.

## Bounded provider selection

`selectProviders` consumes public capability descriptors and an explicit requested priority order. It accepts at most 250 registry/request entries, requires unique valid provider IDs and limits selected candidates to 1–6. Duplicate requested IDs collapse to one contribution. Disabled, unknown, unsupported and over-budget candidates appear in a skipped list with their respective reasons. `complete` is false whenever any requested source is omitted; omitted sources cannot be reported as searched or empty.

Selection performs no private read, query ranking, grant issuance or identity inference. It cannot discover every future provider or broaden the three current pilot provider types. A future caller must choose the bounded surface/requested set, resolve selected IDs to certified adapters and apply H3 authorization again at dispatch. H3's three concurrent requests and two-second per-request deadline remain independent safeguards. The generic selector is not wired into a private page controller because no production private provider is certified yet.

## H6 cross-engine recovery correction

H6 CI ran 519 checks: 518 passed, and Firefox failed guide restoration after Back following reload. Local history tracing reproduced a duplicate entry introduced by Playwright's Firefox reload command, including with native links. The test now invokes browser-native `location.reload()` and retains the same previous-step assertion after Back. H7 also avoids unconditional history replacement during render/traversal and refreshes guide position on pageshow as well as popstate. Canonical query cleanup runs only on initial entry when the URL differs. These corrections do not retroactively mark the H6 PR's failed check successful.

## Verification

Synthetic metadata never becomes a deployed app record. `test:hub-scale` builds isolated copies of the release-validator input at 100/250 entries, checks successful expansion and duplicate rejection, and removes the temporary fixtures. CI's retained scale gate now runs it alongside the existing benchmark and automation fixture.

| Check | Local result |
|---|---|
| Unit suite | 148 tests passed across 23 files |
| Typecheck | Zero errors/warnings; seven existing hints |
| Generated output, release/media/link syntax validation and build | Passed; 57 pages built; current 27 genuine captures verified |
| Isolated 100/250 registries | Accepted valid expansion; duplicate records rejected at both sizes |
| Focused Chromium and Firefox | Nine checks passed in each engine: two scale fixtures and seven workflow checks |
| Broader Chromium suite before final history-test adjustment | 172 passed; one Byte external-image check failed because remote images did not load locally |
| Existing 250-artifact benchmark | Search average 3.718 ms / p95 5.164 ms; archive p95 0.091 ms |
| Built payload budgets | Passed; Home 30.1 KB gzip HTML/JS/CSS combined, excluding media; public Search index 6.6 KB gzip |

Firefox's default local content sandbox failed under this container's process restrictions. Focused local verification used sandbox-disabling environment variables only for the browser test process; repository CI retains its normal browser setup. Local timings are unthrottled synthetic measurements, not field Web Vitals. The broader suite is not reported as fully green; remote Byte media and full cross-engine CI remain release checks.

Browser fixtures replace only test responses with public Home cards and pin choices. They exercise the actual Home/category/pin controller at 100/250 entries, filtering, pin persistence within the visit, keyboard modal recovery, reflow and axe. H1's existing 100/250 Search response fixtures continue to test direct launch and keyboard access. These fixtures do not certify 250 real screenshots, private owner APIs or a full production 250-app content build.

Primary reference consulted 2026-10-02: [MDN content-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/content-visibility). Its distinction between auto containment and hidden content informed the progressive rendering choice; actual browser access is still checked. Provider selection, append-only admission and finite daily composition are THIEPN design decisions.

## Remaining qualification and next phase

H7 changes public scaling mechanics, not the current app count or private backend support. Production onboarding still needs genuine app evidence/media; live private federation and file transfers still need owner certification. Full 250-app media/network payload, physical low-end devices, field Web Vitals and authenticated private fleet behavior are not certified by synthetic local fixtures.

Next: **H8 — Production qualification**. Reconcile the stacked release, resolve CI and remaining identity/provider gates, qualify actual browser/device flows and prepare a reviewable deployment candidate. Do not enable unimplemented owner endpoints to satisfy a release checklist.
