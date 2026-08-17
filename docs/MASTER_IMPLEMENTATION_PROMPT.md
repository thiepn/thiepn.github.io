# THIEPN. / THE LIVING INDEX

## Master Implementation Prompt

Use this document as the canonical prompt when handing the repository to Codex or another coding agent.

Replace only the **CURRENT PHASE** section when advancing phases. Do not rewrite the design/architecture rules ad hoc between sessions.

---

# MASTER PROMPT

You are implementing **THIEPN. / THE LIVING INDEX**, the root project hub hosted from the GitHub repository:

```text
thiepn/thiepn.github.io
```

Production destination:

```text
https://thiepn.github.io/
```

This is not a generic portfolio. It is a scalable, art-directed catalogue of projects, tools, games, learning systems, resources, visualizations, and experiments.

## 1. Mandatory source documents

Before changing code, read these files completely:

```text
docs/DESIGN_SYSTEM.md
docs/CONTENT_MODEL.md
docs/ARCHITECTURE.md
docs/MASTER_IMPLEMENTATION_PROMPT.md
```

Treat `DESIGN_SYSTEM.md`, `CONTENT_MODEL.md`, and `ARCHITECTURE.md` as authoritative specifications.

If code conflicts with those documents, do not silently reinterpret the specifications. Either:

1. bring the code into compliance; or
2. if a genuine technical impossibility exists, make the smallest justified adaptation and document it clearly.

Do not substitute your own preferred portfolio design, component library, framework conventions, or generic best-practice UI where these documents provide an explicit direction.

---

## 2. Product concept

The design system is **THE INDEX / DS-01**.

The visual experience is **THE LIVING INDEX**:

> A precise technical/editorial archive that is quiet at rest and becomes alive when explored.

The hub should feel like a digital museum catalogue, industrial design archive, technical publication, and creative workshop—not a SaaS dashboard, GitHub profile, app store, gaming portal, or conventional résumé portfolio.

The projects supply personality. The hub supplies structure.

---

## 3. Permanent visual invariant

Preserve THE INDEX visual language.

Do not replace it with generic SaaS/dashboard styling.

Maintain:

```text
small radii
structural rules
catalogue codes
numbered sections
clipped Artifact geometry
Instrument Sans + IBM Plex Mono
warm paper light surfaces
neutral graphite dark surfaces
restrained project accents
project-specific preview apertures
editorial asymmetry
measured mechanical motion
→ internal / ↗ external navigation semantics
```

### Explicitly prohibited as general hub styling

Do not introduce:

```text
giant rounded cards
purple/blue glow gradients
glassmorphism
floating blurred blobs
gradient heading text
pills everywhere
icon circles everywhere
generic dashboard metric cards
large card shadows
3D hover tilt
mouse glow everywhere
spring/bounce motion everywhere
generic bento-template design
generic command-palette styling
neon cyberpunk hub chrome
huge empty hero whitespace
SaaS CTA clusters
emoji UI decoration
```

Do not visibly inherit default aesthetics from Bootstrap, Material UI, shadcn, Chakra, Mantine, DaisyUI, Flowbite, or similar UI kits.

When implementation difficulty arises, **simplify within THE INDEX** rather than falling back to a familiar generic component pattern.

---

## 4. Boundary rule

This rule is absolute:

> **Outside the aperture = THIEPN. Inside the aperture = the project.**

The outer hub owns:

```text
typography
spacing
geometry
rules
catalogue metadata
navigation
controls
responsive structure
```

The project preview aperture may preserve the individual project's:

```text
colors
fonts
artwork
UI language
gameplay
animation
```

This is how all projects remain visually distinct without making the hub incoherent.

---

## 5. Locked stack

Use:

```text
Astro
TypeScript in strict mode
custom CSS
Motion
SVG
AVIF / WebP
WebM
Playwright
Vitest
GitHub Actions
GitHub Pages
```

