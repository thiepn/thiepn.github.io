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

First, `/projects/` placed its actual searchable/filterable directory after the portfolio browse-model explainer, five visitor-intent cards, and the category index. Phase 16B-2 makes the complete directory the first content surface after the hero. Intent, category, collection, and book discovery remain intact as secondary browsing paths below it.

Second, the desktop Search opener disappeared at widths up to 960px while the mobile menu did not appear until 650px. This left the 651–960px range without a visible route into global search. Phase 16B-2 removes that gap:

- above 760px, the desktop/tablet header keeps the Search opener visible;
- between 761px and 960px, the shortcut glyph and Theme label compress away while search and theme controls remain available;
- at 760px and below, the header switches to the mobile navigation, which exposes `Search portfolio` directly;
- the 760/761 boundary is explicitly certified for visibility, search activation, and horizontal containment.

#### 16B-2 closeout

PR #19 passed the complete Quality workflow and the full browser matrix. After merge, build, Pages deployment, and custom-domain production verification all succeeded.

### 16B-3 — Main-landmark integrity

The About page contained a nested `<main>` even though `BaseLayout` already owns the document's sole main landmark. The visual result was harmless, but the landmark structure was invalid for assistive technology.

Phase 16B-3:

- replaces the About page's nested `<main>` with a neutral wrapper;
- keeps `BaseLayout` as the sole owner of `#main-content`;
- extends the Phase 12 source audit to require exactly one `<main>` in `BaseLayout` and reject page-level `<main>` elements on routes that use that layout;
- adds browser coverage asserting `/about/` exposes exactly one main landmark.

#### 16B-3 closeout

PR #20 passed the complete Quality workflow and full browser/accessibility certification. The post-merge Pages workflow completed build, deploy, and production verification successfully.

### 16B-4 — Project-first collection records

Collection records originally put `Collection, not category` taxonomy explanation and editorial About content before the projects themselves. The hero already explains the collection's theme, so visitors were forced through portfolio-model explanation before reaching the work they came to browse.

Phase 16B-4 reorders collection records to:

1. Featured projects, when anchors exist;
2. the complete project directory;
3. the optional relationship view;
4. editorial About content;
5. category/classification explanation.

All collection membership, canonical category semantics, relationship data, category links, no-JavaScript navigation, and visual components remain unchanged.

#### 16B-4 closeout

PR #21 passed the complete Quality workflow, including the full browser/accessibility matrix. After merge, build, deploy, and `https://thiepn.dev/` production verification all succeeded.

### 16B-5 — Metadata and public discoverability

The next audit moves from on-site discovery to external discoverability. Several public identity signals still describe the older project-only site model even though Books and broader publication surfaces are now first-class:

- `SITE.title` is still `THIEPN — Projects`;
- `SITE.description` is the narrow `Projects, tools, games & experiments.`;
- the web-app manifest still uses the legacy `THIEPN Project Universe` name;
- WebSite JSON-LD advertises a URL-based `SearchAction` that only points into the project archive even though the real global palette now searches projects, collections, and books.

Phase 16B-5 aligns these public signals with the current portfolio:

- use a broad canonical title covering software, games, learning, and books;
- use one richer site description across default metadata and WebSite structured data;
- rename install metadata to `THIEPN Portfolio`;
- remove the inaccurate project-only SearchAction until a canonical URL-addressable portfolio-wide search surface exists;
- identify the public GitHub profile through WebSite `sameAs`;
- preserve the already-correct `robots.txt` and canonical sitemap declaration;
- add unit and browser regression coverage for the current identity, manifest, crawler metadata, and JSON-LD contract.

#### 16B-5 acceptance gates

The tranche must pass generated freshness, structural/production/accessibility/visual/release source gates, scale benchmark, typecheck, unit tests, production build and built-performance budgets, and the complete Playwright browser/accessibility matrix. After merge, the authoritative Pages workflow must again pass build, deploy, and custom-domain production verification.

## Known repository-administration cleanup

GitHub may still start a legacy Jekyll `pages build and deployment` workflow while the custom Astro workflow is authoritative. Repository Pages settings should use **GitHub Actions** as the publishing source so that legacy workflow noise disappears.

This is not solved by making Jekyll build the Astro source tree; doing that risks creating a competing deployment path.

The historical `v1.0.0` tag also remains unresolved and should only be created after identifying the intended historical launch commit.

## Next audit

After 16B-5 is certified, audit indexability and search-engine presentation from the rendered production site: canonical/robots/sitemap consistency, page-title and description quality across route classes, structured-data coverage for collection/about pages, and whether any public route lacks a useful search-result description. Avoid speculative keyword stuffing or visual changes without a measurable visitor benefit.
