# THIEPN. / THE INDEX — Release Candidate Contract

**Release:** `1.0.0-rc.1`  
**Phase:** 14  
**Status:** feature freeze

## RC rule

Phase 14 adds no product features. Changes are permitted only to fix reproducible release blockers, regressions, broken destinations, accessibility/browser defects, performance regressions, visual regressions, or incorrect release tooling.

## Severity gate

The release candidate may advance to Phase 15 only with:

- **0 Critical defects** — data loss, navigation failure, site unusable, major privacy/security problem, build/deploy failure, inaccessible core path.
- **0 High defects** — broken project launch, broken search for a listed artifact, serious responsive overflow, keyboard trap, major browser incompatibility, missing public route, severe visual corruption, Core Web Vitals/budget failure that materially harms normal use.
- Medium/Low issues must be documented and may not undermine the product's stated core experience.

## Mandatory release checks

1. A reviewed `package-lock.json` matching the RC version is committed.
2. Generated catalogue outputs are current.
3. Catalogue ledger/taxonomy/relations/media/link syntax validate.
4. Every listed project appears in Catalogue Search by exact title and code.
5. Every listed Artifact Record exposes the canonical live destination.
6. Every repository/live URL passes the online health check.
7. Back navigation restores archive query/category/sort/view context.
8. Theme preference persists across routes and pre-paint bootstrap remains intact.
9. No-JavaScript mode exposes the full public catalogue and core navigation.
10. Preview-media failure leaves the project-specific static aperture usable.
11. Search-index failure leaves ordinary project navigation usable.
12. GitHub metadata failure uses stale/cache-or-unavailable data and cannot block the local catalogue.
13. Chromium, Firefox and WebKit desktop certification passes.
14. Mobile Chromium/WebKit certification passes for mobile-specific cases.
15. Accessibility source + browser suites pass.
16. Performance source, 250-project scale and built budgets pass.
17. Phase 13 visual language audit passes.
18. Approved visual baselines exist for every canonical Phase 13 target and pixel regression passes.
19. 404 and production fallback routes remain useful.

## Commands

```bash
npm install
npx playwright install --with-deps chromium firefox webkit
npm run audit:release
npm run release:links
```

`npm run audit:release` intentionally refuses RC certification when the committed lockfile or approved visual baselines are missing.

## Feature-freeze discipline

During RC hardening:

- do not alter catalogue scope except to correct invalid/broken entries;
- do not add homepage sections, new navigation concepts, accounts, analytics, WebGL, CMS, service workers, or other postponed systems;
- do not refresh visual baselines merely to make a failure disappear;
- do not downgrade tests or budgets to accommodate a regression;
- fix the cause, rerun the complete gate, and document the defect severity.

## Phase 15 handoff

Only after this contract passes should Phase 15 deploy `main` to `https://thiepn.github.io/`, run production smoke checks, verify representative launch destinations on the deployed hub, and tag `v1.0.0`.