Do not introduce React, Next.js, another application framework, a backend, database, CMS, service worker, Three.js/WebGL, runtime GitHub dependency, analytics, or a general UI component library during V1 unless the specification is deliberately changed.

Do not install multiple animation frameworks speculatively.

Use:

1. CSS for simple states/transitions.
2. Motion for coordinated animation/layout/SVG behavior.
3. Native View Transitions as progressive enhancement where useful.
4. WebM for authentic gameplay or complex real behavior.

---

## 6. Static-first requirement

Default to statically generated Astro HTML.

Client-side JavaScript exists only where needed for:

```text
Catalogue Search
archive filtering/sorting/view state
preview lifecycle
Living Index proximity/wake behavior
theme preference
navigation restoration
gallery interaction
collection interaction
```

Do not hydrate every Artifact Plate as its own framework application.

The core hub must remain useful with JavaScript disabled:

```text
homepage renders
projects are visible
Artifact Records open
collections open
live artifacts launch
```

---

## 7. Catalogue model

Project metadata must come from validated project records, never manually duplicated in UI components.

No component may contain manually typed:

```text
project titles
project counts
project statuses
project URLs
category membership
collection membership
Featured placement
```

These values must flow from the catalogue.

Catalogue codes are permanent and never renumbered.

Initial reserved project codes are defined in `CONTENT_MODEL.md` and must not be changed casually.

`R-001` is reserved for the Markdown resource even while held from the public hub.

---

## 8. Public project hierarchy

The archive supports:

```text
LIVE
BETA
EXPERIMENT
ARCHIVED
```

Publishing visibility is separate:

```text
listed
hold
hidden
```

Do not publicly expose internal readiness scores.

Do not automatically publish newly discovered GitHub repositories.

---

## 9. Featured composition

Initial Featured ordering is intentionally curated for breadth:

```text
01 T-001 PDF Studio
02 T-002 Manuscript
03 T-003 Clean30
04 G-001 WORDSTRIKE
05 L-001 French 3000
06 G-006 LiGo Quizabend
07 L-004 Analysis II Klausurlabor
```

Roles:

```text
Hero Artifact: PDF Studio
Hero Artifact: Manuscript
Feature: Clean30
Feature: WORDSTRIKE
Feature: French 3000
Editorial Featured: LiGo Quizabend
Editorial Featured: Analysis II Klausurlabor
```

Do not reorder Featured automatically by freshness, stars, score, repository date, or category.

---

## 10. Interaction grammar

Universal arrow semantics:

```text
→  stays inside THIEPN.
↗  leaves THIEPN. / opens live artifact or source
←  back / previous
↓  continue down
```

Examples:

```text
DETAILS →
COLLECTION →
PLAY ↗
OPEN TOOL ↗
SOURCE ↗
```

Maintain this everywhere.

---

## 11. Homepage identity

The homepage order is:

```text
00 / HEADER
01 / INDEX HERO
02 / FEATURED WORK
03 / CATEGORY INDEX
04 / PROJECT ARCHIVE
05 / CURATED COLLECTIONS
06 / RECENT ACTIVITY
07 / FOOTER
```

The hero is asymmetric and catalogue-like, not a centered marketing hero.

The signature **Living Index Field** contains only 6–9 curated project fragments. It is dormant at rest and responds subtly to fine-pointer proximity. Mobile uses a simplified non-pointer composition.

Motion is progressive enhancement. The static hero must already look excellent.

---

## 12. Artifact Plates and previews

Canonical Artifact variants:

```text
Hero Artifact
Feature Artifact
Standard Artifact
Compact Artifact
Archive Row
```

The standard Artifact anatomy is defined in `DESIGN_SYSTEM.md` and must remain recognizable.

Preview lifecycle:

```text
POSTER → ARMED → ACTIVE → SETTLED → POSTER
                     ↘ UNAVAILABLE
```

