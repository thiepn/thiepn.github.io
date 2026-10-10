# THIEPN Hub V1.1 H12 — Independent Multi-Party Evidence Reconciliation & Precutover Decision

## Independently qualified H11 baseline

H12 is a separate draft stacked only on H11 PR #105 at exact head \`8434f4143894c8b693f858375eb31d0770b6d5e1\` (H11 tested PR merge \`2b51f8f1ed988508e7982747e74a9d2b6b5cca6b\`). All eight H11 exact-head workflow runs completed successfully and all eight full job logs were independently inspected. Quality passed 399 unit and 630 real isolated desktop browser tests. Independent original ZIP byte downloads:
- Quality artifact 11673093974, SHA-256 \`27b6cba28b5d33f140b26d5f63aa642c93027b2a069156afd9a42aec159a0bf3\`, 51 CRC-clean entries, including H11 nonexecuting NO-GO.
- Notes artifact 11673616669, SHA-256 \`8a0caae9a83e089bd5f105dd523c2a2f9bc7c880ee2339ec6fb9aeb4990ad647\`, one CRC-clean JUnit XML.

The exact CI, parent, merge, archive digest, CRC, seven unverified source domains and seven open human approvals are pinned in \`docs/evidence/HUB_V1_1_H12_PRECUTOVER_RECONCILIATION.json\`.

## H12 implementation

\`src/lib/prism/h12-multiparty-reconciliation.mjs\` introduces separate verification-only external operator/witness trust records: each Ed25519 key must match an independently provided SPKI SHA-256 pin, bounded signing epoch, domain-specific operator role and independent witness key. Every H11 signed envelope is revalidated against explicit external replay baselines; cross-operator quorum checks reject nonce/receipt reuse, duplicate witness/signing identities, inconsistent original object digests, conflicting rights chains, conflicting CDN/PWA/offline previous-stable references, altered proof digests and forged/expired/revoked/compromised signer epochs. H10/H11 witnessed-custody rotation is reused with external per-epoch pins; H12 never registers the caller's alleged identities or authority.

The physical evidence collection *contract* specifies Android Chrome, Samsung Internet, iOS Safari, Android TalkBack, iOS VoiceOver and keyboard combinations with SHA-256 proof and witness receipt references, chronological observations, immutable qualified subject and \`PENDING\` state. A valid contract cannot demonstrate actual physical hardware or a qualified screen-reader evaluation. A second independent decision validator recognizes separate cryptographic candidate signatures for precutover release owner and postrelease recovery owner, rejects role/key crossover, invalid signatures, duplicate requests and expired requests, but cannot promote either candidate to real human approval.

Adversarial Vitest tests exercise contested original bytes, rights, rollback/previous-stable proofs, signer/witness identity collisions, replay, role/custody revocation, compromised signer chronology, fabricated human approval and separate owner/recovery signatures. Additional Playwright Chromium/Firefox/WebKit synthetic-browser regression on 390px/1440px tests disconnected private providers, forged release/rollback acceptance claims, offline data withholding, keyboard dialog focus and cross-tab revoke. No screenshot golden is changed.

\`scripts/h12-precutover-reconciliation.mjs --rehearse\` only validates the empty signed evidence configuration and writes a retained NO-GO receipt to \`.cache/prism-h12/multiparty-precutover-no-go.json\`; mandatory Quality CI runs this check after H6–H11. No network, backend, Cloudflare CDN or production-state write is performed.

## Human/production boundaries

All seven external provenance domains remain **UNVERIFIED**, and all seven owner/hardware/a11y/security/privacy/Prism/release gates remain **OPEN**. No production trust roots, private source objects, licenses, external signing credentials, genuine OAuth A/B account observations, Android/iOS devices or TalkBack/VoiceOver findings have been supplied. A synthetic cryptographic quorum **is not an authentic multi-operator acceptance** and cannot authorize release. Independently governed rights owners, operator custodians, real hardware review and legal approval are still required. Even source-backed proofs cannot override owner release authorization.

**Precutover: NO_GO; postrelease rollback: NOT_REQUESTED.** No merge, deploy, migration, purge, rollback, private API activation, screenshot golden change or protected live-object access.

## H13 — External Acceptance Witness Review & Release Custody Separation

Status **not started**. Only after H12 exact-head CI qualification: build independently authenticated external multi-operator evidence intake, ongoing signer custody audits, conflict adjudication, real-device/a11y external review preparation, owner-specific recovery verification and two fully segregated human release versus postrelease decision workspaces. Keep all absent authorizations OPEN and both execution paths denied.
