# Phase 16 — Post-launch Hardening

## Objective

Phase 16 begins after the successful `1.0.0` production deployment. Its purpose is to make continued development safer and clearer without destabilizing the public portfolio experience.

## Phase 16A — Production hardening

### Production guardrails

- Run `phase15:validate` in the ordinary Quality workflow for every pull request and push to `main`.
- Make the production validator forward-compatible: the active site phase may advance beyond the frozen Phase 15 launch record, but it may never regress below the production release phase.
- Run the production-source validator inside the authoritative Pages deployment workflow before the Astro build is published.
- Keep post-deploy smoke verification against `https://thiepn.dev/` as the final deployment gate.

This creates two independent boundaries: source that violates the production contract fails CI, and source that somehow reaches the deployment workflow still cannot publish before the same invariant check passes.

### CI efficiency

The historical `Release Candidate` workflow was still running its 35-minute full certification automatically on every pull request after launch. Phase 16A converts it to **Production Certification**, invoked explicitly with `workflow_dispatch`.

The broad `Phase 15 Recovery Certification` workflow is removed. The Quality workflow also removes seven duplicate targeted Playwright passes and retains the complete `npm run test:e2e` matrix as the single routine browser gate. Chromium, Firefox, WebKit, mobile Chromium, and mobile WebKit remain covered through the Playwright configuration.

### Documentation and performance contract

- Update the README from the obsolete Phase 14 / `1.0.0-rc.1` state to the actual post-launch `1.0.0` state.
- Close the outdated Phase 15 deployment-blocker narrative using verified production evidence.
- Add `docs/PERFORMANCE.md` and remove the broken reference to a nonexistent Phase 11 report.
- Document the outstanding historical `v1.0.0` tag explicitly rather than implying it exists.

`docs/PERFORMANCE.md` records the limits already enforced by `performance-budgets.json` and the existing performance scripts, including initial transfer limits, search-index/media/font limits, Core Web Vitals thresholds, and the 250-project interaction benchmark.

### Phase 16A closeout

Phase 16A passed the complete Quality workflow and, after merge, the authoritative Pages workflow completed build, deploy, and production verification successfully against `https://thiepn.dev/`.

## Phase 16B — Portfolio usefulness and discovery

Phase 16B uses targeted user-visible improvements rather than a visual redesign. Changes should reduce discovery friction while preserving THE INDEX visual language, catalogue semantics, accessibility, and performance budgets.

### 16B-1 — Unified portfolio search

The search palette treats published books as first-class searchable items:

- `/search-index.json` enriches the existing generated project/collection payload with book records directly from Astro Content Collections at build time;
- book search uses the canonical title, subtitle, summary, subjects, version, Library URL, and last-updated metadata without duplicating source content;
- ranking supports exact/fuzzy title matching plus subtitle, summary, and subject discovery;
- result rendering distinguishes `BOOK` entries and opens the canonical THIEPN Library record;
- result counts distinguish projects, collections, and books;
- desktop and mobile language is portfolio-wide rather than project-only;
- the visible keyboard hint is platform-neutral (`⌘/Ctrl K`);
- the palette provides direct Books and Collections browse exits while retaining the project-directory path;
- unit and Playwright coverage certify book discovery from keyboard and mobile search journeys.

The implementation intentionally enriches the prerendered `/search-index.json` Astro endpoint instead of creating a second network request or introducing another tracked generated file.

#### 16B-1 closeout

PR #18 passed the complete Quality workflow, including the full Chromium/Firefox/WebKit/mobile Playwright matrix. After merge, the authoritative Pages workflow completed build, deploy, and production verification successfully against `https://thiepn.dev/`.

### 16B-2 — Directory-first project discovery and continuous search access

The next audit found two concrete discovery problems.

First, `/projects/` placed its actual searchable/filterable directory after the portfolio browse-model explainer, five visitor-intent cards, and the category index. On small screens this pushed the primary project list several screens below the page introduction. Phase 16B-2 makes the complete directory the first content surface after the hero. Intent, category, collection, and book discovery remain intact as secondary browsing paths below it.

Second, the desktop Search opener disappeared at widths up to 960px while the mobile menu did not appear until 650px. This left the 651–960px range without a visible route into global search. Phase 16B-2 removes that gap:

- above 760px, the desktop/tablet header keeps the Search opener visible;
- between 761px and 960px, the shortcut glyph and Theme label compress away while search and theme controls remain available;
- at 760px and below, the header switches to the mobile navigation, which exposes `Search portfolio` directly;
- the 760/761 boundary is explicitly certified for visibility, search activation, and horizontal containment.

#### 16B-2 acceptance gates

The tranche must preserve:

- all existing intent/category/collection navigation and URL-state behavior;
- no-JavaScript project-directory completeness;
- one canonical category per project and overlapping collection semantics;
- complete Quality validation, typecheck, unit tests, build/performance budgets, and full browser/accessibility certification;
- successful post-merge build, deploy, and custom-domain production verification.

## Known repository-administration cleanup

GitHub may still start a legacy Jekyll `pages build and deployment` workflow while the custom Astro workflow is authoritative. Repository Pages settings should use **GitHub Actions** as the publishing source so that legacy workflow noise disappears.

This is not solved by making Jekyll build the Astro source tree; doing that risks creating a competing deployment path.

The historical `v1.0.0` tag also remains unresolved and should only be created after identifying the intended historical launch commit.

## Next discovery audit

After 16B-2 is certified, inspect collection and book journeys for redundant explanatory layers, then review homepage prioritization against the now-improved global discovery paths. Avoid changes that are merely stylistic or equivalent-quality rearrangements.
