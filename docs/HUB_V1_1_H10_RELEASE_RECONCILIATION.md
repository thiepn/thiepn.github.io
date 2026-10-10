# THIEPN Hub V1.1 H10 — Independent Release Readiness & Evidence Chain Reconciliation

## Qualified and source-linked H9 parent

H10 is a separate, unmerged, stacked draft branch based on H9 draft PR #103 at exact head `ad23ef24076aed4e3e714cee50f27f6aa6342d4e`. Every H3–H9 predecessor remains separately draft and unmerged. H9's eight exact-head CI workflows all passed. Its tested GitHub Actions PR merge tree was `c9cfaa63da43aa4877de6a5b50d4a88bd745baeb`, which is recorded distinctly from the branch head. H9 Quality run 38053333209 completed 386 unit tests, 612 Playwright tests and the release-source audit with zero high/critical blockers. The complete eight job logs were inspected.

Independent H9 downloads were CRC-tested and SHA-256 checked:
- Quality ZIP, artifact 11670312948: `58428a378168e6758e109f16a003fbac20596d392c57a2e55bef646fc91fe200` (49 intact entries, including H9 NO-GO receipt).
- Notes ZIP, artifact 11670916079: `81f625e3df33a2f625c4dd848e8b7cded6098cdcd43a1f12c58f00f323fa0518` (one intact JUnit XML, 16 tests, zero failures).

The machine-readable packet at `docs/evidence/HUB_V1_1_H10_RELEASE_RECONCILIATION.json` pins the exact head, tested tree, all eight workflow IDs and both digest/CRC receipts. Its source domains, operator gates and signers remain explicitly unapproved.

## Actual H10 implementation

- `src/lib/prism/h10-release-reconciliation.mjs` strictly rejects modified source-heads, false CI results, altered artifact digests and any unsupported acceptance. The packet contains five original-source/rights/CDN/PWA/offline recovery domains plus physical-device and assistive-technology observation domains. All seven are **UNVERIFIED**. All seven independent A/B OAuth, hardware, a11y, consent, security, Prism owner and release-owner gates remain **OPEN**.
- Supplemental multi-hop signer reconciliation uses existing independently witnessed H9 Ed25519 chain verification and additionally requires a separately supplied SPKI SHA-256 pin for **every signer epoch, including the initial and rotated keys**. It rejects reused key IDs, altered epoch keys, replayed nonces/digests, substitution of independent witness, backdating, and post-compromise self-recovery.
- Fixed allowlisted signed evidence payloads hold only domain, qualified H9 head, two SHA-256 references, timestamp, expiry, schema and random nonce. The module verifies **two different, independently pinned Ed25519 signatures** with a domain-specific operator role and an independent evidence-witness role. Strict canonical UTC, seven-day maximum expiry, 30-day freshness and caller-retained nonce hashes are required; private fields and URLs are not accepted.
- Cryptographic verification is not evidence that a cited object, right, physical device, screen reader or human observation actually exists. A cryptographically valid **synthetic** receipt is reported only as a fixture verification. Neither an operator signature nor a test may turn any gate to approved.
- `scripts/h10-release-reconciliation.mjs --rehearse` checks the default empty proof packet and writes only `.cache/prism-h10/release-readiness-no-go.json`. It records a **NO-GO** decision with no production action. Existing Quality CI now requires this additive gate, preserves previous H6–H9 gates, and retains this receipt in its Quality artifact.
- Vitest adversarial fixtures generate ephemeral in-process Ed25519 keys for verified and corrupted rotation, revoked/replayed epoch custody, distinct witness pinning, signed evidence tampering, spoofed rights/CDN/protected source/physical-device observations, and false GO requests. No synthetic key is a real signing credential.
- Real Playwright Chromium/Firefox/WebKit synthetic-browser regressions test 390px and 1440px keyboard/account dialog focus restoration, privacy-minimal provider projections, and another-tab revocation against malformed release approval messages. Browser tests **do not constitute physical Android/iOS or genuine two-account OAuth acceptance**.

## External evidence / operator custody needed before any GO

An independently controlled trust registry, properly authorized operator and witness enrollment, real signing key custody, immutable source/object/rights evidence, CDN/CSP/HTTP cache and PWA service-worker update/rollback observations, offline recovery across actual supported devices, genuine signed-in A/B owner isolation/consent, TalkBack and VoiceOver, independent security/visual review, and a human release-owner decision are **still absent or unverified**. No live protected objects, credentials, Cloudflare environment, backend or CDN have been touched to create fake evidence.

The same seven human gates and seven proof domains are **default denied**. The H10 packet cannot accept a GO state and the script never merges, publishes, performs migrations, purges, registers OAuth, activates private production APIs or executes rollback. A later human decision must be independently authenticated and separately authorized from a technical CI pass.

## H11 — External Witness Packet Intake & Rights/Recovery Acceptance (not started)

Subject to H10 exact-head CI, H11 should implement witnessed external evidence receipt import with independently controlled trust-root handoff, source/object and license continuity, CDN/PWA/offline recovery timelines, real hardware/a11y review collection, separate decision and release authorization controls, and fail-closed operator reconciliation. H11 cannot claim external approvals without actual evidence, nor deploy by default.
