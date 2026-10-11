# THIEPN Hub CI R12 — portable signed-review preflight (unprivileged)

This implements a real **synthetic-testable cryptographic admission-record inspector** in scripts/ci-r12-signed-admission.mjs. It does NOT implement Azure DevOps, create a repository, configure branch protection, install a GitHub App, access private Account source, authorize a CI run, or change production.

## Why this phase exists

The owner requested implementation instead of repetitive setup questionnaires. A separately reviewed protected Azure control plane and independent reviewer do not exist, and there is no Azure DevOps connector available. This code is a testable component an eventual protected runner may reuse, without setup or private credentials now.

## Implemented checks

- Ed25519 verification over exact signed UTF-8 bytes. Public key must come from a separately protected trust root, NEVER the public candidate or signed payload.
- Rejects unknown authorization fields, wrong purpose, missing owner/reviewer identifiers, a claimed self-review, wrong candidate/runner SHA, missing independent HEAD observations, expired/future/over-15-minute authorization, missing replay ledger, replayed nonce, changed six Account suite pins or additional TMS60/Library source pins.
- Valid signature is NOT execution authorization: the result always includes executionAllowed:false. Asserting independent names does not authenticate them. Signer custody, reviewer independence, atomic persistent nonce protection, exact Git checkout observation, branch protection, offline dependencies, revoked credentials, egress isolation, and private evidence still need independent controls outside this repository.
- Seven Vitest tests generate only ephemeral synthetic keys in memory. No real key/token/signer material saved, no privileged runner, no private repository access or CI dispatch.

## Run

Use existing Node 22.12+ and project dependencies: npm test -- tests/unit/ci-r12-signed-admission.test.mjs. The existing Quality workflow automatically discovers the new unit tests. This is not paired Account certification.

## Preserved state

Direct parent is R4 PR #129 at ae8c17861c743f75371078dd944854cd35aeb777. The original R1 fail-closed private checkout guard, six original workflows, six Account SHA pins, two TMS60 pins, one Library pin, and all previous reference screenshots remain unchanged. Six Account paired suites BLOCKED/NOT_EXECUTED; seven H15 gates OPEN; all physical categories NOT_TESTED; merge/deploy/production NO_GO.

## Future separately authorized stages

A protected independent owner-approved control plane and real independent reviewer are prerequisites. Thereafter, independently witness denial of untrusted triggers, protect a signer trust root and atomic replay ledger, retrieve Account with a separate restricted read-only short-lived fetch token, revoke before running candidate processes, and run the original six browser suites with true OS-level network isolation. Setup and an exact-SHA private execution each require distinct separate owner approval.
