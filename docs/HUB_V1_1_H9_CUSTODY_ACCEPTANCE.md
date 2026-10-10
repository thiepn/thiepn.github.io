# THIEPN Hub V1.1 H9 — Operator Chain Continuity & Human Acceptance Closure

## Qualified source stack

H9 starts from qualified H8 PR #102 at exact head `ed5dfe10be6aadf1575ae37ce28d49e22d4d4855` (eight successful checks, Quality 38035724066: 380 unit tests, 612 Playwright tests and no critical/high source-audit blockers). The actual tested PR merge tree is `621fe28ef7da23e9575271314176844a397659bb`. H8 Quality artifact `11663852738`, SHA-256 `28f977b05a05b209d0c74f517812a468ef86ec1da37d7fe27d2ef5c824844d4e`, was independently downloaded and CRC-checked (48 files). Notes artifact `11664191649`, SHA-256 `f3983595a0dd738382dbfc24174f7862eb31c4ad4b0cd4e734633d300a2565d9`, independently CRC-checked (one JUnit XML). H7 #101, H6 #100, H5 #99, H4 #97 and H3 #98 remain unmerged, qualified draft ancestors.

## Implemented source contracts (not actual human acceptance)

`docs/evidence/HUB_V1_1_H9_CUSTODY_ACCEPTANCE.json` pins H8's eight exact-head CI run IDs and the two checked artifact digests. It records five separate unverifiable provenance domains: original source objects, rights/licensing, CDN cache/rollback state, PWA service-worker provenance, and offline data-recovery evidence. No protected source objects are accessed, and no immutable live object/copyright/CDN evidence is fabricated: each domain is `UNVERIFIED` with an empty proof. Seven real-world operator gates remain `OPEN`: A/B OAuth/consent, physical Android/iOS, TalkBack/VoiceOver/keyboard, device reconsent, security/privacy, locked Prism visual-owner approval and authorized release-owner approval.

`src/lib/prism/h9-custody-acceptance.mjs` is a side-effect-free, default-denied verifier of that exact source/acceptance registry. Tampering with run IDs, checked commit, ZIP digests/CRC, any source/rights/CDN/PWA/offline proof claim, human-device approval, signer root, or release decision fails the H9 CI gate.

Independent custody-chain testing supports 1–64 ordered synthetic events. Each event has exact allowlisted fields, a SHA-256 link to the previous envelope, nonce-based replay resistance, canonical UTC chronology, an Ed25519 signature by the active signer and a **second independent Ed25519 witness signature**. Both initial signer and witness fingerprints must be pinned independently outside the event. Two-hop key rotation updates the active key, prevents key-ID reuse, and fences replays or substituted signatures. A revocation or compromise terminates the chain permanently; the compromised signer cannot authorize its own recovery. Cryptographically valid synthetic tests prove only the verifier, **not** real-world operator acceptance. No signing credentials or roots are created by application code.

`scripts/h9-custody-acceptance.mjs --rehearse` emits only a privacy-safe `.cache/prism-h9/custody-acceptance-no-go.json`, requiring the source ledger to remain unverified, the signer root unconfigured, and human approvals OPEN. Mandatory Quality CI checks and archives this receipt, alongside the prior H6–H8 denials. Focused adversarial unit tests exercise witnessed multi-hop custody, tamper/rollback, replay/nonce chronology, compromise, source provenance and forged human decisions. Existing Chromium/Firefox/WebKit responsiveness and accessibility regression suites remain mandatory and unchanged.

## External operator acceptance is explicitly blocked

Human operators must perform actual signed two-owner sessions and cross-owner privacy/revocation checks, physical Android/iOS offline/BFCache/device reconsent, TalkBack/VoiceOver and keyboard inspection, rights/original-source review, read-only CDN/PWA provenance, security audit and locked Prism visual decision with evidence. Evidence must include an independently authenticated signer/role, observation time, software/hardware context, reviewed source/object SHA-256, redacted immutable reference and explicit finding. A current, independently authorized trust root and custody/revocation evidence are required separately; none is provisioned in this phase. Synthetic Playwright, fixture keys and CI ZIPs are not substitutes for human reviews.

The operator decision remains **NO-GO**. No merge, publication, Cloudflare purge, rollback, OAuth registration, production API activation, rights assertion, source-object access, credential provision or migration has been performed. This draft does not alter the locked Prism design or screenshot goldens.

## H10 — Independent Release Readiness & Evidence Chain Reconciliation

**Planned, not started** pending full H9 exact-head CI and separate real operator signoffs. Next phase would reconcile independently authenticated custody/compromise timelines, rights/object/CDN/PWA/offline evidence, device/a11y acceptance, and a manual default-denied promotion/rollback review, preserving all unresolved decisions as OPEN. It is not an automatic release authorization.
