# THIEPN. / THE LIVING INDEX

## Engineering Architecture and Delivery Plan

**Status:** Authoritative  
**Repository:** `thiepn/thiepn.github.io`  
**Production root:** `https://thiepn.github.io/`

---

## 1. Architecture objective

The hub is a static, content-driven catalogue with selective rich interaction.

The governing engineering rule is:

> **Render statically first. Add client-side JavaScript only where interaction genuinely requires it.**

The architecture must remain maintainable with 150+ projects without requiring a backend or UI redesign.

---

## 2. Locked production stack

Use:

```text
Astro
TypeScript (strict)
Custom CSS
Motion
SVG
AVIF / WebP
WebM
Playwright
Vitest
GitHub Actions
GitHub Pages
```

### Explicitly not part of V1

- React/Next.js as the application framework;
- general UI component libraries;
- backend/database/CMS;
- runtime GitHub API dependency;
- accounts;
- analytics;
- service worker/PWA complexity;
- Three.js/WebGL;
- iframe project previews;
- multiple animation frameworks preinstalled “just in case.”

Motion is the primary animation library. CSS handles simple transitions. Add another animation/rendering library only for a concrete proven need.

---

## 3. Architectural layers

```text
BUILD-TIME CONTENT
Project/collection records, ledger, curation, generated routes

STATIC PRESENTATION
Astro HTML + THE INDEX CSS

SELECTIVE INTERACTION
Search, filtering, preview control, motion, theme, navigation restoration
```

The public site should remain meaningful and navigable with JavaScript disabled.

---

## 4. Repository layout

```text
thiepn.github.io/
│
├── .github/
│   └── workflows/
│       ├── deploy.yml
│       ├── quality.yml
│       ├── link-health.yml
│       └── media-audit.yml
│
├── docs/
│   ├── DESIGN_SYSTEM.md
│   ├── CONTENT_MODEL.md
│   ├── ARCHITECTURE.md
│   └── MASTER_IMPLEMENTATION_PROMPT.md
│
├── public/
│   ├── fonts/
│   ├── icons/
│   ├── projects/
│   ├── og/
│   ├── favicon.svg
│   ├── manifest.webmanifest
│   ├── robots.txt
│   └── .nojekyll
│
├── scripts/
│   ├── add-project.ts
│   ├── discover-projects.ts
│   ├── validate-content.ts
│   ├── validate-media.ts
│   ├── validate-links.ts
│   ├── sync-github.ts
│   ├── capture-previews.ts
│   ├── optimize-media.ts
│   ├── generate-search-index.ts
│   ├── generate-og.ts
│   └── generate-fixtures.ts
│
├── src/
│   ├── components/
│   ├── content/
│   ├── data/
│   ├── generated/
│   ├── layouts/
│   ├── lib/
│   ├── motion/
│   ├── pages/
│   ├── scripts/
│   ├── styles/
│   └── types/
│
├── tests/
│   ├── unit/
│   ├── e2e/
│   ├── accessibility/
│   ├── visual/
│   └── fixtures/
│
├── astro.config.*
├── package.json
├── tsconfig.json
├── playwright.config.*
├── vitest.config.*
├── README.md
└── LICENSE
```

---

## 5. Component architecture

Organize components by domain rather than by generic UI type.

