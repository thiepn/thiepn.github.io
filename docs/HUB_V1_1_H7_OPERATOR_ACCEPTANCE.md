# THIEPN Hub V1.1 H7 — Independent Operator Acceptance and Controlled Release Decision

## Status

**Unmerged draft. Default operator decision: NO-GO.** This phase prepares the release/rollback decision; it does not authorize or execute any production change.

Parent H6 draft PR #100 is qualified at exact head `0001e2ace97b965f8142751d2c025b90e77df2eb`, stacked on qualified H5 #99 `501b91bd742da3e7014fc4bba304edf77764b6d5`, H4 #97 `10d964fcd232f604110aa4105bd397923ff9e57e`, and H3 #98 `b67a9590a5cf01c144caf00ac7f98c6c07642ef9`.

H6 exact-head evidence: eight successful jobs (Quality `38007120521`, Account `38007120456`, Library `38007120516`, Inbox `38007120512`, capture `38007120451`, managed Notes `38007120599`, managed TMS60 `38007120448`, Notes integration `38007120548`). Quality log verified **367 unit tests, 612 Playwright tests** and passing release-source audit. GitHub Actions tested PR merge commit `2b3d9deb589d47e4e9dfa817f46c1b38e0784513`, combining this exact H6 head with H5.

H6 Quality artifact `11651539301` was independently downloaded, checked for ZIP CRC, and SHA-256 verified at `04046786a026846af54d38297d59ef37ef811b3bd7cc7f5bd78f69c40f747a93`. The included H6 nondeploy rehearsal explicitly recorded `publishAllowed:false`, `rollbackExecuted:false` and `candidateAllowed:false`. This is synthetic CI evidence, not human/device acceptance.

## Actual H7 implementation

The machine-readable `docs/evidence/HUB_V1_1_H7_OPERATOR_PACKET.json` pins the H3/H4/H5 ancestry, H6 exact-head workflow run IDs, tested PR merge tree, archived digest and seven **OPEN** human-only gates, with zero fabricated identities, signatures, devices or observations.

`src/lib/prism/h7-operator-decision.mjs` and `scripts/h7-operator-packet.mjs` fail closed if source SHA/tree, CI run, artifact integrity or approval status is malformed, changed or invented. The offline `--rehearse` command writes only `.cache/prism-h7/operator-no-go.json`; it performs no external request or production action. Existing Quality CI now enforces that step and retains the receipt. Vitest tests guard against claimed real-device signoffs, replayed challenge strings, fabricated reviewers, omitted/forged CI evidence and any attempt to flip authorization to GO.

Prior H5/H6 real-browser CI tests cover responsive keyboard focus, modal Escape and focus restoration, offline manual reconsent, same-origin revocation messages and fail-closed noncanonical route privacy. Those tests are synthetic browser checks, not authenticated live OAuth or physical-device proof.

## Independent evidence intake checklist — all OPEN

1. **Owner A/B OAuth and consent** — Two independently signed-in genuine disposable accounts, grant/scoping and revoke/restore observations. Record only redacted owner distinctions, never credentials or account identifiers.
2. **Physical Android/iOS** — Real hardware with device model, browser/version, Android Chrome and Samsung Internet, iPad Safari, offline/BFCache and recovery observations.
3. **Assistive technology** — Human-operated TalkBack/VoiceOver and keyboard navigation, labeled control semantics, focus movement, announcements and no inaccessible blockers.
4. **Library device reconsent** — Genuine owner-issued device-local grant, revision isolation, cross-tab invalidation and post-revocation behavior on physical devices.
5. **Security/privacy signoff** — Independent review of source-bound provider ownership, stale-data redaction, grants, no unintended cross-owner leakage and rejected unsigned/untrusted evidence.
6. **Locked Prism visual signoff** — Owner visual review against frozen reference on desktop/mobile/DPR2 without approving changed screenshots by CI.
7. **Release-owner authorization** — Explicit human decision identifying authorized operator, current exact head, rollback readiness, accepted risk and evidence references.

For each gate, an authorized human must supply dated provenance, operator role, specific hardware/browser when applicable, methodology, observed result, limitations, evidence URI and explicit accept/reject decision. Sensitive data must be redacted. Do not paste secrets, use synthetic tests as human signoff, or mark a gate accepted based solely on an operator-provided text claim. Independently authenticate any eventual signing identity and trust root before a future implementation accepts signatures.

## Non-executing release/rollback decision

- **Decision: NO-GO** until all authentic independent gates pass, H7 full exact-head CI qualifies, upstream source artifacts are independently rechecked and a separate explicit release authorization is received.
- Keep H3/H4/H5/H6/H7 PRs draft and unmerged.
- Preserve deployed pages, existing OAuth client configuration, data, private production APIs, Cloudflare caches and live database schema unchanged.
- If any operator gate fails, preserve current live state, document failure/impact, repair on a draft successor and rehearse offline again. **No rollback is executed.**
- Never infer published success from synthetic Playwright, read-only metadata, or an unsigned packet.

## H8 — Authenticated Operator Evidence Intake & Decision Reconciliation

**Not started.** Once H7 has independently qualified, H8 should implement a signed evidence intake architecture (subject to an explicitly authorized trust root), independent replay/expiry/revocation verification, receipt redaction, real-device/accessibility audit reconciliation and a reviewable NO-GO/GO preparation workflow. Genuine approvals remain outside CI and must not be invented. Even a future GO recommendation is not a deployment command.
