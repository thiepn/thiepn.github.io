# THIEPN Hub CI R4 — Independent Owner Readiness Decision

**Current decision: HOLD / NO_GO.** This source-only packet is not a request to approve a secret, GitHub App installation, trust-root transfer, workflow trigger, private-source checkout, integration execution, merge or deployment. No such authorization has been given.

## 1. Exact evidence and fixed prerequisites

- Base: CI R3 draft PR #128, commit `384d60ce988ef849ac3b2d2da52b8e35c2bb6340`, on CI R2 #126 `978e70c6960d2f8dff561bffbe0d49dfef046931`, R1 #125 `ba011df894ec44a583e3d8eb55b90e8a1f1c40e2`, Habits V1 #123 and V0 #122. All drafts remain unmerged. Main last verified `29537702c4e3698cb780bcc3c479e385d29bd3c8`.
- Qualified R3 Quality run `38173928691`: 0 Astro errors, 536 Vitest pass, 684 Playwright pass. Original artifact `11715446749`: 44,592,287 bytes, SHA-256 `f9d2be42949699ea5ca0f12ee87831148c0147f3fe79b0acdfded829d58032f2`, 55/55 ZIP CRC valid; original browser JSON 684 expected, zero unexpected/skipped/flaky, 40 reference PNGs byte-identical to V0/V1/R1/R2.
- R3 Notes and Library succeeded: Notes 43 integration + 16 contract tests, original Notes artifact `11715455818` valid; Library 63 browser tests. Five Account-paired jobs at R3 failed deliberately at `BLOCKED_UNTRUSTED_PR` before fetching private Account, with full original job logs. Sixth cross-app job was not triggered by R3-only changes; its original R1 log confirmed the same block. No actual private paired suite executed.
- Original R3 H15 release receipt remains `AWAITING_EXTERNAL_EVIDENCE` / `NO_GO`, seven human gates OPEN, original owner approvals 0, real physical observations 0, and release/merge/deploy/migration/purge/rollback false.

## 2. Read-only security observations and gaps

| Item | Observation | Decision consequence |
| --- | --- | --- |
| Hub | Public; branch `main` protection query returned HTTP 403; rulesets query returned `[]` | Branch protection and workflow edit controls NOT VERIFIED, despite an empty ruleset response |
| Account | Private; `main` protection query returned HTTP 403 | Treat branch controls and independent custody as NOT VERIFIED |
| Account rulesets | Query returned HTTP 403 reporting a plan eligibility restriction | Do not presume private-repository rulesets are available; do not make Account public |
| GitHub plan | Exact eligible security capabilities for any proposed *new private* control plane unverified | Owner must verify plan/feature eligibility and actual enforced protection |
| GitHub Actions default token | Six Hub paired jobs previously could not read private Account; R1 now hard-fails PRs before checkout | NEVER solve by adding an Account token to a public PR workflow |

GitHub's official references: [protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches), [ruleset availability](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets), [installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app), and [privileged pull request risks](https://docs.github.com/en/actions/reference/security/securely-using-pull_request_target). A GitHub private repo alone is not a proven protected control plane.

## 3. Options to put to the owner — none implemented

**Option A (preferred if enforceable): Independent private GitHub CI control plane.** A separate privately owned repository with owner-verified, enforceable branch and workflow-edit protection; immutable trusted runner code that public Hub PRs cannot influence; independent reviewer; audit trail and a scoped short-lived GitHub App read token for only `thiepn/account`. This option is BLOCKED until the owner verifies the available GitHub plan, actual protection enforcement, and approval custody. Do not create the repository, App, token or workflow from this draft.

**Option B (fallback): Owner-controlled external isolated execution.** Keep vetted protected runner code and an independent signed review process on owner-controlled infrastructure, with ephemeral fetch-only credential custody, no reusable workspace, restricted egress and private logs. This is not automatically safer; custody, networking, operator access and independent code protection must be auditable. BLOCKED until owner establishes and approves those controls.

