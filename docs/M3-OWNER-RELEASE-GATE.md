# THIEPN Hub M3 — owner-controlled Pages release pilot

Status: DRAFT BRANCH ONLY. No DNS, deployment, GitHub protection or production setting change is included.

## Design

Repository: thiepn/thiepn.github.io, based on main 32cb1bee04387119ff9f382f16fd5dfd699009a1.

- Keep GitHub Pages at https://thiepn.dev/, existing Astro build, qualified artifact, live smoke and exact-artifact checks.
- Use the existing Quality workflow, supplemented with small deterministic release authorization tests; do not create duplicate costly browser suites.
- The release workflow has **only** workflow_dispatch, not push. An approved main merge will qualify code but cannot itself deploy via this workflow.
- Dispatch must select main and give its exact full 40-character lowercase commit SHA.
- GitHub initiating actor and rerun actor must both be thiepn. Only a completed successful Quality **push** workflow at the exact SHA qualifies. PR-only checks do not.
- Fail closed if main moved, if credentials/API lookups are unavailable, or if CI is not verified.
- Check these conditions before build and immediately before Pages deploy; checkout the specified commit in all jobs.
- Use the existing github-pages deployment environment. Never attempt to change Pages publishing mode automatically; an incorrect mode fails validation.
- Preserve the current production URL, public Hub build validation, qualified artifact and postdeployment smoke.

## Proposed GitHub Free solo-owner main protection — NOT activated

Public GitHub repos support branch protection and rulesets on Free. After real PR checks are qualified:
1. In repository Settings > Branches or Rules > Rulesets, target main.
2. Require a pull request and the exact observed Quality / quality status check (verify name and source in UI first).
3. Do not require another person's PR review or enforce impossible owner self-approval.
4. Block force push and branch deletion, and consider enforce-for-admins once the green owner merge path is verified.
5. Do not require post-deployment CI checks as pre-merge checks.
6. Wait for successful Quality on exact merged main SHA; then explicitly authorize a manual release.
7. Optional required environment reviewers on the public repo are a SEPARATE setting; do not enable prevent-self-review when the owner is the sole reviewer.

## Main-writing automation collision

Six existing workflows can push generated assets back to main or the triggering ref and will collide with enforced require-PR rules:
- .github/workflows/brand-icons.yml
- .github/workflows/capture-hub-media.yml
- .github/workflows/capture-previews.yml
- .github/workflows/capture-project-media.yml
- .github/workflows/og-assets.yml
- .github/workflows/refresh-generated.yml

These are not modified in M3. Before enabling strict rules, migrate bot changes to reviewable PR branches or upload-only artifacts. Do not bypass protection for the automation token.

## Safe acceptance

- Exact draft-head Quality must succeed and include the offline authorization unit tests.
- Manual release workflow must have no push trigger and no alternative automatic Pages deployment path.
- Tests reject nonowners, different rerun actor, wrong repo/event/branch, stale or malformed SHAs, unavailable APIs and missing/PR-only/failed main-push Quality.
- No manual dispatch, Pages release, new GitHub environment, repository setting mutation, credential access, domain change or live user-data action in this pilot.

## Owner-approved activation and recovery

Activation requires a separate explicit owner approval to merge after review and exact-head passing CI. Protection setting activation likewise requires its own approval and review of the six automated main writers.

After merge, GitHub Pages stays on its previous deployment until a qualified exact-main release is manually dispatched. Do not infer permission to release from permission to merge.

Before merge, closing the draft abandons the changes without affecting production. If merged and automatic publication is desired again, a separately qualified, approved revert PR restores the previous workflow. If a future release fails, preserve the last-known-good artifact and use a newly qualified owner-approved source revert and manual Pages release; no instant rollback is assumed.

Residual: without protected main, a writer can modify release code. A final API check also has a narrow race against main movement. The manual owner gate is not a substitute for branch protection.
