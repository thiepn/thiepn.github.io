# Phase 16B-10 — Post-launch workflow hygiene

## Baseline

Phase 16B-9 is production-verified. PR #26 passed the complete Quality workflow, then the authoritative Pages workflow completed build, deploy, and custom-domain verification successfully against `https://thiepn.dev/`.

The new bounded-concurrent smoke runner retained the full production scope—35 public routes, 24 live project launches, homepage/catalogue/sitemap readiness checks, and the custom 404—and completed the network verification itself in roughly 1.1 seconds at concurrency 6.

## Findings

The post-launch repository audit found three remaining launch-era inconsistencies:

1. `Link Health` and `Media Audit` still used `npm install` even though the tracked `package-lock.json` and the repository's normal CI contract require reproducible `npm ci` installs.
2. `Phase 15 Bootstrap` and `Phase 15 Final Certification` remained as write-capable workflows for the old `agent/phase15-production` materialization path. The production site has already launched and subsequent phases use the ordinary Quality, Production Certification, generated-asset, and Pages workflows instead.
3. The visible site footer still described THIEPN as an `Independent project universe`, conflicting with the current Portfolio identity already used by metadata, the web-app manifest, and generated social cards.

## Changes

Phase 16B-10:

- changes routine Link Health dependency installation from `npm install` to `npm ci`;
- changes routine Media Audit dependency installation from `npm install` to `npm ci`;
- removes the obsolete `.github/workflows/phase15-bootstrap.yml` workflow;
- removes the obsolete `.github/workflows/phase15-finalize.yml` workflow;
- changes the footer descriptor to `Independent software & research portfolio`;
- adds a unit/source-contract test that requires the two routine audit workflows to use the lockfile and prevents the obsolete Phase 15 materialization workflows from returning.

## Non-goals

This tranche does not modify application behavior, project catalogue data, the production deployment workflow, the manual Production Certification workflow, generated-asset workflows, or the historical Phase 15 release record.

## Acceptance

The final head must pass the complete Quality workflow. After merge, the authoritative Pages workflow must pass build, deploy, and `thiepn.dev` production verification.
