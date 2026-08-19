# THE INDEX — Visual Regression Contract

Phase 13 makes visual quality a maintained engineering constraint rather than a one-time styling pass.

## Canonical coverage

The canonical set is defined in `visual-regression.config.json` and must cover:

- homepage, archive, Artifact Record, collection index, Collection Record, and Catalogue Search;
- light and dark themes;
- 1440×900 desktop and 390×844 mobile;
- at least one tool, game, and collection relationship surface.

The Chromium baseline is the pixel-comparison reference. Firefox and WebKit remain behavioral/accessibility certification targets from Phase 12; they are not expected to rasterize identically to Chromium.

## Commands

```bash
npm run visual:audit
npm run build
npm run visual:capture
npm run visual:contact-sheet
npm run visual:update
npm run visual:check
```

- `visual:audit` checks source-level art-direction invariants and prohibited generic patterns.
- `visual:capture` creates full-page canonical captures under `artifacts/visual/current/`.
- `visual:contact-sheet` creates an editorial contact sheet from those captures.
- `visual:update` intentionally approves new Playwright baselines. It must only be run after human review of the contact sheet.
- `visual:check` compares the implementation with approved baselines.

## Approval rule

Never update baselines simply because a visual test fails. A baseline change is allowed only when:

1. the change is intentional;
2. the current contact sheet has been reviewed as a whole, not one screenshot at a time;
3. light/dark and desktop/mobile still feel like the same product;
4. the project still passes the anti-generic audit;
5. project aperture differentiation has not regressed.

## Art-direction invariants

Outside project apertures, THE INDEX owns the visual language: warm paper/graphite surfaces, precise rules, clipped artifact geometry, self-hosted Instrument Sans hierarchy, self-hosted IBM Plex Mono metadata, sparse registration marks, and project accent as a minority signal.

Inside project apertures, the artifact owns the visual language. A public project may not fall back to an identical title card whose only meaningful difference is accent color.

Prohibited drift includes glassmorphism, blurred decorative blobs, giant rounded cards, gradient headings, large soft shadows, pill-heavy navigation, bouncing/spring-heavy motion, generic dashboard metrics, icon bubbles, and decorative motifs that do not communicate catalogue structure.

## Contact-sheet review questions

Reviewers should inspect the entire set and answer:

- Does the site remain unmistakably THIEPN. with screenshots and project colors mentally removed?
- Do PDF Studio, Manuscript, learning tools, and games feel like genuinely different artifacts?
- Is the homepage hierarchy clear within three seconds?
- Is there a coherent relationship between light and dark themes rather than two separate designs?
- Does mobile preserve composition and hierarchy instead of merely stacking desktop blocks?
- Are any sections becoming repetitive boxes?
- Does any component resemble generic AI-generated SaaS UI?
- Are large type, whitespace, rules, and project imagery balanced rather than cramped or empty?

## Acceptance targets

Phase 13 targets the locked qualitative thresholds:

- identity / uniqueness: **≥ 9.5 / 10**
- project differentiation: **≥ 9 / 10**
- homepage composition: **≥ 9 / 10**
- typography: **≥ 9 / 10**
- mobile art direction: **≥ 9 / 10**
- light theme: **≥ 9 / 10**
- dark theme: **≥ 9 / 10**
- cross-page coherence: **≥ 9 / 10**
- motion coherence: **≥ 8.5 / 10**

These scores require rendered human review. Source validation alone may not award the final scores.