**Option C (conditional, less isolated): A runner in existing private Account.** Do not presume Account repository protection, plan eligibility or workflow editing safeguards. Combining the private source and runner administration increases blast radius; must meet independent-review and candidate isolation constraints, and never run public Hub PR scripts with Account's default token. NOT RECOMMENDED without a separate, validated design and owner approval.

**Owner choice now:** HOLD / NO_GO, or approve *only a further design review of one option*. Neither choice grants installation, credential issuance, protected-runner execution, private integration tests, nor release authority. Provisioning and each exact-candidate privileged run require distinct future explicit approvals.

## 4. Minimum owner approval sequence (separate decisions, no implicit authority)

1. **Protection and custody review, read-only:** select an option; verify branch restrictions, mandatory independent workflow-code approval, enforced push/rewrite controls, repository visibility, eligible GitHub plan, who can edit workflow definitions, token issuer custody, audit access, artifact policy, and no untrusted trigger path. Record actual controls in a PRIVATE owner docket. A 403, screenshot alone, pending rule, or presumed protection is NOT acceptance.
2. **Separate setup approval, NOT GIVEN:** expressly authorize the exact control-plane repository or service and protection changes, one GitHub App installation (if needed), and secret storage limited to the selected owner-controlled environment. Approving this proposal or a public PR is NOT authorization.
3. **Separate exact-candidate execution approval, NOT GIVEN:** after setup is independently verified, approve an exact full Hub commit SHA, exact trusted-runner code revision, preserved six pinned Account SHAs, original unchanged paired test commands, expiry, nonce and independent reviewer. Approval must be held outside untrusted public PR content and expire on SHA or trust-code change.
4. **Fetch-only credential stage, NOT AUTHORIZED:** issue short-lived (normally <= 1 hour) installation token scoped to `thiepn/account` `contents:read` only, retrieve the four pinned immutable Account commits in private disposable custody, validate Git hashes and remove/revoke the token before candidate test processes. Never allow public PR job, candidate scripts, shared cache, logs or public artifacts to access credentials.
5. **Private offline paired qualification, NOT AUTHORIZED:** run the unchanged six original browser suites at exact approved SHA, with private Account source present only inside disposable workspace, no credential or network egress to exfiltrate it; retain original test results and private evidence. Treat any public PR input as untrusted even after code review.
6. **Independent original-evidence acceptance, NOT GIVEN:** review the original job logs, ZIP/CRC and per-artifact SHA-256, test failures/skips, leaked-secret/source scan, verified token revocation and workspace disposal, reviewer identity/independence and signed decision. Publish only sanitized safe summary after approval; never publish raw private Account source, credentials or artifacts.
7. **Separate release decision, NOT GIVEN:** evidence of trusted CI cannot satisfy the existing H15 seven manual human gates by itself. Android/Samsung/iOS, screen reader, keyboard and visual acceptance remain NOT TESTED, not waived. Preserve NO_GO until separately authorized.

## 5. Decision envelope to be completed outside this public repository

The owner must explicitly identify: selected control-plane option and its independently verified protection evidence; two distinct approval scopes (setup versus an exact run); reviewer independence; intended exact Hub SHA and all six original Account SHAs; time-limited authorization; evidence retention location and sanitized-disclosure policy; token issuer/scope/expiration; rollback on credential compromise; and separate human release custody. Do NOT commit owner signatures, secret identifiers, token material, private links or full private execution logs into this public repository.

**Current gate matrix:** control-plane chosen NO; protection proven NO; App authorized NO; credential issued NO; owner run approval NO; six private paired suites NOT_EXECUTED; seven H15 release gates OPEN; six physical evidence kinds NOT_TESTED; release status NO_GO.

## 6. Phase boundaries

R4 is a single owner-decision memo only. It contains no new YAML workflow, executable policy, secret reference, repository setting, deployment, production data mutation, or test bypass. It does not alter previous source-only quality evidence or original screenshot goldens. Next owner action is a human choice and protection eligibility verification, not automatic R5 provisioning.
