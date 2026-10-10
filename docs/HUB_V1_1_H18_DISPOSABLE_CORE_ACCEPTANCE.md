# THIEPN Hub V1.1 H18 — Disposable Core owner/RLS and adapter acceptance

## Qualified H17 parent and evidence

H18 is a separate stacked draft branched solely from H17 PR #112 exact head `386e5a8d192acc9d7fa1f5b147f78ff3d67bcd87`. All eight latest-attempt H17 workflows succeeded; Quality 38078533781 included 462 passed Vitest unit tests, 666 passed isolated Chromium/Firefox/WebKit tests and a 58-page production build. Independent original ZIP download/hash/CRC:
- Quality artifact `11679900781`, SHA-256 `f8f37ffd8ef5a22b5b06d7e09f6eefcb0b9c108bf68bb0b8d6d93141c8677de4`, 55 ZIP entries, no CRC errors.
- Notes artifact `11679074631`, SHA-256 `fd1d226552a440be3f34901023a13b1d4e8607aebbb0372d1cadbd44b1bd8579`, one CRC-clean JUnit record, 16/16 passed.
- Inspected H17 original retained `.cache/prism-h15/external-intake-no-go.json`: 0 physical, owner and recovery-witness approvals; seven inherited human approval gates OPEN; precutover `NO_GO`, rollback `NOT_REQUESTED`.

## Actual source implementation

1. `docs/h18-disposable/core-home-document-contract.sql` is **a reference candidate, NOT a migration**. It has not been run anywhere. It designs separate private tables with primary owner UUID, raw HomeDocument and opaque server revision; a unique per-owner request-receipt journal; RLS read/insert/update policies scoped by `auth.uid()` with matching write `WITH CHECK`; and a `SECURITY INVOKER` public read/CAS RPC, which takes an owner UUID and rejects cross-owner/anonymous tokens. The CAS candidate serializes first-write and update races using one owner-specific transaction-level advisory lock, checks expected revision server-side, rejects same-key/different-payload retry, and atomically persists successful receipts.
2. `src/lib/prism/home-h18-disposable-transport.ts` exports an **opt-in, not-instantiated** adapter that implements H17's HomeSyncTransport. It calls `auth.getUser()` (not `getSession()` or a caller-supplied UUID) before and after any `h18_home_read`/`h18_home_cas` operation, validates exact inputs/outputs, sends no new tokens, and redacts backend error details. Its two local gate booleans are a fail-closed setup requirement but **not proof of external authorization**. Nothing imports or configures the adapter in a running app.
3. `tests/unit/prism-h18-disposable-transport.test.ts` uses a synthetic fake client and static SQL-source assertions, testing disabled gate, A-to-B denial, session switching mid-request, invalid data, unexpected/private response fields, bad CAS receipt and no local ack without exact readback. **These tests are not real Postgres, RLS or Auth checks**.
4. Original H17 IndexedDB durable journal, CAS and explicit readback engine remain unchanged. Local pending revisions are not erased on RPC failure. There is no network activation, database mutation, storage migration, OAuth change, original data transfer, release gate weakening, or Prism visual change.

## Explicit missing authorization and shortest real backend acceptance

No user authorization was supplied naming a separate disposable Supabase project and two genuine disposable Auth testers. The existing THIEPN Core/Account service is **not** a permitted substitute. Do not list, connect, query, create or change production resources just to find a convenient environment.

**Owner action before next stage:** explicitly identify/authorize an independent disposable Supabase project (isolated from Core and Account production), two test identities A/B with written consent and no private originals, and permission to run reviewed disposable SQL, inspect RLS/grants, and erase only the disposable fixtures. Do not paste secret keys, JWTs, original backups or password material into a PR/chat.

In an approved disposable project, an authorized operator must:
1. Confirm Postgres version/required functions, schema is **not exposed by PostgREST Data API**, no cross-schema privilege escalation, and identify safe grants. Review and adapt the reference SQL; source-only checks are not sufficient. Apply through an authorized reviewed migration process, not by autoapplying this documentation artifact.
2. Execute actual two-owner Auth tests A and B plus anonymous-token negative checks. Verify both functions and direct grants refuse an unauthorized read, update, enumeration, owner reassignment, forged owner argument and provider metadata abuse. `TO authenticated` alone is not an ownership policy, and user-editable JWT metadata is not authorization.
3. Run competing writers on an absent owner row and on an existing owner row; prove precisely one wins the expected-revision CAS. Exercise duplicate idempotency receipt, changed same-key payload, lost HTTP response, readback timeout, expired session during a write, revoked grants and recovery.
4. Perform strict backend-side whole HomeDocumentV2 validation beyond the minimal schemaVersion/key/size checks in this design candidate. Review request size/quotas, rate limits, cleanup/retention of idempotency rows, JWT session revocation freshness, and any anonymous Auth role behavior. **Do not enable writes** until this validator and negative tests are passing.
5. Independently verify the original-byte and SHA-256 lineage of a consented, fictional/disposable encrypted off-device restore. No actual original encrypted backup has been supplied or tested.
6. Retain original raw logs/screenshots/SQL/RLS evidence privately with two independent human decisions. Upload only nondisclosing hashes/receipts into evidence custody; never label synthetic tests as real approval.

## Unchanged human release gates

The seven H15 human gates remain open: real two-owner OAuth and provider consent; physical Android/iPad; screen-reader and keyboard; device-local reconsent; security review; Prism visual ownership; release-owner authorization. Real Galaxy S21 Plus Chrome/Samsung Internet, iPad 9 Safari, TalkBack/VoiceOver and independent encrypted restore remain unperformed.

H18 remains **source-only draft acceptance**, not a completed live database or deployed sync service. Original H1–H17 draft ancestry and locked Prism goldens preserved. **NO_GO. No merge, deploy, migrate, grant, purge, rollback, exposed key or protected original access.**
