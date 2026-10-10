# THIEPN Hub V1.1 H11 — External Witness Packet Intake & Rights/Recovery Acceptance

## Qualified parent and evidence custody

H11 is a separate draft branch stacked on fully qualified H10 PR #104, exact head `31f267fca6a3e227b45c34893b0f5532022359d9`, not the synthetic PR merge tree `e0e9b90bc60f7264a2b01742f0bab486b024a0ca`. All eight H10 exact-head workflow runs passed: Quality 38059640861, Account 38059640874, Library 38059640894, Notes integration 38059640864, capture 38059640875, Inbox 38059640857, managed Notes 38059640804, managed TMS60 38059640877.

Complete completed job logs were inspected. Quality passed 392 unit and 621 Playwright tests and the release-source audit reported zero critical/high blockers. Independently downloaded evidence:
- Quality artifact `11672613218`, SHA-256 `5ef93274c1b48fec8ae59745fdcfbcd65c06eb72c104985f0523507b4868c82e`, 50 ZIP entries with intact CRC. Includes an actual H10 non-deploy NO-GO receipt.
- Notes artifact `11673235138`, SHA-256 `3d452730c9c111435c66d1fe02c0fc1b54f6579071b44c9cb1d75bce6abbd5f5`, one JUnit XML, CRC valid, 16 tests without failure.

The H3–H10 ancestry remains open, unmerged and undeployed. The source-linked H11 ledger at `docs/evidence/HUB_V1_1_H11_EXTERNAL_WITNESS.json` pins this exact H10 evidence and starts with **no trust root, no real signers, no witnessed packets, no custody events, no independent rights assertions and no human approvals**.

## H11 source work

`src/lib/prism/h11-external-witness-intake.mjs` implements privacy-minimal, fixed-shape detached Ed25519 signature verification on bounded batches. Every payload is bound to the qualified H10 head, includes a randomly generated public-safe packet ID and nonce, SHA-256 references to original source and evidence, canonical UTC observation and expiry, and a previous-packet digest. It can require source-rights digests for license reviews and previous-stable digests for CDN, PWA and offline restore reviews. A signed digest **does not prove the licensed original object, the restoration, or the real hardware actually exists**; external proof must be independently collected and authenticated.

Signer and witness public-key SPKI SHA-256 fingerprints must arrive from **two independently governed pins** outside the uploaded envelope; signer role must match the provenance domain and the witness role must be independent. An explicit revocation set, a caller-maintained consumed nonce ledger and previously consumed receipt digests are checked. Packets must have unique IDs, immutable source digest continuity for the same object key, strictly increasing observation times, bounded expiry and an uninterrupted predecessor receipt chain. Unrecognized, revoked, forged, replayed, future, stale, expired, altered or private-field-bearing packets fail closed. The module also delegates separately authenticated signer-epoch rotation/compromise checks to H10's witnessed-chain reconciler.

`tests/unit/prism-h11-external-witness-intake.test.mjs` uses **only ephemeral process-local synthetic signing fixtures** to test signatures, roles, duplicate/late packets, source continuity, required rights/previous-stable references, expiry and impossible timestamps, signer substitution/revocation and failed release escalation. `tests/studio/prism-h11-external-witness-denial.spec.ts` exercises real isolated Chromium, Firefox and WebKit browser acceptance on 390px/1440px synthetic preview environments for keyboard dialog restoration, offline withholding, malformed untrusted approvals and cross-tab Library clearing. This is not physical device or genuine owner OAuth testing.

`scripts/h11-external-witness-intake.mjs --rehearse` and the additive mandatory Quality workflow validate the empty default registry and write only `.cache/prism-h11/external-witness-no-go.json`. There are no live API calls, no production trust-root creation, no database or original protected object access, and no release action.

## Outstanding acceptance (all OPEN)

The seven actual human decisions remain OPEN: genuine two-owner OAuth/consent, physical Android Chrome/Samsung Internet/iOS Safari, TalkBack/VoiceOver and keyboard, device-local reconsent, independent privacy/security, locked Prism visual-owner signoff, and explicit release-owner authorization.

Seven evidence domains remain UNVERIFIED: original source object, copyright/license rights, CDN rollback continuity, PWA service-worker update provenance, offline recovery, physical-device observations and accessibility observations. An authorized independent operator must supply witnessed, dated, externally anchored proof of specific observations and rights. Real human identity/signing-key custody and source/object rights must be checked externally; source hash alone is insufficient.

**Release decision: NO-GO**. Any genuine external trust-root handoff, approval, merge, deployment, migration, CDN purge, private provider activation or rollback requires separate explicit authority. This branch does not perform them.

## H12 — Independent Multi-Party Evidence Reconciliation & Precutover Decision

**Not started.** Once H11 exact-head CI qualifies, H12 would reconcile actual external witness trust and revocation chronology, separately authenticated source/rights/previous-stable restoration evidence, hardware/a11y observations, and independently governed pre-cutover versus postrelease human decisions. Missing real proofs must remain OPEN. Even validated receipt chains do not authorize deploying.
