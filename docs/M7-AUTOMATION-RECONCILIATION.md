# M7 — Post-M3 automation and Quality reconciliation

Status: **documentation-only draft; not merged; no deployment or workflow dispatch authorized**.

## Verified source history (11 October 2026)

- Original main: `32cb1bee04387119ff9f382f16fd5dfd699009a1`.
- Owner-authorized M3 PR #116 merged by GitHub's **merge-commit** method as `859e2b3f6087d8dcc2dd2d001f55d5f2264e44d5`. Its parents are the original main SHA and M3 qualified head `c92b8bdfac899d0571d04907fb1c28cecdd240ab`.
- Exact merged-main Quality **push** run [#38101148037](https://github.com/thiepn/thiepn.github.io/actions/runs/38101148037) completed **success** on the merge SHA (not on the later main tip). Its retained original `studio-certification` artifact ID is `11687906980`.
- Existing `capture-hub-media.yml` ran automatically on the M3 workflow-file change. Its run [#38101147997](https://github.com/thiepn/thiepn.github.io/actions/runs/38101147997) completed successfully and pushed `29537702c4e3698cb780bcc3c479e385d29bd3c8`, a direct child of the M3 merge commit, as `github-actions[bot]`.
- The bot commit updated **only** twelve `src/assets/hub/*.webp` generated images (canvas, french-3000, gomoku, mathlab, micro-arcade, notes, signal-earth, skyspire, steadybar, thiepn-library, tms60, voidcut) and `src/generated/hub-media.json`; it did not edit source code or workflow files.
- At preflight, that bot SHA was the current `main` tip. It had **no Quality run and no check runs**. Actions triggered by a push authenticated with the standard `GITHUB_TOKEN` do not launch a new ordinary push workflow, to prevent recursive automation.

## Why a new merged-main Quality run is required

The M3 owner-gated `.github/workflows/deploy.yml` accepts **manual workflow_dispatch only** with `release_sha` equal to the current `main` SHA. `scripts/authorize-pages-release.mjs` independently requires a successful completed `.github/workflows/quality.yml` **push** run for that exact current SHA and owner initiation/rerun. Successful CI for the parent merge commit does **not** qualify the bot-child SHA, and rerunning the previous Quality job does not change its source SHA.

## Owner-controlled recovery candidate — this PR

This draft adds **only this `docs/M7-AUTOMATION-RECONCILIATION.md` file** on a branch cut from `29537702c4e3698cb780bcc3c479e385d29bd3c8`. It changes no generator, media, release, source, secret or production setting. All six generated-output workflows were inspected at that exact source: each auto-push path filter excludes `docs/M7-AUTOMATION-RECONCILIATION.md`. `quality.yml` has `pull_request` and `push: main` triggers.

1. Owner reviews this draft's one-file diff and all exact-head PR CI. **Do not merge automatically.**
2. With separate owner approval, recheck current main and the PR head, then merge through normal PR review. Record the **actual** resulting `main` SHA; never assume a PR head is the merge SHA.
3. Wait for and verify a **completed successful Quality push** run at the **actual current main SHA**. Recheck that no subsequent bot or unrelated commit has moved `main`.
4. If `main` moves, Quality fails, the changed-file scope expands, a generator unexpectedly runs, or Pages attempts deployment, **stop** and obtain a new owner-approved recovery decision. Do not waive M3 or treat PR CI as sufficient.
5. After exact-main qualification, separately reconcile M4 draft PR #117 onto the new main baseline, preserve M5 draft PR #118 ancestry, and run fresh exact-head CI **before** requesting the distinct M4 merge authorization.
6. GitHub Pages release, generator artifact acceptance, branch protection and M5 merge remain **separate owner gates**; none is authorized by this document or its eventual merge.

## Scope, limitations and rollback

This documentation commit is intended only to create a reviewable, non-generator-triggering main change after a separately approved merge. It does **not** certify the previous bot-generated media, trigger or guarantee a main-push CI run by itself, or publish anything. No live production site, database, provider settings, DNS, credentials, deployment or release workflow is accessed or modified in this phase.

Before merge: close the draft and delete its source branch if separately authorized; main and production remain unaffected. After merge: retain the audit trail or use an independently approved revert PR. Never force-push `main`, dispatch production, or relax the exact-main Quality release rule to resolve a CI gap.
