# THIEPN Hub CI R2 — Trusted Runner Preparation (source-only, NOT AUTHORIZED)

## Mandate and status

This is an independently reviewable design and static contract only. R1 at ba011df894ec44a583e3d8eb55b90e8a1f1c40e2 is qualified for public-PR fail-closed isolation: 527 Vitest PASS, 684 Playwright PASS, zero source errors, original ZIP/hash/CRC and unchanged 40 screenshots; six private Account jobs fail early as BLOCKED_UNTRUSTED_PR before private checkout. These six *paired suites remain NOT RUN*. R2 must never count blocked jobs as passing. Main, release gates, physical tests and inherited draft ancestry remain untouched.

Static manifest: evidence/ci-r2/trusted-runner-design.json. Static validator: scripts/ci-r2-trusted-runner-policy.mjs; supporting mutation tests: tests/unit/ci-r2-trusted-runner-policy.test.mjs. Passing tests prove design constraints in committed source, not identity, branch protection, secrets, or real trusted CI availability. No workflows, actions, secrets, app installations, credentials, token permissions or repositories are created or changed.

## Explicit trust zones

T0 — Public Hub candidate: pull_request workflow can run only unprivileged tests. PR head and PR merge refs, fork or internal, are untrusted. R1's six Account-paired jobs remain hard failing on PRs. The GitHub default token cannot read thiepn/account.

T1 — Separately owned private CI control plane, NOT SET UP: workflow definition comes from independently protected code in a separate private repository or owner-managed protected control plane, not from the Hub PR checkout. Required: branch rules verified by owner, independent review, installation policy, retained audit trail, no workflow file controllable by unreviewed Hub PR author. NEVER use pull_request_target to test PR code or automatically trust workflow_dispatch on user-selectable branch. No PR-supplied workflow paths, scripts, build commands or payloads may run in T1 while tokens are in memory.

T2 — Owner-reviewed candidate approval, NOT GIVEN: obtain exact full 40-character Hub commit SHA, public repository, intended base ancestry, immutable six Account SHAs and untouched suites. A designated owner reviews the candidate's source/diff, dependencies and intended execution, records an explicit approval for that exact SHA and an independent nonce/checkpoint. If head changes, all authorization expires. PR approval, successful public checks, a contributor's org membership and a comment on a public PR are NOT substitutes for this gate.

T3 — Privileged fetch-only stage, NOT CONFIGURED: after T1/T2 gates, issue a short-lived GitHub App installation token scoped to *only thiepn/account* with contents:read, in a private ephemeral environment. Reject any additional installations, packages:write, issues, Actions write, administration, and repository expansion. Fetch ONLY the four already-qualified Account immutable commits needed by the six suites. Verify exact Git object hashes and custody. Avoid credential persistence and caches. Revoke/expire the token *before* any Hub candidate test process. Account source must not be copied to public Actions jobs or publicly downloadable artifacts.

T4 — Isolated paired-test execution, NOT RUN: execute exact reviewed Hub candidate and the original paired tests in disposable sealed workspace with pinned dependency inputs, strict outgoing network isolation, no authorization token, no exposed general-purpose secrets, private output custody and bounded time/resource usage. Treat the reviewed Hub candidate as still potentially adversarial: deny external egress even after code review. Temporary private Account sources/builds never leave T4; dispose and verify cleanup after run. Original paired browser suites must remain complete and must not be replaced by mocks or bypasses. Any fixture requiring third-party access must be separately approved or remain NOT TESTED; do not invent a pass.

T5 — Private witness and disclosure review, NOT CREATED: retain exact Hub/Account refs, runner revision and control-plane provenance, per-suite actual results, SHA-256 of all original artifacts, logs, reviewer identity/date, approvals and signed final disposition. Only manually approved sanitized summaries may cross to public Hub status. Public job artifacts, npm caches, browser traces, failures, screenshots and service logs must not expose private source, tokens, cookies, account data or credentials.

## Minimum acceptance gates

- Owner reviews and confirms actual repository branch protection and workflow edit protections; status currently UNVERIFIED because branch-protection inspection was inaccessible (API 403). Do not assume a default branch is protected.
- Owner decides who may trigger and approve T1 and exact candidate SHA; reviewer must be independent from untrusted PR content.
- Owner explicitly authorizes any GitHub App installation, repository scoping and token storage/execution. None currently authorized or created by R2.
- Demonstrate denial cases: fork PR, internal PR, arbitrary-ref manual dispatch, replaced exact SHA, revoked token, widened scope, logs with token markers, egress attempts, failed original checks. Any failure => NO_GO and no private artifact exposure.
- Run the unchanged original six paired suites with genuine private Account source and all browser profiles under trusted controls. Record outcomes truthfully PASS/FAIL/NOT TESTED and original artifacts, not just job statuses.
- Reconcile with 7 preexisting Prism H15 human release gates. Physical Android, Samsung Internet, desktop keyboard, screen-reader, owner visual review remain NOT TESTED by owner choice. None of these are waived. Even full trusted CI completion does not independently authorize a Hub release.

## Pinned suites retained verbatim in R1

Account integration: 19abe54a605ee7fe121d91e4b5cbef0f0b74763b; managed Notes: same; managed TMS60: same; Notes Inbox: 5b426c40e9e174c11c36604c1ef2c18a6aa155d8; Notes capture: 676413adfeef68f50e2bae95364fd43afbb6b497; cross-app: 9cddcbcdb36e6260be3761ae35b221b1a7b8e271. Complete Playwright test configuration names are pinned in the JSON manifest. Do not change reference versions merely to fix CI.

## Owner handoff / release posture

Owner action required (NO AUTOMATED PROVISIONING): confirm independent protected runner location, authorization custody, GitHub App scope, audited installation/token issuance, ephemeral workspace isolation and signed exact-commit approval. After separate explicit approval, a future phase may create a PRIVATE trusted workflow in that boundary; it MUST NOT be derived from untrusted PR control files or installed in the public Hub with PR secrets.

R2 is only source policy preparation. No private trusted integration was attempted. R1 remains intentionally red for six Account jobs. All original seven human gates OPEN, physical checks NOT TESTED, Prism visual references unchanged. No merge, deployment, migration, rollback, DNS, production, secrets or PWA changes allowed.
