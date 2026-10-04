# P5 — Product-Family Vercel Deployment Standard, Environment Contract & Controlled Release Pipeline

P5 turns the Hub's P3/P4 Vercel work into a repeatable product-family release model. It does not deploy or cut over production.

## Standard

Every THIEPN product that needs Vercel server compute should own one Vercel project and its server routes. Shared Core remains separate. Static-only products do not need a Vercel project.

The reference contract lives in `ops/vercel/thiepn-hub.json`. Automatic Git deployments remain disabled and the project remains deliberately unlinked from GitHub. GitHub is source/release history; Vercel is execution.

## Three deployment states

1. **Preview** — manual developer/staging deployment using the existing P3 workflow.
2. **Release candidate** — built with the Vercel **Production environment**, then deployed with `--prod --skip-domain`. This produces production-configured bytes/functions without moving a production alias.
3. **Production** — the already-certified candidate is promoted. It is not rebuilt.

This is intentional. Promoting an ordinary Preview can carry Preview environment values into production. A P5 candidate is built with Production settings first, then withheld from domains until certification.

## Environment contract

`ops/vercel/environment-contract.json` divides configuration into CI-only credentials, public build variables, server-only runtime variables, browser-visible activation variables, and values forbidden in the production Vercel environment.

`VERCEL_TOKEN` is CI-only and must never be a project runtime variable. Service-role/Core/Account secret keys are explicitly forbidden because Hub P4 does not require them.

Production currently forbids every private-Hub activation switch. Consequently the P4 API functions may exist in a production-configured candidate but must answer `HUB_PRIVATE_DISABLED`.

The environment auditor requests Vercel metadata with `decrypt=false` and prints only variable names/counts; values are never requested or logged.

## Controlled release

### Candidate

`vercel-hub-release-candidate.yml` is manual-only. It checks out the requested source ref, records its immutable SHA, runs source qualification, provisions/reuses the manual-only project, audits the Production environment contract, pulls Production project settings, builds with `vercel build --prod`, qualifies the exact Vercel artifact, deploys with `--prebuilt --prod --skip-domain`, re-fetches the exact public bytes, confirms both private Notes endpoints fail closed, and records immutable evidence.

No alias or custom domain is changed.

### Promotion

`vercel-hub-promote.yml` requires a full source SHA, candidate URL and exact text `PROMOTE thiepn-hub`. It checks out that SHA, rebuilds the production-configured comparison artifact, re-runs exact hash/route/fail-closed verification against the supplied candidate, then promotes that exact existing deployment. No rebuild occurs during promotion.

### Rollback

`vercel-hub-rollback.yml` uses the same verification model for a previously certified deployment and requires `ROLLBACK thiepn-hub`. Rollback is implemented as explicit promotion of the selected known deployment rather than an ambiguous previous pointer.

## Current traffic ownership

`thiepn.dev` remains owned by GitHub Pages. P5 does not add the domain to Vercel, alter Cloudflare DNS or disable Pages. Even a future execution of the Vercel promotion workflow changes only the Vercel project's production deployment until a dedicated cutover phase assigns the canonical domain.

## Reuse by future products

Future product families should copy the pattern, not the Hub-specific names: one product manifest, one environment contract, manual candidate build from Production settings, no-domain certification, exact-deployment promotion, explicit certified rollback, product-owned server endpoints, no secret duplication into browser builds, and no automatic deployment merely because code was pushed.

Small static applications stay on their existing static hosting until they actually need server compute.
