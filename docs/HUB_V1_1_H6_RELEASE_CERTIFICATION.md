# THIEPN Hub V1.1 H6 — Source-linked Release Certification and Nondeploying Rehearsal

## Branch and qualified prerequisites

- H6 draft branch `prism-v11-h6-evidence-release-rehearsal` is based **only** on qualified H5 draft PR #99, commit `501b91bd742da3e7014fc4bba304edf77764b6d5` (8/8 exact-head workflows successful).
- H5 stacks on qualified H4 PR #97, commit `10d964fcd232f604110aa4105bd397923ff9e57e` (8/8 successful).
- H4 stacks on qualified H3 PR #98, commit `b67a9590a5cf01c144caf00ac7f98c6c07642ef9` (8/8 successful).
- **Every H6 change requires fresh exact-head H6 CI.** H5 successes are recorded predecessor evidence, never H6 acceptance.

## Recorded sources and independently checked receipts

The machine-readable registry `docs/evidence/HUB_V1_1_H6_RELEASE_EVIDENCE.json` contains 24 predecessor workflow receipts: all eight exact-head CI runs for H3, H4, H5. Each receipt has a workflow name, run ID, recorded successful conclusion and its GitHub Actions run URL. The six Quality/Notes artifact references include run linkage and artifact IDs.

The H5 retrieved ZIP files have been independently checked for ZIP CRC integrity; the download digests (SHA-256) are:
- Quality `studio-certification`, run `38002555366`, artifact `11650326047`:
  `e4da781d3950eebc945eca11fbeeb84d20ba1e2824031bf4f45e20d5c16f15bb`
- Notes `hub-notes-contract-evidence`, run `38002555374`, artifact `11649508062`:
  `f2f9a4a0f3e34f5ad485319024ae2ba8bd9ec2ca651a55c5ded2e86d3b29ee5b`

The H5 Quality run log reports **361 passing unit tests, 603 passing Playwright tests**, and a successful existing source-release audit with no critical/high source blocker. The eight-workflow record was checked through GitHub, not invented. The repository's offline verifier checks receipt structure, internal consistency, linkage, exact SHA syntax and duplicate prevention. **It does not make live GitHub API calls:** a separately authorized operator must independently re-fetch and inspect upstream CI/evidence before any release decision.

## Automated controls

- `node scripts/h6-release-rehearsal.mjs --check` verifies provenance registry structure and fails on missing/tampered/duplicate workflow receipts, incorrect artifact linkage, unverified human approval, release authorization or non-denied intent.
- `node scripts/h6-release-rehearsal.mjs --rehearse` performs the same verification and writes only `.cache/prism-h6/nondeploy-rehearsal.json`. The receipt is deliberately privacy-safe and records `publishAllowed: false`, `rollbackExecuted: false`, `candidateAllowed: false`.
- Existing Quality workflow now runs this gate and retains the receipt as a CI artifact alongside existing browser evidence. Existing mandatory checks, screenshot goldens and deployed resources remain unchanged.
- Vitest tests exercise forged CI results, broken URLs, missing checks, malformed artifacts, fabricated human/device approvals and the hard-denied release rehearsal.
- Playwright fixtures exercise keyboard focus and dialog restoration, 390px/1440px layout safety, disconnected Home privacy, offline recovery and two-tab malformed/valid device-clear messages in Chromium/Firefox/WebKit. These are synthetic browser tests, not physical-device signoff.

## Non-deploying rollback rehearsal

The code never contacts production, modifies a Git ref, registers OAuth, uses real credentials, purges CDN, alters Core/Account databases, migrates, uploads protected objects, creates deployment artifacts, or deploys. It records the **plan** to keep currently deployed state untouched if human acceptance fails; it does not execute a rollback. Authoritative rollback and release decisions remain with the operator.

## External acceptance — default denied

The machine-readable acceptance set explicitly marks all of these as **pending**, with no attached invented evidence:
1. Genuine two-owner A/B OAuth and consent revocation/recovery
2. Physical Android and iPad/iOS browser/device verification
3. TalkBack, VoiceOver and keyboard operator evaluation
4. Independent privacy/security signoff
5. Owner review of locked Prism screenshot/reference fidelity
6. Explicit named release-owner authorization

For each future acceptance, capture person/role, date, device/browser, tested account scope (without secrets), observation, failure notes and immutable evidence reference. No phase may automatically flip these fields to approved. A future review must independently authorize its own source-backed acceptance procedure.

## H7 (next)

**H7 — Independent Operator Acceptance & Controlled Release Decision.** If H6 automated gates qualify, assemble an operator packet, collect genuine external receipts and exact-head regression findings, and prepare a **nonexecuting** promotion/rollback decision. H7 is **not started** and cannot claim human approval without actual authorized evidence.

H6 draft PR is unmerged; no deployment or production activation is authorized.
