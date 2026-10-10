# THIEPN Hub V1.1 H16 — Actual Owner/Device Acceptance and HomeDocument Recovery Readiness

## Qualified parent
Stacked directly on qualified H15 draft PR #110, head `dbefb541769d1cb8642e9766f3409687704fd317`. H15's eight successful exact-head workflows were rechecked, including the successful 63/63 Library rerun. Full job logs inspected. Independently downloaded, SHA-256 and ZIP CRC verified:
- Quality archive `11677462380`: SHA256 `332764c3ee0c135c33e7d31876b760df17a7b216a68ef07eeca05ea97fb2ea8e`, 55/55 CRC-clean entries.
- Notes archive `11677711279`: SHA256 `786822622aecb6375012289bd9274ff24aedccec94d9062a0161fc18c0a27dbf`, 1/1 CRC-clean entry with 16 passing tests.
- The retained H15 denial receipt had zero original owner, physical, recovery or release approvals; seven open human gates. Release `NO_GO`, postrelease rollback `NOT_REQUESTED`.

## Actual engineering delivered by H16
- Account's **Home layout** status reads the local IndexedDB unsent revision journal after owner-specific bootstrap, reporting real *revision batches* (not fabricated number of edits). It explicitly says that nothing was uploaded, even on successful sign-in or an online event; no Core HomeDocument endpoint is assumed.
- On identity change, signed-out, unavailable auth, storage errors and cross-tab conflicts, any previous owner's pending count is promptly withheld. Stale async reads are rejected by comparing the active durability adapter. Missing IndexedDB uses the existing legacy-only fallback, never claims cloud durability.
- `home-sync-preflight.ts` performs a **read-only** local-vs-remotely-reported HomeDocumentV2 reconciliation proposal. It requires canonical signed-in owner IDs to match; demands a bounded revision token and exact remote field set; verifies HomeDocumentV2 schema/size, pending journal and divergence. A different layout or any unsent edits becomes **REVIEW_REQUIRED**. Even identical content is `SAME_CONTENT_REVIEW_ONLY`, never an automatic import/overwrite, independent authorization, backup proof or release permission.
- Adversarial Vitest tests cover cross-owner remote substitution, null login, token spoofing, schema-forward errors, huge payload, stale pending/journal, conflicting documents and no automatic overwrite. Three desktop Chromium/Firefox/WebKit synthetic browser regressions (390px and 1440px) exercise real UI status, account focus/close and identity masking. These tests cannot replace actual device observations.
- No new production fetch, RPC, credential, public flag or private owner API introduced. Locked visual direction/goldens and all H6–H15 gates stay intact. Main and original stacked drafts untouched.

## Actionable external acceptance — operator must physically participate
Actual owner/device acceptance **has not been performed**. Use the qualified build in an owner-approved safe environment; never paste access tokens, identity UUIDs, exact private documents, original book files, backup plaintext, hardware serials or private footage into the repo.

1. **Owner A / Owner B (real Google OAuth)**. With separate real owners, independently sign in A, inspect consent, customize Home and verify no other owner's layout or provider data. Sign out, verify immediate data withholding, sign in B, and ensure B starts with only B's own state; re-authenticate A to confirm local durability and no unauthorized cross-owner carry-over. Test rejected/expired OAuth return, canceled consent, cross-tab sign-out, reload and offline. Record only an externally stored original capture's checksum and reference. Do not call a local synthetic browser pass proof of OAuth.
2. **Galaxy S21 Plus — Chrome**. Test actual responsive Home and Account at normal and enlarged font, supported browser rotation, offline/online transitions, low-storage behavior, history/BFCache, consent/revoke, identity change and local edits. Inspect real pending status and absence of cloud-save claims.
3. **Galaxy S21 Plus — Samsung Internet**. Repeat previous checks, especially storage denial/recovery, keyboard, focus order and no cross-app private reads before opt-in. Log exact browser version and failure reproduction privately.
4. **iPad 9 — Safari**. Verify real touch target, viewport/scroll, dialogs, on-device local durability, tab lifecycle, account transition and offline behavior. Do not assume that desktop WebKit equals iPad Safari.
5. **TalkBack, VoiceOver, physical keyboard**. In real sessions, inspect heading/name semantics, focus capture and return, Escape, screen reader status announcements, high zoom and reduced motion. Record any observable defect with sanitized screenshots/video, browser/AT versions and a private evidence-reference checksum. All are separately pending.
6. **Original previous-stable recovery**. With a human-approved disposable copy only, independently record original version digest, licensed source proof, prior-stable snapshot SHA-256, encrypted backup ciphertext SHA-256, restore steps, restored-byte SHA-256 and another operator's observation. Record mismatches honestly. Never test against or migrate the actual production database without explicit authorization.
7. **Human decisions**. An independently identified privacy/security reviewer, Prism visual reviewer and authorized release owner must inspect the real evidence and make distinct explicit decisions, not through the test harness. All seven inherited gates remain OPEN until that external process completes.

Keep the actual evidence media, encrypted recovery keys and owner names only in access-controlled private custody. H15's digest-only CLI can classify contradiction but **cannot authenticate that an original actually happened**. Use `node scripts/h15-external-intake.mjs --intake /private/path/h15.json` only with consent and a local source file; never commit the source.

## Concrete cloud-sync blockers and minimum backend acceptance contract
**There is no independently qualified, deployed Core HomeDocument endpoint or authenticated server-side row-level policy for Hub.** The H2 IndexedDB record contains a CAS revision and a coalesced local pending journal, not a cloud delivery queue. A valid client-side `HubIdentity` string cannot establish backend owner rights.

Before enabling any network write or migration, Core requires:
- Real owner-attested OAuth from the existing Account flow, server-side Supabase Auth verification and **owner-scoped RLS** on read/write; test A-to-B denial with disposable independent accounts.
- One exact HomeDocumentV2 schema per owner and bounded, independently authenticated reads; CAS conditional writes with server revision/ETag, no blind last-write-wins.
- Explicit acknowledgment of the exact locally committed revision only *after* remote write confirmation, durable offline retention, retry idempotency, cross-tab CAS race, conflict UI and failure recovery. Don't clear the pending journal on request dispatch or a locally fabricated receipt.
- An owner-triggered, separately authorized **encrypted off-device** backup and genuine bytes-verified disposable restore with independently retained recovery material, not merely a server response stating `RESTORED`.
- A device-local and cloud state separation in the UI: **authenticated locally** is not **remote-synced**. Never reuse a guest's Home settings as another owner's authorized data.
- Deployment authorization and a permitted rollback procedure after physical evidence and seven human gates are independently approved.

H16's read-only preflight deliberately cannot satisfy these dependencies. It makes the current non-sync status actionable and lays the schema/owner/concurrency boundary for an eventual real Core adapter. No migration, external production write, deploy, merge, origin modification, purge or rollback in H16.

## Default disposition
**Precutover: NO_GO. Postrelease rollback: NOT_REQUESTED. Seven human gates OPEN.** Next phase should implement/qualify a genuine disposable owner-scoped Core HomeDocument API and human device acceptance, not additional synthetic governance.