PreviewController, not individual card code, owns activation/lazy load/reset/error/reduced-motion behavior.

No preview audio.

No bulk autoplay of all previews.

Desktop active-preview limit: 2. Mobile: 1.

---

## 13. Search and archive

Catalogue Search is a custom indexed-archive interface, not a generic rounded command palette.

Keyboard:

```text
Cmd/Ctrl+K  open
/           open when safe
↑/↓         select
Enter       Artifact Record
Cmd/Ctrl+Enter live artifact
Esc         close
R           Random Access only when input is empty
```

Archive state must be URL-shareable where appropriate:

```text
/projects/?category=games&q=typing
```

Browser Back must restore filter/query/sort/view/scroll position after visiting an Artifact Record.

---

## 14. Accessibility invariant

Accessibility is not optional polish.

Every phase must preserve:

```text
semantic HTML
keyboard navigation
visible focus
skip navigation
WCAG AA contrast
44px-ish primary touch targets
reduced motion
200% zoom usability
no disabled pinch zoom
correct dialog focus/inert behavior
forced-colors resilience
no hover-only essential information
```

Hover-only behavior must be gated by `(hover: hover) and (pointer: fine)`.

---

## 15. Performance invariant

Do not allow the visual concept to become heavy.

Required principles:

```text
no archive iframes
no eager library of preview videos
posters before media
explicit image dimensions/aspect ratios
route-specific JS
static rendering where possible
pause/reset offscreen previews
pause on hidden tab
```

Targets:

```text
initial JS < ~120 KB compressed preferred
critical/main CSS < ~60 KB compressed preferred
useful initial load around <1 MB where practical
LCP <=2.5s acceptance
INP <=200ms acceptance
CLS <=0.1 acceptance
```

A preview larger than 3 MB should fail media validation unless explicitly justified.

---

## 16. Quality philosophy

Do not build flashy behavior before static composition is excellent.

Development priority:

```text
DATA
→ STRUCTURE
→ STATIC VISUALS
→ RESPONSIVE
→ NAVIGATION
→ MOTION
→ PREVIEWS
→ AUTOMATION
→ HARDENING
```

Do not skip a phase gate because code generation is fast.

Several phases may be implemented in one working session, but each phase's acceptance conditions must still be evaluated independently.

---

# CURRENT PHASE

**Set this explicitly before implementation.**

Example:

```text
CURRENT PHASE: Phase 0 — Repository Foundation
```

When this file is used to begin the project for the first time, use:

```text
CURRENT PHASE: Phase 0 — Repository Foundation
```

Do not implement later phases unless they are minimal prerequisites for the current phase.

---

# PHASE DEFINITIONS

## Phase 0 — Repository Foundation

Implement:

```text
Astro scaffold
strict TypeScript
folder architecture
THE INDEX token foundation
theme bootstrap
BaseLayout
minimal root page
custom 404
test tooling skeleton
GitHub Actions quality/deploy skeleton
root GitHub Pages path configuration
```

Do not build the full catalogue/hero/motion yet.

Exit gate:

```text
npm run dev works
npm run build works
strict TS active
light/dark/system correct
no theme flash
404 works
root asset paths correct
CI works
Pages shell deploys
320px no horizontal overflow
```

---

## Phase 1 — Catalogue Foundation

Implement:

```text
project schema
collection schema
catalogue ledger
taxonomy
validation
initial project records
initial collection records
derived catalogue stats
static Artifact/Collection route generation
hold/listed/hidden publishing behavior
```

Exit gate:

```text
all records validate
duplicate code fails
duplicate slug fails
ledger mismatch fails
unknown collection fails
counts derived automatically
hold/hidden excluded correctly
```

---

## Phase 2 — Static THE INDEX Design System

Implement without elaborate motion:

```text
final typography
color/theme tokens
spacing/grid/geometry
SiteHeader
SectionIndex
Artifact variants
static homepage composition
Category Index
Project Archive
basic Artifact Records
basic Collections
footer
```

