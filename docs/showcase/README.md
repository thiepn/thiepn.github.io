# Showcase refinement and Tiny Tools

The homepage presents work before the catalogue. Tiny Tools is a dedicated second showcase and the second item in selected Work; its permanent record is T-006 at `/project/tiny-tools/` and its application remains at `/tools/`.

## Editing

`src/data/showcase.json` owns selected order, project summaries, real media, game-preview descriptors and four direct Tiny Tools task links. `src/data/build-notes.json` holds source-linked technical notes and deliberately selected related projects. Cite inspected commit-pinned source when updating those notes; do not invent author motivations, metrics or claims of product certification.

The text-cleaner miniature demonstrates only whitespace normalization. It is deliberately not a full copy of Tiny Tools' normalizer. Its input is not sent or persisted. It handles empty input, clipboard denial and no-JavaScript states explicitly. Extend the pure transformation and its tests together rather than inserting a larger utility framework into the homepage.

Game previews are genuine canvas captures. The silent MP4 loads only after a visitor asks to watch it. It never autoplays; a still and a real launch link work independently. Tabs support arrow, Home and End keys. A generic tabpanel contains a native figure and caption; do not override a figure's native role. Switching tabs, leaving the viewport or hiding the page stops playback. Respect these lifecycle and network constraints when adding media.

## Real assets and provenance

`media-provenance.json` records the initial capture passes, including unsuccessful attempts. `workflow-provenance.json` supersedes the Manuscript and WORDSTRIKE entries with successful guided-sample and Endless-mode captures, and records four Tiny Tools deep-link checks. A failed capture is not proof of a product defect, and no failed or entry-screen image is promoted as a working-state screenshot.

`scripts/capture-workflow-states.mjs` retains the verified first-use capture recipe. The earlier one-time capture and integration machinery is retained in Git history, not the maintained release path. Captures use clean browser profiles and public sample content. Game and application states are not generated mockups. Canvas crops and WebP/video compression are presentation derivatives.

## Verification

Run `npm ci`, install Playwright's Chromium, Firefox and WebKit, and provide axe-core via `AXE_PATH` (the Quality workflow uses an isolated `/tmp/audit-tools` installation). `npm run audit:studio` runs the maintained release checks. `node scripts/capture-showcase-qa.mjs` captures the running preview at port 4321; `SHOWCASE_BASE_URL` can point to production for post-deployment capture. During root-preview testing, the separate Library's public covers are fetched unchanged and routed to their real paths because that application is not built by this repository.

The WCAG-tagged suite is complemented by explicit `aria-allowed-role` tests. Lighthouse's independent accessibility-tree diagnostic identified an inappropriate figure role that the narrower WCAG-tagged axe run did not flag. The correction is covered by a regression test.

## Sharing

Social cards use actual project media where available, a consistent THIEPN wordmark and plain-language descriptions. Project codes and catalogue labels do not lead the public cards. The generator embeds the inspected source image into its SVG so raster output is deterministic and does not depend on external image requests. Projects without media have a deliberate text-only fallback.

When a source title, subtitle, accent or showcase media changes, run `node scripts/rasterize-og.mjs`, then `npm run catalogue:refresh`, and commit the `public/og` derivatives and generated records. Build rejection of stale share cards is intentional. Raster cards are 1200 × 630 PNGs.

## Scope

Automated checks and rendered inspection do not constitute a WCAG conformance claim, field Core Web Vitals measurement, a full audit of the independently deployed applications, or a human first-click study. A numerical promise of “10/10” is not a release fact.
