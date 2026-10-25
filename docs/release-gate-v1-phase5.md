# THIEPN Release Audit Phase 5 — draft only

## Entry invariant
- Same draft PR #191, branch `audit/release-gate-v1-phase2-20261025`, starting SHA `5ca99bb65e06e5cfa7365eccc5e0750d0b32327c`.
- Do not merge, deploy, publish, mutate DNS/production/account data, update Clean30/Recipe/TMS60 owner repos, or archive anything.
- `/apps/` continues showing its original 31 launcher identities and 12 separate shortcuts. The noindex `/dev/release-apps/` remains empty unless genuinely authorized.
- Release candidate state is NOT an approval, and anonymous page load is not functional certification.

## Demonstrated Hub Quality fix
- Prior `Quality` (run `40190140715`) failed at TypeScript: JSON-inferred `schemaVersion:number` versus an overly narrow declaration `schemaVersion:1` in the promotion interface.
- The interface accepts numeric JSON at the TS boundary; the actual runtime validator continues rejecting any `schemaVersion !== 1`. This is not a weakening of release authority.
- Requalify the full final SHA; earlier focused browser tests are not a substitute.

## Independent promotion trust root
- `certifiedLaunchEntries` requires every approved certificate to have one valid Ed25519 receipt **and** an independently configured trusted public key SHA-256 fingerprint, calculated over DER SPKI bytes.
- The build-time variable `THIEPN_RELEASE_PROMOTION_TRUST_FINGERPRINT` is intentionally unset in this PR. An attacker can replace a public key and re-sign a repository file; a self-contained certificate/public-key pair must **never** establish its own trusted identity.
- Configure the trusted fingerprint only in a separately protected and authorized release environment. Private signing keys must never be committed to or generated for a real application by these tests. No real key has been established.
- A synthetic CI-only signing fixture generates an ephemeral in-memory Ed25519 test key and modifies JSON files only inside the disposable CI checkout. It verifies one signed TMS60 example would appear in `/dev/release-apps/` and legacy `/apps/` remains untouched; it does **not** represent release approval.
- Adversarial cases: missing trust anchor, substituted key and self-signed receipt, changed certificate, different release SHA, invalid signature, duplicate receipt, missing certificate, noncritical N/A policy violations.

## Recipe immutable migration provenance
- Pinned deployed source: `b9cf98453a017145d36c7d0ebb6c8b3054a8fd5b`.
- Verify **all seven** original migration names, sequence, sizes and Git blob SHA-1 values before running a single migration. Assert the checkout HEAD matches the pinned SHA.
- Adversarial tests reject byte tampering without length changes, inserted/deleted/renamed migrations, and a silently corrected original file.
- The seventh SQL file has **literal terminal ASCII bytes `5c 6e`** (backslash + letter n) following `$$;`. This is a demonstrated unmodified-source defect; the isolated PG17 test converts **only those two terminal bytes** to a newline. Every preceding SQL byte must remain identical.
- **Owner repair plan, not executed:** in thiepn/recipe, edit just those terminal bytes, retain every previous byte, create a new owner-controlled commit, run all seven unmodified migrations on disposable PostgreSQL 17 + PostgREST JWT A/B checks, full Recipe CI, and then production revision parity checks before eligibility can change. Do not retroactively rewrite the pinned production SHA or issue a certificate.

## TMS60 controller timing
- Frozen source `12343b974417c3ba23b64f592961c151e52f7ede`.
- Prior original local Chromium `cloudflare-pages-browser-transition.mjs` intermittently failed the exact assertion **Previous worker controls the source generation** immediately after `navigator.serviceWorker.ready`.
- The additional job reruns the **unmodified** owner transition script 3 times (desktop+mobile each run). A second diagnostic uses genuine pinned source, 10 isolated contexts per viewport, and records `ready`, `controller`, worker URLs/states, and controllerchange latency.
- The diagnostic still asserts immediate controller ownership and reports late ownership separately; later control **never** upgrades a violation into PASS. No changes to the product owner repository or service worker implementation.
- Disposable PostgreSQL 17 two-JWT Account RLS, backup ownership, identity mismatch and owner-A-only deletion tests stay independent; the H15 projection and real Account integration remain NOT_TESTED.

## Clean30 owner-only plan
- Frozen owner source `052731bd44f7e2113fd789be55dfb199d4f82fae`.
- Rehearsal fixed the two high-severity dependency advisories by changing only six inserted/six removed lines in disposable `package-lock.json`: `vite 7.3.6→7.3.7`, `source-map-js 1.2.1→1.2.2`. `npm audit` reported 0 advisories and original tests/build/release/runtime passed.
- The frozen owner's security gate is still FAIL. Only separately authorized owner-repo adoption and exact new-SHA certification can resolve it.

## Evidence categories
- `PASS`: an actually executed step verified on its explicitly named source revision / test environment.
- `FAIL`: a reproduced assertion, missing security gate, or provenance defect.
- `NOT_TESTED`: original schema features excluded from disposable prerequisites, production Account JWTs, production private Core gateways, real-device installed PWA, or unscheduled runs.
- Synthetic signing fixtures and mock accounts **never** count as a human release approval.