Exit gate:

```text
site is visually distinctive with JS disabled
site is visually distinctive with motion disabled
no generic SaaS/dashboard drift
light and dark modes both art-directed
internal/external arrow grammar correct
```

Do not proceed if static design is merely functional or generic.

---

## Phase 3 — Responsive & Accessibility Foundation

Implement:

```text
mobile/tablet compositions
mobile menu
container-query Artifact behavior
touch targets
focus states
skip link
keyboard baseline
reduced-motion baseline
safe areas
200% zoom robustness
```

Exit gate includes mandatory viewports from `DESIGN_SYSTEM.md`, including 320px without page horizontal overflow.

---

## Phase 4 — Archive Search, Filters & State

Implement:

```text
ArchiveController
category filters
curated/recent/A-Z sorting
grid/list
URL state
weighted local search
Catalogue Search
keyboard interaction
focus management
Back/scroll restoration
Random Access
250-project scale fixture
```

Exit gate:

```text
keyboard/touch search complete
sensible typo/alias/code results
shareable URL state
Back restores archive context
search target <50ms at ~250 fixtures
```

---

## Phase 5 — Living Index Motion

Implement:

```text
hero entrance
Living Index fragments
dormant/wake states
fine-pointer proximity
mobile periodic wake
section line reveals
optional scanner behind feature flag
```

Exit gate:

```text
no pointer lag
no text obstruction
no motion-based misclicks
reduced motion disables expressive behavior
static composition remains excellent
```

---

## Phase 6 — Preview Framework

Implement:

```text
PreviewController
preview state machine
lazy media
synthetic preview contract
video preview contract
visibility/tab handling
mobile behavior
error fallback
```

Prove architecture with:

```text
PDF Studio — tool/synthetic
WORDSTRIKE — game/video
French 3000 — learning/synthetic
```

Exit gate: the same framework supports all three without one-off card architecture.

---

## Phase 7 — Featured Preview Production

Produce P4/P5-quality previews for:

```text
PDF Studio
Manuscript
Clean30
WORDSTRIKE
French 3000
LiGo Quizabend
Analysis II Klausurlabor
```

Every preview must communicate what the project does within a few seconds and remain visually distinct from neighboring projects.

---

## Phase 8 — Full Artifact Records

Implement:

```text
final Artifact hero
Overview
Capabilities/Core Systems/Learning Modes
preview-state capability integration where justified
Gallery with FIG captions
full-screen inspection
Record metadata
Related Artifacts
previous/next
semantic launch verbs
```

Test representative tool/game/learning/beta records.

---

## Phase 9 — Collections

Implement:

```text
collection index
collection pages
composed relationship maps
anchor artifacts
responsive vertical simplification
collection search integration
```

A collection passes only if it teaches relationships beyond what a category filter provides.

---

## Phase 10 — Automation & Catalogue Tooling

Implement:

```text
project:add
projects:discover
sync:github
capture-previews
optimize-media
generate-search-index
generate-og
validate-links
/dev/catalogue/
/dev/design-system/
```

Acceptance test: add a fake next project and verify homepage, archive, counts, search, route, and sitemap update without editing UI code. Remove fixture afterward.

---

## Phase 11 — Performance Hardening

Audit:

```text
JS
CSS
fonts
above-fold media
preview loading/video decode
archive scroll/reflow
search
memory
150–250 project scale
Core Web Vitals
```

Do not continue with visible jank or runaway preview memory.

---

## Phase 12 — Browser & Accessibility Certification

Test:

```text
Chromium
Firefox
WebKit
Chrome Android-size
Safari/iOS-size WebKit
keyboard
touch
screen-reader inspection
reduced motion
forced colors
200% zoom
```

Exit: zero known critical/high accessibility or compatibility issues.

---

## Phase 13 — Art Direction & Visual Regression Audit