```text
src/components/
├── shell/
│   ├── SiteHeader.astro
│   ├── SiteFooter.astro
│   ├── MobileMenu.astro
│   └── ThemeControl.astro
│
├── index/
│   ├── IndexHero.astro
│   ├── IndexMetadata.astro
│   ├── LivingIndexField.astro
│   ├── LivingIndexFragment.astro
│   └── SectionIndex.astro
│
├── artifacts/
│   ├── ArtifactPlate.astro
│   ├── HeroArtifact.astro
│   ├── FeatureArtifact.astro
│   ├── CompactArtifact.astro
│   ├── ArchiveRow.astro
│   ├── PreviewAperture.astro
│   └── ArtifactActions.astro
│
├── records/
│   ├── ArtifactHero.astro
│   ├── ArtifactOverview.astro
│   ├── CapabilityList.astro
│   ├── ArtifactGallery.astro
│   ├── ArtifactMetadata.astro
│   └── RelatedArtifacts.astro
│
├── archive/
│   ├── ArchiveControls.astro
│   ├── CategoryIndex.astro
│   ├── ArtifactGrid.astro
│   ├── ArchiveList.astro
│   └── ArchiveEmptyState.astro
│
├── collections/
│   ├── CollectionPreview.astro
│   ├── CollectionMap.astro
│   ├── CollectionNode.astro
│   └── CollectionIndex.astro
│
├── search/
│   ├── CatalogueSearch.astro
│   ├── SearchResult.astro
│   └── SearchPreview.astro
│
├── previews/
│   ├── PdfStudioPreview.astro
│   ├── ManuscriptPreview.astro
│   ├── Clean30Preview.astro
│   ├── French3000Preview.astro
│   └── ...
│
└── activity/
    └── RecentActivity.astro
```

Astro components primarily own markup, data composition, semantics, and static presentation. They should not each invent their own state/storage/animation systems.

---

## 6. Layout architecture

```text
src/layouts/
├── BaseLayout.astro
├── IndexLayout.astro
├── RecordLayout.astro
└── CollectionLayout.astro
```

### BaseLayout responsibilities

- document `<head>`;
- title/description/canonical/OG metadata;
- theme bootstrap before meaningful paint;
- global styles;
- skip link;
- global header/footer slots;
- accessibility baseline.

Do not duplicate SEO/theme/navigation boilerplate across pages.

---

## 7. Routing

Canonical V1 routes:

```text
/                         Homepage
/projects/                 Full Project Archive
/project/[slug]/           Artifact Record
/collections/              Collection index
/collection/[slug]/        Collection record
/404.html                  Uncatalogued state
```

Possible later routes:

```text
/timeline/
/explore/
/updates/
/about/
```

Do not implement future routes during V1 unless they provide concrete value.

### Hub/live-project separation

`/project/pdf-studio/` is the hub's Artifact Record.

`/pdf/` is PDF Studio itself.

The hub does not proxy, iframe, bundle, or rewrite the live project. Live projects remain independent GitHub Pages applications.

---

## 8. Static generation

All project and collection records should generate static routes at build time.

- `listed` projects generate public Artifact Records.
- `archived` projects may generate records if intentionally retained.
- `hold` and `hidden` records are excluded from normal production output/search/sitemap.

The project catalogue is authoritative; route generation is a projection of it.

---

## 9. State model

Do not install a global client-state library.

Use the appropriate native source of truth:

```text
URL                     shareable filters/query/sort
DOM/controller state    immediate interaction
sessionStorage          navigation restoration
localStorage            stable user preferences
```

Priority:

```text
1. explicit URL state
2. current user interaction
3. stored preference where appropriate
4. default
```

### URL-managed state

```text
query
category
sort
tag filters if added
```

Example:

```text
/projects/?category=games&q=typing
```

### localStorage

Only persistent preferences:

```text
theme
grid/list preference
recently viewed
```

### sessionStorage

Ephemeral restoration data:

```text
archive scroll position
selected artifact before record navigation
temporary archive query/context
```

---

## 10. Client controllers

Use a small set of shared controllers rather than per-card mini applications.

```text
ThemeController
ArchiveController
SearchController
PreviewController
LivingIndexController
NavigationController
RecentController
```

Initialize controllers only when their root data attribute exists on the current route.

---

## 11. PreviewController

Responsibilities:

```text
register apertures
detect hover/focus/touch activation
honor activation delay
lazy-load media
start synthetic preview
start/pause/reset video
limit simultaneous previews
pause/reset offscreen media
pause on hidden document
honor reduced motion
handle media errors/fallbacks
```

