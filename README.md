# THIEPN. / The Living Index

The root project hub for **THIEPN.** — a static catalogue of projects, tools, games, learning systems, resources, and experiments.

This repository is governed by **THE INDEX / DS-01**. The design language is intentional and must not be replaced with generic SaaS/dashboard styling.

## Current state

**Phase 16 — Post-launch hardening**

The production site is live at `https://thiepn.dev/` on the `1.0.0` production source. Phase 15 completed the custom-domain promotion and production deployment; Phase 16 keeps the public experience stable while tightening maintenance, documentation, and deployment guardrails.

Current production invariants:

- `release-production.json` is the machine-readable production release contract;
- `thiepn.dev` is the canonical domain for the root site and public project launch URLs;
- the custom GitHub Pages workflow builds the Astro site and runs post-deploy production smoke checks;
- source validation, cross-browser tests, accessibility checks, scale/performance budgets, and visual-regression coverage remain release gates;
- the frozen `1.0.0` production manifest remains the historical launch record while subsequent work continues on top of it;
- the historical `v1.0.0` Git tag is still an administrative cleanup item and must not be inferred from the production manifest alone.

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
npm ci
npm run dev
```

`package-lock.json` is tracked. Use `npm ci` for reproducible local and CI installs unless dependency metadata is intentionally being changed.

## Validation

Core source and production-invariant checks:

```bash
npm run generated:check
npm run validate
npm run phase15:validate
npm run typecheck
npm run test
npm run build
```

Complete release gate:

```bash
npm run audit:release
npm run release:links
```

End-to-end/browser certification:

```bash
npx playwright install chromium firefox webkit
npm run test:e2e
```

Production smoke can be run explicitly against the custom domain:

```bash
npm run phase15:smoke -- --url https://thiepn.dev/
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
src/data/features.ts                     optional expressive feature flags
src/motion/heroEntrance.ts               homepage entrance choreography
src/motion/sectionReveal.ts              one-shot in-view section reveals
src/motion/proximity.ts                  pure Living Index proximity model
src/motion/archiveReflow.ts              archive FLIP/reflow animation
src/motion/reducedMotion.ts              media-query capabilities
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

Because the repository is named `thiepn.github.io`, Astro intentionally has no project `base` path. Deployment is handled by `.github/workflows/deploy.yml`, which must validate the production source before publishing and smoke-test the deployed custom domain afterward.

## Authoritative documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md)
- [`docs/CONTENT_MODEL.md`](docs/CONTENT_MODEL.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/MASTER_IMPLEMENTATION_PROMPT.md`](docs/MASTER_IMPLEMENTATION_PROMPT.md)
- [`docs/AUTOMATION.md`](docs/AUTOMATION.md)
- [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md)
- [`docs/RELEASE_CANDIDATE.md`](docs/RELEASE_CANDIDATE.md)
- [`docs/PHASE_15_REPORT.md`](docs/PHASE_15_REPORT.md)
- [`docs/PHASE_16_REPORT.md`](docs/PHASE_16_REPORT.md)

These documents are authoritative. Future implementation phases must preserve completed behavior and pass their phase-specific acceptance gates before progressing.

## Design invariant

> Preserve THE INDEX design system. Do not replace its editorial/archive visual language with generic SaaS/dashboard styling. Maintain small radii, structural rules, catalogue codes, clipped Artifact geometry, Instrument Sans + IBM Plex Mono typography, neutral paper/graphite surfaces, restrained project accents, and project-specific aperture content.
