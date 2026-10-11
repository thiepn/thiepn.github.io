# THIEPN Hub H22 — Cloudflare client + original-preserving recovery

**Source-only, no deployment / production access.** H22 stacks directly on H21 PR #119 exact qualified head `289dc498b3dbde8bc12cc81572bc57ee8757145b`. The new transport module and unit tests are NOT imported by any Hub page, automatic sync job or deployment entrypoint.

## Proven H21 input

H21 all nine exact-head CI workflows successful. Original Quality `11687918740` SHA-256 `827a50d2594b7d12a737cbebff9df2fd6edd7034d39099d0799989d18c7aeda3`, 55/55 ZIP CRC; local D1 `11688615007` SHA-256 `5aec4359400d961adbb935d6a5d966a3c4664e4fc60574e63eb358bd7bacaec5`, 1/1 CRC; Notes `11687944239` SHA-256 `0a203ad96f5630c14fe4609f4109802c568fe7335ae61fdf90488ffe0804b116`, 1/1 CRC. Original Quality receipt says `AWAITING_EXTERNAL_EVIDENCE`, all seven human gates open, precutover `NO_GO`. H1–H21 PR ancestry remains unchanged.

## H22 contract

- `createH22CloudflareHomeTransport(auth, {origin, fetcher, gate, isCurrent})` implements the existing H17 `HomeSyncTransport` shape, with a separate **read-only** `readRecoveryRevision` method for archived raw bytes.
- The test-only gate requires **both** `sourceOnlyTestApproved` and `isolatedBackendOnly`. HTTPS origins must end in `.invalid` (reserved domain) or be explicit loopback. Loopback HTTP is allowed for local Wrangler. Production, custom Cloudflare, Account and Supabase origins are rejected at construction.
- An external `fetcher` is **mandatory**; there is no fallback to global fetch or a deployed endpoint. No new production application imports, auto-sync, cookies, wildcard CORS or runtime flags.
- Auth `getUser()` is the Hub's independent server-checked Account user identity; `getSession()` supplies a bearer token **but is not trusted as proof of identity**. UUIDs must match; `getUser()` is rechecked before and after session read. Each network request checks verified owner before and after sending; **token equality** is checked after await to reject same-UUID sign-ins with a replaced token.
- Browser JWT payloads are **never** decoded for authorization. The future H21 Worker will independently call the pinned Account Auth server `/auth/v1/user` and authorize its own DB operations by the server-verified subject; this live compatibility has not been accepted or exercised.
- GET `/v1/home?ownerId=<verified>`; POST `/v1/home/cas` with exact `{ownerId,expectedRevision,idempotencyKey,raw}`; GET `/v1/home/recovery?ownerId=<verified>&revision=<hash>` for read-only archive inspection. These match H21's established Worker endpoints.
- Strict response decoding: exact field sets, verified owner, SHA-256 revision and request UUID format, valid HomeDocumentV2 through the existing validator, 128-KiB document budget, bounded JSON response, no error detail exposure. HTTP errors, unexpected content, authentication transitions fail closed.
- The existing `synchronizeHomeOnce()` remains explicitly invoked, journal-preserving and requires a full owner-verified exact-byte server **read-back** before durable acknowledgement. H22 tests include signed-out/stale sessions, offline, lost response, concurrent remote mutation, malformed readback and original-byte recovery; no automatic last-write-wins.
- `readRecoveryRevision` is **inspection only**: it neither clears pending local revisions nor restores/overwrites data. Off-device original encrypted restore, human independent witness and live cross-device sessions remain **not tested**.

## Scope boundaries and future acceptance

H22’s Vitest HTTP integration tests use injected synthetic session and Worker envelope doubles; they do NOT replace H21's separately qualified real disposable local workerd/D1 integration run. They do not access any real Account endpoint, user profile, protected data, cloud Worker or D1 resource. No live Account JWT was submitted.

The existing `src/scripts/portal-auth.ts` uses THIEPN Account's known Supabase project with `getUser()` (server checked) and `getSession()` (bearer available) under PKCE. The Worker pinned endpoint, `apikey` requirement, token refresh, CORS and token audience compatibility require a separately authorized **real**, read-only session acceptance; no assumption of live success is made. Distinct test people, real OAuth consent and physical acceptance still require actual human observations.

All seven inherited human gates remain OPEN, release `NO_GO`. No PR merges, Worker deploys, D1 migrations, DNS, settings, secrets, production data, purges or rollbacks are authorized.