Global limits:

```text
desktop active previews: 2
mobile active previews: 1
prefer <=1 simultaneous video decoder where practical
```

### State machine

```text
POSTER → ARMED → ACTIVE → SETTLED → POSTER
                     ↘ UNAVAILABLE
```

### Synthetic preview contract

Conceptual API:

```ts
interface SyntheticPreview {
  start(): void;
  reset(): void;
  settle(): void;
  destroy(): void;
}
```

Video previews expose equivalent `prepare/play/pause/reset` behavior.

No preview-specific card architecture is allowed.

---

## 12. LivingIndexController

Owns only the signature hero behavior:

- project fragment registration;
- pointer proximity calculation;
- dormant/active visual state;
- deliberate full wake;
- mobile one-at-a-time wake cycle;
- viewport enable/disable;
- reduced-motion fallback.

Do not mix search/filter/navigation responsibilities into this controller.

### Performance

- Gate pointer behavior behind `(hover: hover) and (pointer: fine)`.
- Use `requestAnimationFrame` rather than heavy work on every raw pointer event.
- Cache geometry and recalculate after resize/layout changes only when necessary.

---

## 13. ArchiveController

Conceptual state:

```ts
{
  query: "",
  category: "all",
  sort: "curated",
  view: "grid"
}
```

Responsibilities:

- filtering;
- sorting;
- grid/list mode;
- URL synchronization;
- result count;
- empty state;
- mechanical reflow coordination;
- restoration after Back navigation.

Filtering computation should be effectively immediate; visual reflow may last roughly 300–350ms.

---

## 14. SearchController

Catalogue Search responsibilities:

- open/close;
- focus/inert management;
- query/update result list;
- keyboard selection;
- preview selected result on wide desktop;
- Enter → Artifact Record;
- Cmd/Ctrl+Enter → live project;
- Random Access when query is empty;
- restore initiating focus when closed.

### Build-time search index

Generate lightweight records containing only public searchable fields:

```text
code
title
aliases
summary
category
type
tags
collections
status
```

### Search scoring

Suggested weights:

```text
exact title              100
catalogue code            95
title prefix              85
title token               70
alias exact               65
alias token               55
tag                        40
collection                 35
summary                    20
```

Use modest typo tolerance after stronger matches.

At expected scale, local search is sufficient. Do not add Algolia, Elasticsearch, or server search.

---

## 15. Motion architecture

Use the cheapest suitable layer:

### CSS

- hover/focus state;
- line expansion;
- color/opacity;
- tiny text movement;
- simple transforms.

### Motion

- coordinated hero entrance;
- archive layout/reflow;
- proximity choreography;
- synthetic preview sequences;
- SVG/path behavior;
- complex shared transitions.

### Native View Transitions

Progressive enhancement only. Navigation must remain correct without it.

### Video

Real gameplay or complex authentic behavior that would be wasteful to recreate.

Never delay navigation waiting for an animation library.

---

## 16. Route-specific client code

Do not ship every interaction to every page.

### Homepage

```text
Living Index
Featured preview handling
Archive interactions if present
Catalogue Search
```

### Project Archive

```text
ArchiveController
PreviewController
Catalogue Search
```

### Artifact Record

```text
PreviewController
Gallery/inspection
optional capability-preview switching
Catalogue Search
```

### Collection

```text
Collection map interaction
PreviewController
Catalogue Search
```

---

## 17. CSS architecture

```text
src/styles/
├── reset.css
├── fonts.css
├── tokens.css
├── themes.css
├── typography.css
├── grid.css
├── primitives.css
├── artifacts.css
├── navigation.css
├── search.css
├── collections.css
├── record.css
├── motion.css
├── responsive.css
└── utilities.css
```

Tokens are single-source-of-truth. Do not duplicate color/radius/spacing systems across components.

---

## 18. Build scripts

