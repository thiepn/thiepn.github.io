# THIEPN Hub V1.1 H17 — HomeDocument owner-scoped CAS sync engine, **not deployed**

## Exact qualified parent

Stacked solely on draft H16 PR #111 at `34175e2d46ae4a23d47f853535f3c9ebc289b0d5`, which has eight successful latest-attempt workflows. Independent H16 artifact ZIP SHA-256/CRC verified:
- Quality `11679315802`: `75f0e97faad429176fb4dc429c9838bfe60cc00dbf17c137cbaa4c8b04a5dee0`, 55 entries all clean.
- Notes `11678429921`: `b6c53d088798158c8c1d2fbd95918227bb5ed87c018048063be71fb08d2721c9`, 1 clean JUnit receipt (16/16).
- H16 Quality: 449 Vitest unit checks, 666 isolated Chromium/Firefox/WebKit checks, Astro 58 pages. Original H15 denial receipt has seven open human gates, zero owner/device/physical/rights/recovery witness signoffs, precutover `NO_GO`, postrelease `NOT_REQUESTED`.

## What H17 actually changes

1. **IndexedDB durability**: extend the existing Home journal, without schema upgrade/destructive migration, with optional `remoteRevision` and `syncedToRevision`; legacy records remain readable. `getSyncSnapshot` captures only an IDB-committed full Home document and its coalesced revision journal. The single-transaction `acknowledgeSynced` requires exact owner-local CAS metadata and retains any edits after the acknowledged revision. It can split an overflow-coalesced pending range safely. Browser tabs receive a `sync-ack` status notification even if the document revision itself did not change.
2. **Real client-side protocol logic, not a fake cloud claim**: `synchronizeHomeOnce` takes an explicit injected `HomeSyncTransport`, never sends network requests by itself, and rechecks the current verified owner before and after every asynchronous server operation. It validates full remote HomeDocumentV2 shape, owner, byte budget and opaque revision. No blind last-write-wins: the remote revision must equal the last locally *acknowledged* server revision. It sends a deterministic SHA-256 retry key bound to owner, local key, revision and document bytes.
3. **Exact read-back requirement**: the server CAS response is not treated as a successful upload. The client independently reads the remote owner document back and compares revision **and full bytes** before invoking an atomic local acknowledgment. If an HTTP response/owner session/readback disappears, it keeps unsent edits. If the last write succeeded remotely but its response was lost, the next authenticated read finds identical bytes, and only then acknowledges.
4. **Safe conflict and logout handling**: mismatched remote revisions or another device's divergent snapshot do not replace local or remote copies. Switching identity while an operation is pending prevents local acknowledgment. Guest or unverified owner cannot synchronize. There is no automatic upload on sign-in/reconnect, no private payload in GitHub Actions artifacts, no new feature flag, and no change to Prism goldens.
5. **Adversarial tests**: source-level in-memory server simulation with exact owner denial, two fictional devices, offline, CAS races, forged owner receipts, lost response, idempotent retry, concurrent local edits and coalesced journal. **In-memory tests are not PostgreSQL Auth/RLS integration nor off-device original restore acceptance.**

## Disposable backend integration required BEFORE enabling real sync

**No explicitly authorized disposable Supabase environment, service role, owner test identities or new Core route was provided.** This phase therefore does not create provider resources, use the existing protected `THIEPN Core` or `THIEPN Account` production databases, or put a migration in any deployed migration path. The transport is intentionally not registered in `prism-home.ts`.

Minimal independently approved backend must guarantee all of the following:

- A separate disposable project with an operator-approved identifier, no production data/secrets, two genuine independent test identities and server-side `auth.uid()` owner checks. RLS on any exposed table; `TO authenticated` plus `USING (owner_id = (select auth.uid()))` and matching `WITH CHECK` on writes, **not** just the `authenticated` role. Avoid `SECURITY DEFINER` for these owner writes. Anonymous and cross-owner reads/writes denied.
- One owner row per canonical UUID containing the full versioned, size-limited HomeDocumentV2, opaque server-issued revision and durable operation idempotency record. Authenticated compare-and-swap must atomically check `expectedRevision`, owner and retry key **on the server** before inserting/updating. Avoid `select` followed by an unconstrained `upsert`; two devices must never both win with stale revisions. The server returns only a bounded receipt for the requesting owner.
- A separate authenticated owner-scoped `read` which distinguishes missing (authorized 404/not found) from unauthorized (403), backend outage, and malformed payload; do not report network errors as empty Home.
- Automatic clock-independent cancellation when account identity changes; idempotent retry after lost response; explicit user-visible conflict resolution, retention of original local revision history, and no automatic remote download into a guest or newly signed-in user.
- Real disposal-safe PostgreSQL/Auth RLS acceptance: use two approved disposable accounts A and B; prove B cannot read, update or enumerate A's Home by spoofing `owner_id`, even with an otherwise valid JWT. Recheck JWT/session invalidation and permissions. Verify CAS race (A1/A2), retry duplicate suppression, expired token, mid-flight revoke, offline, unavailable server and original-byte-verified encrypted backup/restore against a separate disposable restore target.
- Only after backend qualification and explicit owner authorization may a subsequent phase wire an endpoint into Hub. Original Home settings may contain private preferences; never copy them into provider logs, issue comments or artifacts. Preserve the existing H6–H15 release gates, all seven human decisions, locked Prism references and default `NO_GO`.

## Practical qualification boundary

H17 CI can certify local persistence mechanics, the strict client protocol, and simulated remote behavior. It **cannot** certify server RLS, actual two-owner Google OAuth, Samsung Internet/Android Chrome, iPad 9 Safari, assistive-technology devices, source rights, encrypted off-device restore or independently witnessed previous-stable recovery without operator evidence. These remain OPEN and mandatory.

**H17 release decision: NO_GO. No production sync, merge, deploy, migrate, purge or rollback.**
