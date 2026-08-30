# Phase 16 — Post-launch Hardening

## Objective

Phase 16 begins after the successful `1.0.0` production deployment. Its purpose is to make continued development safer and clearer without destabilizing the public portfolio experience.

The first tranche is deliberately operational: align repository documentation with reality, restore missing maintenance documentation, and ensure production-domain invariants are enforced before later changes can reach GitHub Pages.

## Phase 16A scope

### Production guardrails

- Run `phase15:validate` in the ordinary Quality workflow for every pull request and push to `main`.
- Run the production-source validator inside the authoritative Pages deployment workflow before the Astro build is published.
- Keep post-deploy smoke verification against `https://thiepn.dev/` as the final deployment gate.

This creates two independent boundaries: source that violates the production contract fails CI, and source that somehow reaches the deployment workflow still cannot publish before the same invariant check passes.

### Documentation integrity

- Update the README from the obsolete Phase 14 / `1.0.0-rc.1` state to the actual post-launch `1.0.0` state.
- Close the outdated Phase 15 deployment-blocker narrative using verified production evidence.
- Add the previously referenced but missing `docs/PERFORMANCE.md` contract.
- Remove the broken README reference to a nonexistent `docs/PHASE_11_REPORT.md` and point maintainers to the executable performance contract instead.
- Document the outstanding historical `v1.0.0` tag explicitly rather than implying it exists.

### Performance contract

`docs/PERFORMANCE.md` records the limits already enforced by `performance-budgets.json` and the existing performance scripts, including:

- initial JavaScript, CSS, and useful-transfer limits;
- search-index, preview-media, and font limits;
- Core Web Vitals thresholds;
- 250-project search/archive interaction ceilings;
- source-level lazy-loading, code-splitting, event-delegation, and render-containment invariants.

The JSON budget file and executable audits remain the technical source of truth.

## Deliberate non-goals

Phase 16A does **not** redesign the homepage, archive, project cards, typography, color system, motion language, or navigation model. Production is stable; operational inconsistencies should be removed before a new visible product tranche is introduced.

It also does not auto-create `v1.0.0`. The tag must point at the intended historical launch commit, not whichever maintenance commit happens to run next.

## Acceptance gates

The Phase 16A pull request must pass the repository's full Quality workflow, including:

- generated catalogue freshness;
- structural and production-source validation;
- automation fixture;
- performance, accessibility, and visual source audits;
- 250-artifact scale benchmark;
- typecheck and unit tests;
- production build and built-output budgets;
- responsive/cross-browser Playwright certification.

After merge, the authoritative Pages workflow must complete build, deploy, and production verification successfully.

## Known repository-administration cleanup

GitHub may still start a legacy Jekyll `pages build and deployment` workflow while the custom Astro workflow is authoritative. Repository Pages settings should use **GitHub Actions** as the publishing source so that legacy workflow noise disappears.

This is not solved by making Jekyll build the Astro source tree; doing that risks creating a competing deployment path.

## Next tranche

Once Phase 16A is merged and production-verified, continue with **Phase 16B — Portfolio usefulness and discovery audit**: evaluate the live homepage, project archive, project detail pages, collections, books, mobile navigation, and external project-launch journeys for user-visible improvements. Only changes with a clear usability, information-quality, or conversion benefit should be implemented.
