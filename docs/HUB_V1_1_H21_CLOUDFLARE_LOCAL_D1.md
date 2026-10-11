# H21 — Cloudflare Worker + D1 isolated source acceptance

## Baseline and protection
- H20 qualified stacked draft #115 head `6d19a1140627954ecfa56d596d1e892bb6656011`.
- This H21 is a **separate stacked draft**. No Cloudflare account, Worker, D1 database, DNS, deployment, Supabase SQL, migration or production data is touched.
- The source worker is **not imported by the deployed Hub**. Its default adapter would send a bearer token only to the already-known Supabase Account Auth `/auth/v1/user` endpoint when explicitly configured/deployed in a future authorized release. Its publishable key is **not provided** by this source.
- No code path trusts browser-provided owner claims or unsigned JWT payload. The Account Auth server verifies token validity server-side; returned authenticated owner is checked on every route.

## Security-equivalent adaptation
PostgreSQL RLS and security-invoker RPCs are **not** portable to Cloudflare D1 (SQLite). The equivalent protection here is:
1. Worker-owned D1 binding, **not publicly exposed**; the only public surface would be deliberately deployed Worker routes.
2. Bearer token independently verified against the **pinned THIEPN Account Auth provider** via HTTPS `getUser`; errors, unavailable verification, anonymous users and missing identities fail closed.
3. Every read, CAS and recovery query uses **server-verified owner_id**. Any client-supplied owner must match. Explicit owner-qualified predicates and no unsafe SQL interpolation; only bound parameters.
4. Atomic D1 `batch()` for an original-byte history snapshot, compare-and-swap write, and result receipt. No successful receipt for a conflicted write. Idempotency keys are scoped to owner; same key+same payload+expected revision yields the original response even after network loss, mismatches deny.
5. The source uses the **actual** shared `parseStoredHomeDocument()` validator. Exact HomeDocumentV2 schema and 128 KiB budget are checked before D1 writes.
6. Read-only previous-revision recovery returns the exact archived `raw` bytes with no implicit rollback, overwrite or removal. A restore must later go through explicit reviewed CAS.
7. No CORS, production route configuration, domain, service bindings, release flags, automatic sync, migrations or provisioned Worker are in this draft.

## Local test trust
`tests/h21-cloudflare/worker-local.ts` is a separate source-only entrypoint accepting **synthetic signed ES256 JWTs**, verified against a fresh **local test public key**. It never reaches THIEPN Account, Supabase production, or Cloudflare remote resources. It is not the production entrypoint and cannot be deployed without a separate owner action. The GitHub Actions test uses pinned Wrangler `4.50.0`, ephemeral `--local` D1 storage, disposable schema, concurrent HTTP requests, independent synthetic owners A/B, malformed/anonymous/expired/forged tokens, CAS, idempotency, conflict and original-byte recovery.

## Known acceptance limits
- **Actual local D1 tests must pass in the dedicated workflow** before claiming database acceptance. Static CI alone is insufficient.
- Local synthetic JWT signatures do not establish a real OAuth consenting second human, nor verify runtime compatibility with production Account Auth `getUser`. The latter requires a separately approved nonproduction/production-auth read-only acceptance step.
- Race correctness holds under tested single D1 database batch semantics; retry/read errors, simultaneous traffic and remote deployment performance remain unverified until genuine live acceptance.
- There is no deployed backup, recovery restore or failover service. Read-only prior-revision retrieval is not an independently witnessed off-device encrypted original restore.
- All **seven human gates OPEN**. Precutover **NO_GO**. No merge, production migration, Cloudflare deployment, purge, rollback or release approval.

## Phase exit
Only a qualified exact-head draft and independently inspected original local-D1 GitHub Actions run/artifact can close the **source-only** H21 implementation step. Subsequent owner-authenticated cloud acceptance and real-user OAuth remain separate release gates.
