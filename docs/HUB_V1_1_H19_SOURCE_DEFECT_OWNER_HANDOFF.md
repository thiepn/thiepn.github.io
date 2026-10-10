# THIEPN Hub V1.1 H19 — Source-Defect Hardening and Explicit Owner Handoff

## H18 original prerequisite independently inspected

- H18 draft PR #113 HEAD `7d0a8e1715aac2c6f121bbc9586703919523d27e`, H17 base `386e5a8d192acc9d7fa1f5b147f78ff3d67bcd87`, open draft / unmerged.
- Eight original H18 latest-attempt workflows succeeded. Quality `38080104175`, job `114295079818`, 474 Vitest unit tests, 666 Chromium/Firefox/WebKit browser tests, 58-page build and zero type errors; every complete job log independently inspected.
- Downloaded original H18 Quality ZIP `11680675908`, SHA-256 `5f926c3fdb84e0e6aaa59c4707fb4fc872bb691307dddc8c4ac988295bdbff65`, 55/55 ZIP CRC clean. Notes ZIP `11680331761`, SHA-256 `31ad21f9299d73d62c19a584a9145bcc54c2c5e887d9f470b873ff8bed86e9e8`, 1/1 ZIP CRC clean, JUnit 16 pass/0 failures/0 errors.
- The original archived H15 external-intake receipt has status `AWAITING_EXTERNAL_EVIDENCE`, no actual OAuth-owner, device, recovery or owner approvals, and all seven human release gates OPEN. Precutover `NO_GO`; rollback `NOT_REQUESTED`.

## Authorization decision: NOT GRANTED

No user-provided authorization identifies an isolated/disposable Supabase project and two real consented independent Auth testers. Existing THIEPN Core and Account resources are production and **must not** be used as H19 disposable targets. No project listing or database SQL operation is justified to infer permission.

Accordingly H19 does NOT execute SQL, inspect a production Supabase project, connect to production Auth, run real owner/RLS experiments, install an API, merge or deploy. No real device or encrypted previous-stable restore approval is claimed.

## One demonstrated source defect and contained repair

H18's unexecuted reference SQL used only `schemaVersion='2'` and six top-level JSON key-presence tests. These checks could accept `pages:null`, `blocks:null`, an invalid `appearance`, or other non-HomeDocumentV2 objects when bypassing the TypeScript client. H19's `tests/unit/prism-h19-server-shape-guard.test.ts` demonstrates these test fixtures pass the old minimum guard but fail the actual `validateHomeDocument()` TypeScript validator.

H19 revises that **same source-only SQL reference** to require an independent private-schema `SECURITY INVOKER` nested JSON guard on both direct table writes and CAS RPC writes. It checks typed/nonempty pages; typed blocks/sections/layouts; boolean preferences and known appearance enumerations; registered block types; bounded unique `appOrder`; section ownership and page references; desktop/tablet/mobile layout presence; placement references, integer coordinates and basic grid bounds. Unexpected JSON and numeric casting errors reject. It preserves the owner-RLS, expected-revision lock and idempotency receipt protections.

**Important unsatisfied requirement:** This guard is NOT a fully proven server-side mirror of TypeScript `validateHomeDocument()`. In particular the exact block/size-specific span matrix and placement overlap are not yet independently proven under PostgreSQL. Static Vitest assertions are NOT real SQL execution or a substitute for full server-side validation, two-user Auth/RLS tests, concurrency testing, disaster recovery or acceptance. The SQL stays a design-only file under `docs/h18-disposable/` and must NOT be run until a separate backend project and owner permission are explicitly identified and the missing cases are addressed.

## Shortest actionable owner handoff

To proceed with real H19/H20 acceptance, the owner must explicitly approve:
1. **Separate disposable Supabase project reference**, isolated from THIEPN Account/Core, with a scope and an independent deletion/reset plan. A production project ID or shared live database is **not** acceptable.
2. **Two distinct consenting real test Auth users** A/B with no personal production information; approve create/read/update/negative RLS, concurrency, and teardown tests on disposable data. No credentials, JWTs, private originals or encryption keys should be committed to GitHub or pasted into public PR comments.
3. **Permission to apply reviewed SQL only in that disposable project**, inspect effective grants/anon privileges/disabled Data API schema exposure, verify auth.uid() server-side, test read/CAS/receipt race and failed/offline/retry recovery.
4. Independent operator evidence: sanitized checksums/retained private logs, device/browser physical tests and separately witnessed encrypted-original previous-stable bytes restoration, followed by seven actual human decisions.

Until explicitly granted, **stop creating speculative backend authorization phases**. Prioritize only independently reproduced correctness defects and maintain the H15 NO_GO receipt.

## Protected invariants

Previous H1-H18 stacked PRs, locked Prism visual goldens, seven human release gates, no production data touch, no write-back, merge, deploy, migration, purge or rollback. `NO_GO`. This H19 draft is **a source hardening action only**.