Recommended package scripts:

```text
dev
build
preview

typecheck
lint

validate
validate:content
validate:media
validate:links

sync:github

project:add
projects:discover

previews:capture
previews:optimize

search:build
og:generate

test
test:unit
test:e2e
test:a11y
test:visual
test:scale

audit:performance
audit:release
```

### `npm run validate`

Should cover:

```text
schema/content
catalogue ledger
taxonomy
relations
collections
media paths/budgets
internal URLs
```

### `npm run audit:release`

Should approximate:

```text
validate
→ typecheck
→ unit tests
→ production build
→ E2E
→ accessibility
→ visual smoke
→ performance audit
```

---

## 19. Automated project tooling

### `project:add`

Create a `visibility: hold` project record, propose the next permanent code, and prefill safe repository/date metadata.

It must never publish automatically.

### `projects:discover`

Compare accessible repositories/Pages sites against the registry and report indexed/unindexed/ignored candidates.

### `sync:github`

Read-only build-time enrichment. Output to generated/cache data. Never rewrite curated project records.

### `capture-previews`

Use Playwright to capture deterministic project states. Per-project configuration may define viewport, route, wait condition, setup actions, delay, theme, and focal state.

### `optimize-media`

Produce responsive AVIF/WebP variants, compressed WebM, poster frames, and media manifest.

### `generate-og`

Create consistent project social images from project metadata; allow manual flagship override.

---

## 20. Deterministic preview capture

Where possible:

- seed random game states;
- dismiss onboarding;
- open a meaningful screen;
- freeze or control timestamps;
- select a known theme;
- wait for a project-specific ready signal.

Do not accept automated screenshots of start screens/settings when a meaningful interaction state can be captured.

Hub media belongs to the hub repository. Do not mutate source-project assets to generate thumbnails.

---

## 21. Testing

### Unit — Vitest

Test pure logic:

```text
catalogue-code validation
duplicate detection
sorting/filtering
search scoring/fuzzy matching
collection relationships
status/visibility logic
NEW/UPDATED calculation
URL serialization
related-artifact ranking
Random Access exclusions
```

### E2E — Playwright

Test browser flows:

```text
homepage loads
Featured appears
category filter works
Catalogue Search works
Artifact Record opens
live launch points to intended project
Back restores archive state
collection navigation works
theme persists
mobile menu works
keyboard navigation works
```

Run Chromium, Firefox, and WebKit for release certification; PR smoke checks may start with Chromium for speed.

### Accessibility

Automated checks supplement, not replace, manual review of:

- focus order;
- reduced motion;
- 200% zoom;
- mobile/touch;
- dialog focus;
- screen-reader naming.

### Visual regression

Canonical screenshots:

```text
home-light-desktop
home-dark-desktop
home-light-mobile
archive-desktop
search-desktop
artifact-pdf-studio
collection-browser-games
404
```

Also maintain an all-Artifacts contact sheet for art-direction review.

---

## 22. Scale testing

`generate-fixtures.ts` should generate roughly 150–250 synthetic projects with varied titles, categories, statuses, accents, and content lengths.

`test:scale` must inspect:

- archive scrolling;
- filter/reflow speed;
- search speed;
- DOM size;
- memory;
- mobile behavior;
- media-loading behavior.

Target search response: under 50ms at about 250 projects on normal desktop hardware.

Do not introduce pagination before real testing shows it is necessary.

---

## 23. Performance budgets

Preferred initial-transfer targets:

```text
HTML                     < 80 KB compressed
critical/main CSS         < 60 KB compressed
initial JavaScript        < 120 KB compressed
critical fonts            < 180 KB total
hero/above-fold imagery   < 500 KB where practical
useful initial load       roughly < 1 MB where practical
```

Media:

```text
standard preview          ~300 KB–1.2 MB
flagship preview          up to ~2 MB if justified
>3 MB preview             build error unless explicitly overridden
```

Core Web Vitals:

