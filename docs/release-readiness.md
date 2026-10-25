# THIEPN Release Readiness Checker v1

A read-only, per-app release-evidence validator, not a product-quality oracle. It does not publish, modify the Hub catalog, migrate data or deploy software. The separate inventory at `ops/release-candidates.json` is distinct from the Hub's legacy registries and release authorizations.

## Run

```sh
npm run test:release-check
GITHUB_TOKEN=... CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
  npm run release:check -- --app tms60 --browser --out /tmp/tms60-readiness.json
npm run release:check -- --app roomtone-karaoke --json
```

Use **read-only** GitHub Actions and Cloudflare Pages API tokens. No token with deployment permissions is required. The CLI makes GET requests only and does not dispatch workflows. `--browser` uses the Hub's existing Playwright dependency and examines an anonymous mobile-viewport entry shell in fresh Chromium. Without it, the live gate remains `NOT_TESTED`. A missing token or API failure never produces a pass.

**States:** `PASS` is execution evidence for the specified check. `FAIL` is a demonstrated blocking condition. `NOT_TESTED` means the necessary evidence is absent or cannot be evaluated. All six gates passing produces `QUALIFIED`; any failure produces `BLOCKED`; otherwise `HOLD`. Exit codes are 0, 1 and 2 respectively.

## Evidence rules

Cloudflare Pages metadata must identify the expected repository, canonical hostname, production branch and latest successful *production* deployment. Recent preview deployments must never substitute for production. GitHub Actions evidence must match the deployed commit SHA, the explicitly selected workflow path, the job and the executed test step. A successful unrelated workflow, skipped step or old commit cannot qualify an app.

`requiredJourneys` lists essential actions. `journeyEvidence` can reference an Actions run URL, job and successful step for that same deployed SHA; maintainers must independently inspect test semantics before adding any mapping. A merely named test is not proof of functional coverage. Missing journey mappings result in `NOT_TESTED`.

`review` is intentionally null for both initial pilots. A future release review may record `sha`, `reviewer: "thiepn"`, `reviewedAt`, `decision` and `blockers`. This is an owner attestation, not independent security proof or authorization to publish the Hub listing. In particular, a passing anonymous browser smoke does not prove accounts, data isolation, offline operation or durable persistence.

**Pilot limitations:** TMS60's selected existing workflow is a GitHub Pages release workflow; its Cloudflare production SHA may be different, and the checker must not combine their evidence. ROOMTONE has no verified exact-SHA release workflow and needs genuine physical microphone/speaker qualification; its empty CI contract is deliberately `NOT_TESTED`. Do not invent release workflows or device measurements.

## Deliberate v1 boundary

- Supports only explicitly configured root-hosted `*.thiepn.dev` Cloudflare Pages projects owned by `thiepn`.
- Reads GitHub Actions runs/jobs and Cloudflare project/deployment metadata. Pagination is bounded, and incomplete enumeration prevents qualification.
- Does not clone, build or execute code from candidate repositories.
- Does not run application-specific core journeys; reuses their actual CI evidence and reports gaps.
- Does not request microphone access, perform authenticated writes, check physical devices, mutate databases or test production persistence.
- Does not modify the Hub catalog, the 27-entry legacy release constraints, DNS, deployments, account settings or release approvals.

The existing Hub quality, deployment authorization, profile checks and production-smoke scripts remain authoritative for the Hub itself. App qualification is additional information; promotion is a separate owner-controlled operation.
