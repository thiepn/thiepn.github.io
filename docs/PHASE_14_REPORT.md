# Phase 14 — Release Candidate

Phase 14 freezes THE INDEX at `1.0.0-rc.1` and adds a permanent release gate. No product feature was added.

## Implemented

- Release-candidate manifest and 0 Critical / 0 High severity contract.
- Dependency-free RC source audit covering all public project identities, routes, search metadata, launch metadata, HOLD/dev exclusion, no-JS fallbacks, media failure fallback, theme bootstrap, GitHub metadata fallback and sitemap hygiene.
- Cross-browser release Playwright suite covering search of every listed project, every Artifact Record launch URL, Back-state restoration, theme persistence, search-index failure, preview-media failure, 404, no-JS catalogue and mobile overflow/navigation.
- Dedicated Release Candidate GitHub Actions workflow with full audit, three browser engines and online destination health checks.
- Required Phase 13 baseline gate: RC cannot certify until all canonical visual baselines are explicitly approved and committed.
- Required reproducible-install gate: a `package-lock.json` matching `1.0.0-rc.1` must be generated in a networked environment, reviewed, and committed.

## Feature freeze

The only permitted Phase 14 code changes are release-blocker fixes. New product features are prohibited.

## Certification status

Source-level RC checks pass with no known Critical or High product defect. Full RC certification is deliberately blocked until:

1. a tracked `package-lock.json` exists for `1.0.0-rc.1`;
2. all 16 Phase 13 visual baselines are rendered, reviewed, approved, and committed;
3. the networked Astro/Vitest/Playwright browser suite completes;
4. online repository/live-destination health checks complete.

The permanent gate is `npm run audit:release` plus `npm run release:links`.

## Source audit snapshot

The Phase 14 source audit currently resolves:

- 20 registered projects;
- 19 public projects;
- 6 collections;
- 29 generated public routes;
- every public project present in the search index with matching code/title/repository/live URL;
- every project record route present;
- no HOLD project leakage;
- no `/dev/` route leakage;
- theme, no-JS, media-failure and GitHub-cache fallback contracts present.

A dependency-free search smoke test additionally verifies that all 19 projects resolve first for exact title, catalogue code, and repository queries, and that all six collections resolve first for their exact titles.

## Certification blockers in this build snapshot

These are certification/process blockers, not known product defects:

- `package-lock.json` is not present because this execution environment cannot access the npm registry. The RC gate intentionally fails until a reviewed lockfile is committed.
- `tests/visual/baselines/` contains no approved PNG baselines yet. The RC gate intentionally fails until all 16 Phase 13 states are rendered and approved.
- Astro/Vitest/Playwright and the actual Chromium/Firefox/WebKit matrix cannot execute until dependencies/browser binaries can be installed.
- Online HTTP health for every live GitHub Pages destination must run in the networked RC workflow.

**Known source-level Critical defects:** 0  
**Known source-level High defects:** 0  
**Full RC certification:** blocked until the four gates above pass.