```text
LCP <= 2.0s preferred, <=2.5s acceptance
INP <=150ms preferred, <=200ms acceptance
CLS <=0.05 preferred, <=0.1 acceptance
```

No preview WebM should preload across the entire archive.

---

## 24. GitHub integration

GitHub is build-time enrichment and source linking, not a public runtime dependency.

`sync:github` may retrieve:

- repository existence;
- archived state;
- `pushed_at`;
- primary language;
- topics;
- Pages metadata where available.

If GitHub is unavailable:

```text
use cached metadata
→ otherwise use curated project registry
→ build still succeeds where possible
```

Raw GitHub `pushed_at` does not define a public major update. Public update markers use curated `lastMajorUpdate`.

---

## 25. GitHub Pages deployment

The hub repository is the user root repository:

```text
thiepn/thiepn.github.io
```

Therefore production is:

```text
https://thiepn.github.io/
```

Use GitHub Actions Pages deployment. Do not commit generated `dist/` output as normal source.

Build artifact flow:

```text
source on main
→ CI build
→ Pages artifact
→ deploy
→ production smoke check
```

No staging backend is required for V1. PR validation can use local/static build artifacts and screenshots.

---

## 26. CI workflows

### Pull request / quality

```text
checkout
→ install locked dependencies
→ validate
→ typecheck
→ unit tests
→ build
→ Chromium E2E smoke
→ accessibility smoke
→ visual artifacts when relevant
```

### Main / deployment

```text
full validation
→ full tests
→ production build
→ browser smoke
→ upload Pages artifact
→ deploy
→ post-deploy smoke
```

### Scheduled link health

Weekly check public live URLs. Distinguish transient timeout from confirmed 404. One timeout should not instantly break production deployment.

### Media audit

Enforce file existence, dimensions, formats, and budgets.

---

## 27. Error isolation

Interactive features must fail independently.

If Living Index JS fails:

- static hero remains;
- links still work.

If preview media fails:

- poster remains.

If GitHub metadata is missing:

- curated registry remains.

If Motion fails to load:

- navigation/filter/search functionality must not become unusable.

Progressive enhancement is mandatory.

---

## 28. Security/privacy

V1 is static and privacy-light.

- no analytics;
- no tracking cookies;
- no accounts;
- no secrets in client output;
- avoid unsafe `innerHTML`;
- sanitize/escape any externally derived text;
- use correct `rel` for new-tab external links;
- self-host fonts;
- adopt a reasonable CSP when implementation stabilizes.

No cookie banner is required for local theme/recent-view preferences alone.

---

## 29. Development-only routes

### `/dev/catalogue/`

Development mode only. Show:

```text
code
title
status
visibility
preview tier
media state
collections
validation warnings
```

### `/dev/design-system/`

Development mode only. Show canonical:

```text
typography
colors
spacing
buttons/links
Artifact variants
metadata/status
search rows
focus states
theme states
```

These routes are visual/maintenance contracts and must not accidentally ship as public production navigation.

---

## 30. Feature flags

Lightweight configuration is allowed for experimental visual enhancements:

```ts
export const FEATURES = {
  livingIndexScanner: true,
  proximityActivation: true,
  animatedPreviews: true,
  randomAccess: true,
  recentActivity: true,
  viewTransitions: true,
};
```

Do not feature-flag accessibility or fundamental navigation.

---

## 31. Development phase plan

### Phase 0 — Repository Foundation

Astro scaffold, strict TypeScript, CSS tokens, folders, test tooling, theme bootstrap, CI skeleton, Pages deployment shell.

**Exit:** local dev/build/deploy works, 404 works, light/dark works, no path errors.

### Phase 1 — Catalogue Foundation

Schemas, ledger, taxonomy, validation, initial records/collections, generated stats/routes.

**Exit:** all content validates; no hard-coded project counts; visibility works.

### Phase 2 — Static Design System

