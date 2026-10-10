# THIEPN Hub V1.1 H13 — External Acceptance Witness Review & Release Custody Separation

## Qualified, independently inspected H12 parent
H13 stacks exclusively on draft PR #107 at exact H12 head `92948683834e1f03d6f8ff2bf390bd62603305b1`, parent H11 `8434f4143894c8b693f858375eb31d0770b6d5e1`, tested PR merge `9d710f6bb534a537c3910f273996a10962d88246`. All eight exact-head workflows completed successfully, and all eight full job logs were inspected. H12 Quality completed 411 unit and 639 real Chromium/Firefox/WebKit synthetic-browser tests, no source-level critical/high blocker.

Independent source ZIP verification: Quality artifact 11674184694 SHA-256 `ca63a0398429e30ea3c9e2c73138a73a6a964da0d59ed9d3033e0e71b28bc680`, 52 CRC-clean entries, including independently inspected H12 NO-GO receipt; Notes artifact 11674958928 SHA-256 `eb7a4936d3a0a94426be5c580e527d4e090d98cd12dbebdcd7ad8799da41afb3`, one CRC-clean JUnit XML containing 16 passing tests.

## New implementation
- `src/lib/prism/h13-external-acceptance-review.mjs` verifies strict H12 SHA, merge, CI artifact digest/ZIP CRC source pedigree; **seven UNVERIFIED domains and seven OPEN human approvals remain immutable in default evidence**.
- External-review evidence verifier accepts only canonical, strictly bounded digest-only source/object/license/CDN/PWA/offline/device/a11y receipt references. Each review requires an externally supplied identity-to-SPKI SHA-256 pin, domain-specific role, Ed25519 signature, bounded epoch, 30-day freshness and seven-day maximum expiry, and independently retained anti-replay baselines. It detects duplicate identities/keys, contradictory original bytes, license/rights and previous-stable recovery fingerprints; both signatures and reviewer quorum remain technical checks **without promoting real human acceptance**.
- Independent signer identity/epoch rotation, revocation and compromise verification delegates to H9–H12 witnessed custody verification; compromised or revoked attestations fail closed. No trust root is installed, keys are not generated or registered by the application.
- Physical Android Chrome, Samsung Internet, iOS Safari, TalkBack, VoiceOver and keyboard witness collection contracts strictly require independently furnished SHA-256 references, qualified head and `PENDING_INDEPENDENT_PHYSICAL_REVIEW` state. They never assert observed real hardware.
- Owner-specific recovery checks bind an owner-key digest to original object, rights, prior-stable, encrypted backup and restored-byte evidence, with conflict and replay-relevant boundaries. Any `RESTORED` claim or conflicting owner scope is rejected; genuine encrypted recovery remains unverified.
- Signed candidate precutover and postrelease rollback decisions require distinct externally pinned Ed25519 release-owner versus recovery-owner credentials, proper role, expiry and nonce; both remain `NO_GO` / `NOT_REQUESTED` regardless of valid synthetic signatures. Authentic owner/human authority must be verified separately.
- Adversarial Vitest covers fake authority, signature tamper, duplicate signer/key aliases, source/license/CDN/restore conflicts, replayed receipts, revoked/compromised timelines, device spoofing and separation of owner versus recovery keys.
- Real isolated desktop Chromium/Firefox/WebKit on 390px and 1440px synthetic preview exercises forged acceptance, offline data withholding, dialog focus and cross-tab revocation. Does not constitute genuine hardware, human or OAuth testing.
- Mandatory additive Quality workflow checks `scripts/h13-external-acceptance.mjs --rehearse`; the only write is `.cache/prism-h13/external-acceptance-no-go.json`, retained in the Quality evidence ZIP. All H6–H12 safety checks remain active; locked Prism screenshot goldens untouched.

## Production and human evidence boundary
No external trust registry, signed real witness packet, source-rights holder, actual CDN/PWA rollback, physical Android/iOS, TalkBack/VoiceOver, two-owner OAuth, security/privacy reviewer, Prism visual owner or release owner has been independently accepted. All seven domains stay **UNVERIFIED** and all seven operator gates **OPEN**. No merge, deployment, migration, CDN purge, private production API activation, protected live objects, signing credentials, original asset mutation or rollback.

**Precutover release: NO_GO. Postrelease recovery: NOT_REQUESTED.**

## H14 — Independent External Evidence Qualification & Owner-Controlled Release Decision
**Not started.** From fully qualified H13 only: independent real-operator packet/source custody reconciliation, external rights and pre/post stable recovery adjudication, physical hardware/a11y witness intake, segregated release-owner and recovery-owner decision review, unapproved evidence still OPEN and all real release actions forbidden until genuinely independently authorized.
