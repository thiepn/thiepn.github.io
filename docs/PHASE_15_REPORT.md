# Phase 15 — Production Launch Report

## Status

**Production source implementation: COMPLETE**  
**Production deployment: COMPLETE**  
**Post-deploy production verification: PASS**  
**v1.0.0 tag: NOT CREATED**

Phase 15 promoted THE INDEX from the Phase 14 release candidate to the production identity:

- Release: `1.0.0`
- Phase: `15`
- Repository: `thiepn/thiepn.github.io`
- Canonical site: `https://thiepn.dev/`
- Intended historical release tag: `v1.0.0`

`release-production.json` is the machine-readable launch manifest. The public site is live on the custom domain and the authoritative Astro Pages workflow has completed its build, deploy, and production-verification jobs successfully.

## Production changes implemented

- Canonical Astro site changed from `https://thiepn.github.io` to `https://thiepn.dev`.
- Catalogue launch URLs use the `https://thiepn.dev/<repository>/` custom-domain form.
- Root and public `CNAME` files declare `thiepn.dev`.
- `robots.txt` points to `https://thiepn.dev/sitemap.xml`.
- Package/release metadata is promoted to `1.0.0` / Phase 15.
- Reproducible CI uses the tracked lockfile and `npm ci`.
- `phase15:validate`, `phase15:smoke`, and Phase 15 promotion tooling are present.
- The custom Pages workflow builds the Astro artifact and runs production smoke checks after deployment.
- Production smoke covers the required public routes, machine-readable catalogue and sitemap outputs, generated artifact routes, live project destinations, and custom-domain availability according to the current production manifest and generated catalogue.

GitHub Pages custom-domain routing is therefore treated as a production invariant: the root site and project launch URLs must continue to resolve through `thiepn.dev` rather than drifting back to default `github.io` canonicals.

## Verification evidence

A production deployment on 2026-08-30 for main commit `1efdd922c9e923c888a030add499ab7d3fe48654` completed all three authoritative workflow jobs successfully:

1. `build` — Astro source built and the Pages artifact was uploaded.
2. `deploy` — the artifact was deployed to GitHub Pages.
3. `verify` — `scripts/smoke-production.mjs` passed against `https://thiepn.dev/`.

This supersedes the earlier Phase 15 state in which deployment was blocked by GitHub App repository authorization.

## Source gates

The production release path includes the following release protections:

- foundation and structural validation;
- production-domain/source invariant validation;
- generated catalogue freshness and integrity;
- accessibility source and browser audits;
- visual-language and visual-regression coverage;
- source and built-output performance budgets;
- 250-artifact scale benchmarking;
- TypeScript and unit tests;
- cross-browser Chromium, Firefox, and WebKit certification;
- link and live-destination health checks;
- post-deploy custom-domain smoke verification.

Phase 16 additionally requires the ordinary Quality workflow and the deployment workflow itself to run the Phase 15 production-source invariant validator, so later maintenance cannot bypass the canonical production contract.

## Residual release administration

### 1. Historical `v1.0.0` tag

The production manifest records `v1.0.0` as the intended release tag, but the Git ref is not currently present.

Do not create that tag automatically on an arbitrary later maintenance commit. Resolve it only after identifying the exact intended launch commit from the release history, then point `v1.0.0` at that commit.

### 2. Legacy Pages workflow noise

GitHub is still capable of starting its legacy `pages build and deployment` / Jekyll path. On the same 2026-08-30 main commit, that legacy build failed at `Build with Jekyll`, while the repository's authoritative Astro `Deploy to GitHub Pages` workflow succeeded and verified production.

The repository workflow attempts to migrate Pages publishing mode to GitHub Actions. If GitHub repository settings still remain on branch/Jekyll publishing, change **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. This is repository administration, not an Astro application defect.

## Phase 15 closeout

Phase 15 is closed for source promotion and production deployment. Future work belongs to post-launch maintenance and product improvement phases and must preserve the `1.0.0` production invariants, THE INDEX design system, accessibility guarantees, performance budgets, catalogue integrity, and custom-domain deployment path.
