# Showcase refinement and Tiny Tools

The homepage presents work before the catalogue. Tiny Tools is a dedicated second showcase and the second item in selected Work; its permanent record is T-006 at `/project/tiny-tools/` and its application remains at `/tools/`.

## Editing

`src/data/showcase.json` owns selected order, project summaries, real media, game-preview descriptors and four direct Tiny Tools task links. `src/data/build-notes.json` holds source-linked technical notes and their deliberately chosen related projects. Cite inspected commit-pinned source when updating those notes; do not invent author motivations, metrics or claims of product certification.

The text-cleaner miniature demonstrates only whitespace normalization. It is deliberately not a full copy of Tiny Tools' normalizer. Its input is not sent or persisted. It handles empty input, clipboard denial and no-JavaScript states explicitly. Extend its pure transformation and tests together rather than inserting a larger utility framework into the homepage.

Game previews are genuine canvas captures. The silent MP4 loads only after a visitor asks to watch it. It never autoplays; a still and a real launch link work independently. Tabs are keyboard-operable. Switching tabs, leaving the viewport or hiding the page stops playback. Respect these lifecycle and network constraints when adding media.

## Actual assets and provenance

`media-provenance.json` records the broader browser-capture pass, including unsuccessful capture attempts. `workflow-provenance.json` supersedes the Manuscript and WORDSTRIKE entries with successful guided-sample and Endless-mode captures and records four Tiny Tools deep-link checks. A failed capture is not proof of a product defect, and no failed or entry-screen image is promoted as a working-state screenshot.

Capture scripts operate on clean browser profiles and public sample content. The application interfaces and game states are not generated mockups. Canvas crops and WebP/video compression are presentation derivatives. The portfolio does not store personal document content.

## Verification

Run `npm ci`, install Playwright's Chromium, Firefox and WebKit, and provide axe-core via `AXE_PATH` (the Quality workflow uses an isolated `/tmp/audit-tools` installation). `npm run audit:studio` runs the maintained release checks. `node scripts/capture-showcase-qa.mjs` captures the running preview at port 4321; `SHOWCASE_BASE_URL` can point to the production origin for post-deployment capture. When testing root preview, the separate Library's public cover bytes are fetched unchanged and routed to their real paths, because that application is not built by this repository.

If source titles/subtitles/accents change, run `node scripts/rasterize-og.mjs`, then `npm run catalogue:refresh`, and commit public OG derivatives and generated records. Build rejection of stale share cards is intentional.

## Scope

Automated checks and rendered inspection do not constitute a WCAG conformance claim, a field Core Web Vitals result, a full audit of the independently deployed applications, or a human first-click study. No numerical promise of “10/10” is a release fact.
