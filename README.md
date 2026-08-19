# THIEPN. / The Living Index

The root project hub for **THIEPN.** — a static catalogue of projects, tools, games, learning systems, resources, and experiments.

This repository is governed by **THE INDEX / DS-01**. The design language is intentional and must not be replaced with generic SaaS/dashboard styling.

## Current state

**Phase 14 — Release Candidate**

The product is feature-frozen at `1.0.0-rc.1`. Phase 14 adds release-only hardening and certification gates:

- every listed project must be searchable and expose its canonical live launch destination;
- archive Back-state, theme persistence, no-JS operation, 404 navigation, search failure, and preview-media failure are release-tested;
- Chromium, Firefox, WebKit, mobile, accessibility, scale/performance, and Phase 13 visual regression remain mandatory gates;
- online repository/live-destination health is checked separately;
- RC certification requires **0 Critical / 0 High defects**;
- a committed `package-lock.json` and approved canonical visual baselines are mandatory before Phase 15.

No new product features are permitted during Phase 14.

## Stack

- Astro
- TypeScript
- Motion
- YAML
- Vitest
- Playwright
- GitHub Actions
- GitHub Pages

## Requirements

- Node.js 22.12 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

The first networked `npm install` generates `package-lock.json`; commit that lockfile before switching CI to `npm ci` during hardening.

## Validation

```bash
npm run validate
npm run catalogue:generate
npm run typecheck
npm run test
npm run build
```

Complete release-candidate gate:

```bash
npm run audit:release
npm run release:links
```

End-to-end/browser certification:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

## Catalogue source of truth

```text
src/content/projects/        one validated record per artifact
src/content/collections/     one validated record per collection
src/data/catalogue-ledger.json
src/data/curation.json
src/data/project-relations.json
src/data/taxonomy.ts
```

The public UI must never hard-code project names, counts, categories, status, URLs, or Featured placement.

`R-001 / Markdown Guide` is intentionally registered as `visibility: hold`, so it retains its permanent archive identity without appearing in public routes or counts.

## Catalogue automation

```bash
# inspect the next permanent code without writing
npm run project:add -- --title "New Project" --category games --dry-run

# add a HOLD record and regenerate derived catalogue files
npm run project:add -- --title "New Project" --category games --repo thiepn/new-project

# verify tracked generated outputs are current
npm run generated:check

# discover unindexed GitHub repositories; never auto-publishes
npm run projects:discover

# refresh cache-backed GitHub metadata
npm run github:sync

# capture deterministic poster source images
npm run preview:capture -- --slug markdown-guide

# validate media and destination links
npm run media:validate
npm run links:validate
```

See [`docs/AUTOMATION.md`](docs/AUTOMATION.md) for the maintenance contract and [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) for the performance/scale contract.

Public machine-readable outputs:

```text
/catalogue.json
/sitemap.xml
```

Internal diagnostics are marked `noindex` and excluded from the sitemap:

```text
/dev/catalogue/
/dev/design-system/
/dev/scale/
```

## Motion and preview architecture

```text
src/data/features.ts                 optional expressive feature flags
src/motion/heroEntrance.ts           homepage entrance choreography
src/motion/sectionReveal.ts          one-shot in-view section reveals
src/motion/proximity.ts              pure Living Index proximity model
src/motion/archiveReflow.ts          archive FLIP/reflow animation
src/motion/reducedMotion.ts          media-query capabilities
src/scripts/living-index-controller.ts
src/scripts/index-motion.ts
src/lib/preview-core.ts                  pure preview limits/timing/lifecycle helpers
src/scripts/preview-controller.ts        shared preview runtime
src/components/artifacts/InteractivePreview.astro
```

Core navigation/search/accessibility behavior must never be feature-flagged or depend on Motion.

## GitHub Pages

Production target:

```text
https://thiepn.dev/
```

Because the repository is named `thiepn.github.io`, Astro intentionally has no project `base` path. Deployment is handled by `.github/workflows/deploy.yml`.

## Authoritative documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/CONTENT_MODEL.md`](docs/CONTENT_MODEL.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/MASTER_IMPLEMENTATION_PROMPT.md`](docs/MASTER_IMPLEMENTATION_PROMPT.md)
- [`docs/AUTOMATION.md`](docs/AUTOMATION.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/PHASE_11_REPORT.md`](docs/PHASE_11_REPORT.md)

These documents are authoritative. Future implementation phases must preserve completed behavior and pass their phase-specific acceptance gates before progressing.

## Design invariant

> Preserve THE INDEX design system. Do not replace its editorial/archive visual language with generic SaaS/dashboard styling. Maintain small radii, structural rules, catalogue codes, clipped Artifact geometry, Instrument Sans + IBM Plex Mono typography, neutral paper/graphite surfaces, restrained project accents, and project-specific aperture content.