Typography, colors, geometry, header, hero, Artifact Plates, archive, basic Artifact Records/collections/footer. No elaborate motion.

**Exit:** site already looks excellent and works with JS/motion disabled.

### Phase 3 — Responsive & Accessibility Foundation

Mobile/tablet compositions, touch, focus, keyboard, reduced motion, safe areas, zoom.

**Exit:** mandatory viewport matrix passes; no horizontal overflow at 320px.

### Phase 4 — Search & Archive Interaction

Catalogue Search, filters, sort, grid/list, URL state, Back restoration, Random Access.

**Exit:** keyboard/touch complete; search fast at 250 fixtures.

### Phase 5 — Living Index Motion

Hero entrance, dormant fragments, proximity activation, mobile wake, optional scanner.

**Exit:** no jank/misclicks/text obstruction; static fallback remains excellent.

### Phase 6 — Preview Framework

PreviewController, lifecycle, lazy media, synthetic/video contracts. Prove with PDF Studio, WORDSTRIKE, French 3000.

**Exit:** one controller supports tool/game/learning without card hacks.

### Phase 7 — Featured Preview Production

High-quality P4/P5 previews for initial Featured set.

**Exit:** each Featured project is understandable in a few seconds and visually distinct.

### Phase 8 — Full Artifact Records

Capabilities, gallery, record metadata, related artifacts, previous/next, richer preview behavior.

**Exit:** tool/game/learning/beta detail pages all feel finished and differentiated.

### Phase 9 — Collections

Collection index/pages, relationship maps, responsive simplification.

**Exit:** each collection adds insight beyond a category filter.

### Phase 10 — Automation

`project:add`, discovery, GitHub sync, screenshot/media/OG tooling, dev catalogue/design-system views.

**Exit:** adding a normal new project requires no UI-source edits.

### Phase 11 — Performance Hardening

Bundle/media/font audits, 150–250 project scale testing, Web Vitals.

**Exit:** no significant scroll/search/filter/media jank; budgets met or justified.

### Phase 12 — Browser & Accessibility Certification

Chromium/Firefox/WebKit, desktop/mobile, keyboard/touch/reduced motion/forced colors/200% zoom.

**Exit:** zero known critical/high compatibility or accessibility issues.

### Phase 13 — Art-Direction & Visual Regression Audit

Full-page screenshots, contact sheet, anti-generic review, motion audit.

**Exit:** identity/uniqueness/project differentiation at release threshold.

### Phase 14 — Release Candidate

Feature freeze; full regression, link/search/launch/theme/no-JS/error tests.

**Exit:** zero critical/high issues.

### Phase 15 — Production Launch

Deploy to root Pages, production smoke test, performance check, tag V1.

**Exit:** real production routes/project launches validated.

---

## 32. Universal phase rules

Every implementation phase must:

1. Read `DESIGN_SYSTEM.md`, `CONTENT_MODEL.md`, `ARCHITECTURE.md`, and `MASTER_IMPLEMENTATION_PROMPT.md` first.
2. Preserve completed functionality.
3. Work only within current phase scope unless a blocker requires a minimal prerequisite fix.
4. Avoid redesigning stable completed sections without evidence.
5. Run the phase exit checks.
6. Run regression checks for earlier phases.
7. Report what changed, tests run, failures/limitations, and next phase.

Do not claim a phase complete when its acceptance gate has not passed.

---

## 33. Definition of architectural success

The architecture succeeds when:

```text
adding a project does not alter UI components
adding a collection does not alter routing code
changing a title does not alter templates
search automatically receives new listed content
counts update automatically
mobile and desktop use the same project data
previews share one lifecycle/controller
motion can fail without breaking navigation
GitHub can be unavailable without breaking the core build/site
150+ projects do not require redesign
```

This file is authoritative for engineering decisions. If an implementation shortcut conflicts with it, the shortcut must be rejected or this document must be deliberately revised with justification.
