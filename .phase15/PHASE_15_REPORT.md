# Phase 15 — Production Launch Report

## Status

**Production source implementation: COMPLETE**  
**Production deployment: BLOCKED BY GITHUB APP REPOSITORY AUTHORIZATION**  
**v1.0.0 tag: NOT CREATED**

Phase 15 promotes THE INDEX from the Phase 14 release candidate to the production identity:

- Release: `1.0.0`
- Phase: `15`
- Repository: `thiepn/thiepn.github.io`
- Canonical site: `https://thiepn.dev/`
- Release tag after verified deployment: `v1.0.0`

## Production changes implemented

- Canonical Astro site changed from `https://thiepn.github.io` to `https://thiepn.dev`.
- All catalogue launch URLs now use `https://thiepn.dev/<repository>/`.
- Root and public `CNAME` files declare `thiepn.dev`.
- `robots.txt` points to `https://thiepn.dev/sitemap.xml`.
- Package/release metadata promotes to `1.0.0` / Phase 15.
- Reproducible CI switches to `npm ci` after the release lockfile exists.
- `phase15:validate`, `phase15:smoke`, and Phase 15 promotion tooling were added.
- The Pages deployment workflow now runs production smoke checks after deployment.
- `v1.0.0` is created automatically only after the production smoke gate passes.
- Production smoke covers the homepage, catalogue JSON, sitemap, every generated public route, all 19 launch destinations, and the custom 404.

GitHub documents that a custom domain configured on a user site becomes the default custom domain for project sites owned by the same account. This is why production catalogue URLs use `thiepn.dev/<repository>/` rather than the default `thiepn.github.io/<repository>/` form.

## Source gates executed locally

- Phase 0 foundation validation — PASS
- Phase 14 forward-compatible validation — PASS
- Phase 15 production-source validation — PASS
- Release source audit — PASS
- Accessibility source audit — PASS
- Visual-language source audit — PASS
- Phase 11 source performance audit — PASS
- 250-artifact benchmark — PASS

Latest 250-artifact benchmark during Phase 15:

- Search average: ~5.0 ms
- Search p95: ~6.4 ms
- Archive p95: ~0.08 ms
- Required ceiling: 50 ms

## Remaining deployment blockers

### 1. GitHub App write scope

The connected GitHub App installation can read the repository publicly, but the installation does not currently include `thiepn/thiepn.github.io` in its selected repository set. Both release-branch creation and an unattached Git blob write returned:

`403 Resource not accessible by integration`

The app installation currently lists eight accessible repositories and does not include the root Pages repository.

Until the repository is added to the GitHub App installation, ChatGPT cannot create the release branch, commit the source, open the production PR, merge it, or launch Pages.

### 2. Tracked package lock

This runtime cannot reach the npm registry, so it cannot create the final `package-lock.json`. Phase 15 includes a GitHub Actions candidate-preparation workflow design that generates the lockfile in GitHub's networked runner and validates it before release.

### 3. Approved visual baselines

The 16 Phase 13 canonical states still require a networked Astro/Playwright render and visual review before approval. The launch flow captures and uploads those states first; baselines are only created after explicit visual approval.

## Intended final release sequence

1. Add `thiepn/thiepn.github.io` to the existing GitHub App installation.
2. Create `agent/phase15-production` from `main`.
3. Publish the frozen RC source to that branch.
4. GitHub Actions installs dependencies, creates the lockfile, runs RC/browser/link checks, and captures all 16 canonical states.
5. Review the uploaded visual contact sheet.
6. Approve the visual gate.
7. The Phase 15 promotion workflow generates baselines, promotes the source to `1.0.0` / `thiepn.dev`, and runs `audit:release`.
8. Open the final PR and require all CI checks to pass.
9. Merge to `main`.
10. GitHub Pages deploys the Astro build.
11. Post-deploy production smoke verifies every public route and all 19 project destinations on `thiepn.dev`.
12. Only after that smoke passes, create `v1.0.0`.

Phase 15 intentionally does not bypass any of these gates.
