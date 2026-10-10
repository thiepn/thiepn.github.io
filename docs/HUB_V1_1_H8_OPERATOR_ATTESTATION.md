# THIEPN Hub V1.1 H8 — Authenticated Operator Evidence Intake & Decision Reconciliation

## Exact stack and qualified parent

H8 draft work descends solely from H7 draft PR #101 at `55a2aa4ff3e41971e4bdf538f33be174a87466f1`.
H7 qualified **8/8 exact-head CI**: Quality #38008144417 verified 373 unit tests and 612 Playwright tests, 0 source high/critical release blockers. The checked PR merge tree was `72fc7f7db3ec04eec798116469a852502739a2a1`. Independently downloaded H7 Quality archive #11651972131 has SHA-256 `c18116f6adf239d0048fe8cd072f961366af2f124eff74ac88c8ad00b9d05a41`, ZIP CRC valid (47 files), and an intact H7 operator NO-GO receipt. Notes artifact #11651966181 has SHA-256 `11255a2d22c429e8a8bae446abcb9fc38e8563c077167478974195dd6592ef99`, ZIP CRC valid. H3/H4/H5/H6 remain separately qualified draft ancestors. **H8 itself needs its own exact-head CI**, not inherited success.

## Real implementation, without enabling a production trust root

- `docs/evidence/HUB_V1_1_H8_ATTESTATION_REGISTRY.json` deliberately starts at `trustRoot: UNCONFIGURED`, with **zero signers, zero signed evidence, zero consumed nonces and seven OPEN real-world acceptance gates**. It cannot approve any live release.
- `src/lib/prism/h8-operator-attestation.mjs` verifies detached Ed25519 signatures on a fixed, minimal payload whose exact eight fields are schemaVersion, gateId, subjectHead, keyId, evidenceDigest, observedAt, expiresAt, nonce. Arbitrary URL, identity, private content, credential or unexpected fields are rejected. The signed subject is the qualified H7 SHA.
- An independently trusted public-key SHA-256 pin must be supplied by the operator verification environment, **not** accepted as a self-declared value in a signed receipt or trust registry. Unsigned signer registration is never sufficient. No production pin has been configured or approved.
- Validity checks reject unknown and revoked signers, out-of-scope role/key mappings, expired/not-yet-valid keys, future/stale/expired evidence, overly long seven-day signed evidence lifetime, reused nonces (both within a batch and against a previously consumed digest ledger), key replacement with the same ID, malformed PEM, non-Ed25519 keys and bad signatures. A previously revoked ID cannot silently qualify as a rotated signer.
- Gate-scoped operator roles cover independent OAuth/identity, physical-device ownership, accessibility, device-local reconsent, security review, visual owner and release owner. Even a **cryptographically valid synthetic test receipt is evidence for a reviewer, not approval**; production publication, merge, deployment and rollback remain denied.
- `scripts/h8-evidence-intake.mjs --rehearse` performs an offline, nonexecuting CI check on the default empty registry and emits `.cache/prism-h8/offline-intake-no-go.json`. The existing Quality workflow fails on unauthorized registry mutation and retains the receipt. No live network request, database, OAuth, signing key creation, secret or deployment is involved.
- Vitest uses **ephemeral synthetic Ed25519 keys only inside the test process**. It tests cryptographic integrity, replay, independent pinning, expirations, signer role isolation and revocation, malformed private metadata and attempted GO escalation. The synthetic key does not constitute a human approval, trusted release root or live credential.

## Independent operator acceptance process (OPEN, not simulated)

An authorized operator must independently enroll and pin signer public keys in a trusted out-of-repository configuration, including role scopes, key ID, rotation/revocation state and expiration. They must authenticate reviewers using an authorized external identity and store signed observations privately (only hashed, non-identifying references should enter a public receipt). Key custody, credential issuance, real owner OAuth, device testing and human acceptance are **outside** the scope authorized for this phase.

Seven missing evidence domains must be collected independently: (1) two genuine owner OAuth/privacy sessions and grant revocation; (2) physical Android Chrome/Samsung Internet and iPad Safari; (3) TalkBack/VoiceOver and keyboard operator checks; (4) real Library owner consent/reconsent and offline/BFCache isolation; (5) independent security/privacy; (6) locked Prism visual owner decision; (7) named release-owner authorization. Until a valid independently trusted signer is actually provisioned, the environment must reject any purported signature.

A verifier result reports which signed synthetic payloads have valid Ed25519 signatures **without changing gate statuses**. No source or CI test can set a human gate to APPROVED or enact publication. Additional external human authority and explicit deployment permission remain mandatory even after all machine-verifiable prerequisites are met.

## Nonexecuting decision and recovery

The default operator packet remains **NO-GO** and the new H8 receipt reports `releaseAllowed:false`, `mergeAllowed:false`, `deployAllowed:false`, `rollbackExecuted:false`. On a failed, replayed, revoked or privacy-unsafe evidence item, reject it and retain the deployed version unchanged. Do not touch Account/Core production databases, private provider transports, Cloudflare CDN, OAuth, migrations, or screenshot goldens.

## H9 — Operator Chain Continuity & Human Acceptance Closure

**Planned; not started.** Following independent H8 exact-head CI, extend signed evidence provenance with independently pinned issuer rotation/revocation chains, source-object rights/CSP/CDN/offline continuity, real-device/a11y findings intake and operator packet review. Every missing human-only gate remains OPEN until authentic, externally authorized acceptance. A future release recommendation is **not** permission to deploy.
