# THIEPN Hub CI R1: Private Account access isolation

## Baseline and unchanged ancestry
Source-only draft stacked on Habits V1 PR #123 at dd31fd8d153cb4d9ba06b6e55a5deea0aaeb7b4f. Six existing paired jobs failed on checkout of the now-private thiepn/account repository (HTTP not found, exit 128). All four pinned Account SHA refs exist; the error reflects GitHub Actions repository-level authorization, not a missing commit.

## Implemented gate
Six existing workflows keep their names, paths, permissions (contents: read), immutable Account refs, all original paired tests, and original event triggers. A shared unprivileged preflight executes immediately after checking out the Hub and BEFORE fetching any private Account source. Every public PR or merge-queue run is explicitly BLOCKED and fails; no private credential or source is exposed. Main push is ALSO explicitly BLOCKED until a separately authorized trusted CI execution path is established. The guard is intentionally never green. No secret references, token permission changes, pull_request_target event, skipped checks, or soft-success escape hatch were added.

Tests verify guard precedence, rejected contexts, exact pinned SHAs, retained test commands and lack of token/secret references. Automated Quality can still pass; six privileged paired jobs intentionally fail closed. Do not interpret those expected red jobs as waived or passed.

## Owner-only steps for a real trusted requalification, not implemented
1. Review trust boundaries and branch/environment protection. Do not pass private Account credentials to a pull_request workflow, even for internal contributors. A workflow_dispatch running an arbitrary branch is also insufficient.
2. Authorize a SEPARATE trusted CI runner with protected/default-branch workflow code that public PR heads cannot modify, plus a narrowly scoped GitHub App installation token granting contents:read on thiepn/account only. Require owner approval and audit issuance.
3. Bind private token exposure to the isolated Account fetch alone; run untrusted candidate checks with no token and with private data isolated. Keep all existing immutable pinned Account commits and complete paired suites; never persist tokens or private source in public CI artifacts/caches.
4. Independently retain exact-head logs, original artifacts, per-artifact hashes, qualified branch controls and reviewer evidence. A privileged success may not be inferred from independent public PR Quality tests.
5. Only after separate owner authorization and proven secret isolation should the original paired workflows be reconciled. No tokens, permissions, environments, branch rules or platform settings are modified in CI R1.

## Release / human gate position
All seven preexisting human release gates remain OPEN and NO_GO. Android Chrome, Samsung Internet, desktop keyboard/visual, and physical accessibility acceptance are NOT TESTED per owner instruction. No PR merges, deployments, migrations, production changes or screenshot goldens are permitted. The current V1 and earlier stacked draft heads are unchanged.
