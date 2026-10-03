# THIEPN Hub H11 — Notes owner projection

H11 implements the first bounded owner contribution after H10. Notes supplies server-only summary, continuation and title-search projections; Hub verifies the actual owner code through its existing v1 envelope validator and provider runner. This completes a source implementation and regression slice, not a hosted private pilot.

## Source and integration

The owner implementation is [Notes PR 74](https://github.com/thiepn/notes/pull/74), pinned at `213a37d8adcc00c35b06d4fb4f1a79b2e9b55818`. Its runtime requirements and limits are documented in [HUB_OWNER_PROJECTION.md](https://github.com/thiepn/notes/blob/213a37d8adcc00c35b06d4fb4f1a79b2e9b55818/docs/HUB_OWNER_PROJECTION.md). Hub's CI checks out that exact revision. Tests import its handler directly; no duplicate owner projection lives in Hub.

Notes reads only metadata from its existing sync table: canonical resource ID, title and timestamps. It excludes tombstones and Trash; summary and continuation also exclude Archive. Search reads titles only, includes Archive and treats wildcard characters as literals. Parameterized SQL selects at most 10 summary/continuation rows or 20 search rows. The full note payload and content never enter the projection response, including the one-MiB content fixture.

The owner requires a trusted authorization dependency and a read-only database dependency that preserves RLS. It independently checks account, consumer, audience, exact operation purpose, grant revision, expiry, account lifecycle and Notes Sync access before and after reading. It bounds input bytes, response bytes and elapsed time, aborts stale work, and returns generic failures with no-store headers. No credentials, grants, account IDs, private titles or search queries are logged.

## Validation

Notes' local release check passes with 298 unit checks, including 43 new owner checks against real PostgreSQL in a local PGlite fixture. The fixture exercises owner isolation under RLS, ordering, row limits, literal title search, Archive/Trash/tombstone behavior, authorization denial, revocation during reads, malformed inputs, oversized content and abort/deadline behavior. It does not certify the hosted database's schema, indexes or policies. The dev-only PGlite dependency and server component are absent from Notes' browser bundle.

Hub adds 16 cross-repository checks using the actual Notes handler and the existing bounded reader, envelope validator and runner. They cover ready/empty results, private body-only queries, disabled production discovery, missing-purpose denial, independent owner denial, grant revocation, sign-out cancellation, account partition changes and freshness expiry. The enabled test adapter and fictional grants exist only in tests. Run locally with an exact owner checkout:

```sh
H11_NOTES_DIR=/absolute/path/to/notes npm run test:hub-owner
```

## Production status and remaining prerequisites

All production flags remain false. The H8 public release profile, 27 apps, seven canonical routes and 49 public artifacts remain unchanged. Notes remains a handoff-only registry provider with no transport and no enabled private operation. Its existing public source revision is not relabeled as a deployed owner backend.

No hosted route, real scoped-token verifier, consumer grant service, database migration or private browser transport is created here. Wiring requires an owner-authoritative consumer/purpose verifier, account and entitlement enforcement, RLS qualification against the deployed schema, database-boundary grant checks, measured query/index behavior, reviewed routing/CORS/rate limits, and H10's real identity/device observations. A shared Supabase login is not Notes authorization. The two authorization snapshots do not make a separate SQL read atomic or prove immediate JWT revocation.

This component can be installed in the selected trusted owner runtime once those dependencies exist. H11 does not select a competing backend or waive identity and authorization prerequisites.
