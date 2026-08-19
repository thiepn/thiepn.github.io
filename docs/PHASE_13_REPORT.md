# Phase 13 — Visual Regression & Final Art Direction

## Scope

Phase 13 freezes the visual language before the release-candidate phase. It does not introduce product features.

## Implemented art-direction changes

1. Every public artifact now has a dedicated aperture composition. The previous shared typographic fallback no longer represents listed projects.
2. New static compositions were added for Le Carnet Français, Französisch Flashcards, Analysis II Lernsystem, AlgoDat Study System, TMS60, The Bible Challenge, ECHOFRAME: LAST SIGNAL, Skyspire, and Analysis Idle.
3. Collection cards no longer use a generic decorative X. They expose actual relationship labels from collection data.
4. Recent Activity no longer repeats `Indexed in THE INDEX`; it communicates `ADDED / CATEGORY` or `MAJOR UPDATE / STATUS`.
5. Section rules now use small registration endpoints, reinforcing the catalogue language without adding decorative chrome.
6. Instrument Sans and IBM Plex Mono are now build-time self-hosted Fontsource dependencies instead of unresolved family names with system-font fallback.

## Visual regression system

- `visual-regression.config.json` defines 16 canonical views.
- `tests/e2e/phase13.visual.spec.ts` provides Chromium pixel regression baselines.
- `scripts/capture-visuals.mjs` creates a human-review capture set.
- `scripts/build-contact-sheet.mjs` creates a full contact sheet.
- `scripts/audit-visual-language.mjs` enforces anti-generic source rules.
- `scripts/validate-phase13.mjs` enforces the Phase 13 implementation contract.

## Canonical views

Coverage includes homepage, archive, PDF Studio record, WORDSTRIKE record, collections, Browser Games collection, Catalogue Search, both themes, desktop, and mobile.

## Current certification boundary

Source-level art-direction validation can run without browser dependencies. Pixel baselines and human scoring require a rendered Astro build. If npm/Playwright browser installation is unavailable, baseline approval remains pending and must not be fabricated.

## Exit gate

Phase 13 source implementation is complete when all prior source validations pass, all listed projects have dedicated aperture compositions, the visual-language audit passes, the 16-state screenshot manifest is present, and the visual test/capture/contact-sheet tooling is wired.

The final rendered visual gate passes only after `npm run visual:capture`, contact-sheet review, intentional baseline approval via `npm run visual:update`, and `npm run visual:check` succeed.

## Source validation results

Executed successfully in this runtime:

- Phase 0, 2, 3, 4, 5, 6, 7, 8, 9 source validators
- Phase 11 performance/scale source validator
- Phase 12 browser/accessibility source validator
- Phase 13 visual/art-direction validator
- accessibility source audit
- performance source audit
- 250-artifact benchmark
- independent PyYAML catalogue/frontmatter audit
- GitHub Actions YAML parsing
- visual-regression JSON parsing
- TypeScript syntax transpilation of the Phase 13 Playwright configuration and visual suite

Latest 250-artifact benchmark during Phase 13:

- search average: 4.833 ms
- search p95: 6.308 ms
- archive filter p95: 0.082 ms

The Phase 10 Node validator itself cannot execute in this container because its `yaml` npm dependency is unavailable without `npm install`; the same project/collection frontmatter and workflow data were independently parsed with PyYAML and passed.

## Runtime/rendered certification boundary

`npm install` was retried during Phase 13 and timed out again. Consequently the actual Astro build, Fontsource-emitted WOFF2 budget, Playwright pixel baselines, and full-page contact-sheet review cannot be truthfully certified in this runtime.

The repository is prepared so that the first networked certification run is:

```bash
npm install
npm run audit:phase13
npm run visual:capture
npm run visual:contact-sheet
```

After human review of the contact sheet, approve the initial canonical baselines intentionally with:

```bash
npm run visual:update
npm run visual:check
```