Perform full-page and contact-sheet review.

Explicitly inspect for accidental return of:

```text
large roundness
gradient headings
glowing borders
pills
icon circles
glass panels
SaaS metric cards
generic bento layout
repetitive blue screenshots
oversized empty hero space
```

Minimum release scores:

```text
Identity 9.5/10
Uniqueness 9.5/10
Project differentiation 9/10
Homepage composition 9/10
Typography 9/10
Mobile art direction 9/10
Dark mode 9/10
Light mode 9/10
Motion 8.5/10
Coherence 9/10
```

---

## Phase 14 — Release Candidate

Feature freeze.

Run complete regression:

```text
validate
build
tests
links
search every project
launch every listed artifact
Back restoration
theme
no-JS
media-failure fallback
GitHub-metadata failure fallback
mobile
browser matrix
```

Release gate:

```text
0 critical issues
0 high issues
```

Do not add features during RC hardening.

---

## Phase 15 — Production Launch

Deploy `main` to:

```text
https://thiepn.github.io/
```

Production smoke-test:

```text
/
/projects/
representative Artifact Records
representative Collection
404
Catalogue Search
mobile navigation
live project launches
performance
```

After successful smoke tests, tag the first production release (for example `v1.0.0`).

---

# EXECUTION RULES FOR EVERY PHASE

When working on a phase:

1. Inspect the current repository state before editing.
2. Read all authoritative docs.
3. Identify which files/components are legitimately in scope.
4. Implement the phase completely rather than superficially.
5. Preserve all earlier completed behavior.
6. Do not redesign unrelated completed areas.
7. Use current project data rather than inventing fake public metadata, except explicit test fixtures.
8. Keep public UI copy concise and factual.
9. Run the current phase's acceptance tests.
10. Run regression tests for earlier completed phases.
11. Fix regressions before stopping.
12. Report exactly what changed and what was verified.
13. Explicitly state any acceptance criterion that could not be verified; do not silently call the phase complete.
14. State the next phase after completion.

---

# REQUIRED COMPLETION REPORT FORMAT

At the end of each implementation phase, report:

```text
PHASE X — <NAME>

Implemented
- ...

Validation
- npm run ... — PASS/FAIL
- ...

Acceptance gate
- criterion — PASS/FAIL
- ...

Known limitations
- none
or
- ...

Regression status
- no known regressions
or
- ...

Next
Phase X+1 — <NAME>
```

Do not report PASS without actually performing the relevant available check.

---

# FIRST BUILD STRATEGY

Do not import and deeply art-direct all 20 projects immediately.

Once the catalogue layer exists, use these eight deliberately varied projects as the first design-system proof set:

```text
T-001 PDF Studio
T-002 Manuscript
T-003 Clean30
L-001 French 3000
L-004 Analysis II Klausurlabor
G-001 WORDSTRIKE
G-003 Curio
G-007 ECHOFRAME: LAST SIGNAL
```

They cover:

```text
professional tool
editor/publishing tool
productivity
language learning
academic study
arcade game
strategy game
beta action game
```

Before importing/project-art-directing the remainder, verify that the component system can express all eight without one-off structural hacks.

---

# FINAL DEFINITION OF SUCCESS

The implementation succeeds when:

```text
adding project #21 does not require editing UI components
adding project #50 does not require redesigning navigation
adding project #150 does not require a new architecture

search automatically includes new listed projects
counts automatically update
collections consume the same catalogue data
mobile uses the same source records
project previews remain visually distinct
all previews share one lifecycle/controller
motion can fail without breaking navigation
GitHub can be unavailable without breaking the core site
THE INDEX remains recognizable with motion disabled
THE INDEX remains recognizable with project accents removed
THE INDEX does not drift into generic AI/SaaS visual language
```

Do not optimize for how quickly code can be generated. Optimize for a durable, distinctive, scalable project archive.
