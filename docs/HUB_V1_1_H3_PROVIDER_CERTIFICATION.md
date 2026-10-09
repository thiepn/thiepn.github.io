# THIEPN Hub V1.1 H3 — Provider Contract Certification and Isolation

## Stack

- Qualified H2 parent: `60ab07a304c04aef43bff5a202770f3ca42663fe` (eight exact-head workflows successful).
- This separate H3 draft must remain unmerged; the provisional H4 PR #97 remains based on H2 until H3 qualifies and H4 is reconciled onto it.
- The locked Prism reference, route allowlist, permission scope, server endpoints and snapshot baselines remain unchanged.

## Enforced invariants

1. A provider connection requires a matching adapter identity, schema-valid context for that provider, finite expiry, and a correctly typed permissions list **before** it can change active state.
2. Notes and TMS60 may contribute in the same Home frame only when their account IDs agree. Case-insensitive canonical account identity is used solely for the client-side isolation fence; authoritative owner checks remain in each provider and account service.
3. A new account owner clears **all** prior provider connections, device contributions, cached view results, and in-flight work before the new account connection is installed. Library device sessions require separate reconsent.
4. Same-owner grant-revision or translation-scoped session replacement does not accidentally wipe another valid same-owner provider; each adapter remains subject to its own verified grant and expiry.
5. Revocation, disconnect, identity clearing, and expired visibility already use runner-generation cancellation and deadline-bound redaction. This phase verifies these guarantees with separate owner-concurrency, late-response, invalid-scope, multi-provider and revision regressions.
6. No background provider search, cross-account aggregation, silent privilege elevation, private inline writes, or server-side enforcement claims are added.

## Qualification and limits

Run and inspect all eight exact-head workflows, their job logs and artifacts, including the Quality suite and paired browsers. The newly added unit tests are `tests/unit/prism-h3-provider-certification.test.ts`. Failed CI must be repaired without lowering assertions or replacing screenshot goldens.

Browser tests with test fixtures are **not** genuine authenticated two-human/two-device signoff. No physical Android/iOS device, screen-reader operator, production owner-service test, privileged permission approval, or production API verification is claimed. Keep PR draft, with no deployment/merge/private production API activation.

## Successor

H4 provisional PR #97 must be reconciled onto a qualified H3 head with the same H4 changes and fresh exact-head acceptance. H5 may start only after that reconciliation and qualification.
