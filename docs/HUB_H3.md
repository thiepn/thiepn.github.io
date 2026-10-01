# THIEPN HUB H3 — Notes, Library and TMS60 provider contracts

Contract foundation implemented; authenticated private pilot endpoints are not implemented or certified. The proposed integrations remain handoff-only; this branch is not deployed. This distinction is intentional: a provider contract, catalogue entry, Account connection and authorized data endpoint are four different things.

H2 Hub PR #56 and Account PR #2 passed their CI checks as verified on 2026-10-01; both remain open/unmerged. H3 is stacked on Hub H2. H2's real Google/callback and multi-device certification gates still apply.

## 1. Current-source reconciliation

| App | Audited revision | Observed owner implementation | H3 implication |
|---|---|---|---|
| Notes | `a14d671bebe8715640c11ad5c8c5988749bfd820` | Local database plus optional cloud sync; email/password flows using existing THIEPN identity; canonical shared Notes session key; `launchIntent.ts` supports `capture=text`, `capture=checklist`, UUID note links and owner search; cloud records include entity payloads, user IDs and deletion timestamps | Existing sync is not a bounded cross-app summary API. Do not load all raw notes, bodies, attachments, labels or revisions into Hub. A verified Hub identity does not prove that browser-local notes belong to it. |
| Library | `f8ccec78d2290d1b3dfde7343d5e19db32ccdf43` | Account-free IndexedDB v9; native progress schema v2; reading identity includes work ID, edition and release version; reading activity distinguishes hosted/personal and EPUB/PDF/web; owner continuity handles normalized current/furthest positions | Reading history is device-private, not an Account namespace. Explicit local consent is needed before exporting a projection. Never read Library's IndexedDB from Hub or silently bind it to the current account. |
| TMS60 | `be068d9476fe045680d59113d8adfa40f2ce2b80` | Independent canonical origin; Supabase sync keyed by `(user_id, translation_id)`; app scheduler tracks wording/reference separately, learning state and review evidence; local account-switch recovery protects against merging accounts; cloud state ceiling is 32 MiB after the translation migration | Hub must accept a small translation-specific projection from the owner. Do not fetch its complete cloud state or duplicate scheduler calculations. Two due tasks for one verse are two tasks and one verse, not two verses. |

On 2026-10-01, live unauthenticated read probes using the existing public publishable key against Notes and TMS60 cloud tables both returned HTTP 401 / `42501`. Only status/error codes were retained; no private row identifiers/content were reported. This verifies these anonymous reads were denied at that time, not owner-vs-other-owner isolation or Hub scope enforcement. Existing Notes repository migrations do not provide a complete fresh-database authorization reconstruction; no stronger certification is inferred.

Account's current permissions include `identity.basic`, `app_data.read`, `app_data.write` for selected apps, and optional backup inclusion for TMS60. They do not establish a separate Hub client identity or authorize the new contribution purposes below. Library has no current Account identity contract to reuse.

## 2. Implemented result

- Public provider discovery: `/hub-providers.json`, with version, source revisions, budgets, supported navigation actions and disabled private operations. It contains no user state, grants, session IDs or fixture data.
- Public structural response schema: `/hub-provider-schema.json`; source `contracts/hub-provider-v1.schema.json` uses JSON Schema draft 2020-12.
- Typed semantic validation: `src/lib/providers/contract.ts`. It rejects wrong provider/request/operation/context, version mismatch, unknown fields, invalid resources, malformed freshness, unsafe payload shapes and UTF-8/item budget excess before a response can enter the result cache.
- An independent provider runner with per-provider access contexts, deadline/cancellation, six visible contributions, three concurrent requests, rejection of late responses and in-memory-only result storage.
- Fictional Notes, Library and TMS60 fixtures for contract certification. They are source test artifacts, not published application data.
- Three actual Home handoffs: new Notes capture, Library-owned reading continuation resolution, and opening canonical TMS60. No inline save or private result count is fabricated.

The runner is not instantiated by Home yet. No app stores are accessed, no raw Supabase app tables are queried by the frontend, and no provider network request is made by the proposed handoff-only UI. The normal H2 identity code remains independently gated. No app repository, Account/Core registry, deployment, database schema, app manifest, worker or app storage is changed by H3.

## 3. Supported actions and disabled operations

| Provider | Working Hub handoff | Summary / Continue / resource search | Inline capture / Inbox |
|---|---|---|---|
| Notes | `https://thiepn.dev/notes/?capture=text`; checklist action also declared | Contracts and fixtures only; disabled until a bounded owner endpoint and scoped authorization exist | Disabled. Navigation opens a draft in Notes; Hub receives no durable-save receipt and claims no save success. |
| Library | `https://thiepn.dev/library/saved/`; Library resolves its own reading state | Device-scoped contracts only; disabled pending explicit consent and app-owned projection/resume resolution | Unsupported; no synthetic cloud account or universal capture destination |
| TMS60 | `https://tms60.thiepn.dev/`; choose translation/verse in the app | Translation/account-scoped contracts only; disabled pending an owner projection and scoped authorization | Unsupported; no Hub mastery updates, ratings, streaks or sync actions |

These handoff URLs carry no note body, search term, chapter position, CFI, token or private resource ID. They suppress referrers and work without JavaScript. H3 does not promise that TMS60 opens a review queue or selected verse; its current shell has no certified outer Hub deep-link handler.

## 4. Request and response contract

Requests bind `providerId`, operation, a fresh opaque `requestId` and a coverage context. Search may include at most 256 characters in its owner-bound request body; it is never copied into response fields, launcher URLs, diagnostics or persistent caches. Requests to unknown/private-disabled operations do not call adapters.

| Context | Required fields | Ownership |
|---|---|---|
| Account | canonical UUID `accountId`, `workspaceId:null` for these pilots, owner-specific `grantRevision`, `translationId:null` for Notes or selected translation for TMS60 | Must come from a fresh server/owner authorization snapshot; every real data request still needs trusted data-boundary enforcement |
| Device | opaque `deviceId`, `consentRevision` | Library's explicit same-device consent; contains no Account UUID; not uploaded or adopted as account data |

A response carries schema version 1, matching provider/operation/request/context, `privacy:private`, owner coverage, status, `observedAt`, `expiresAt`, nullable `sourceUpdatedAt` and bounded `data`. Allowed statuses are `ready`, `empty`, `unconnected`, `unsupported`, `offline`, `stale`, `error`. Non-ready/empty states contain `data:null`. Empty data means an authorized successful read found nothing; it does not mean missing consent or authorization.

The canonical timestamps are UTC ISO timestamps, optionally with three-digit milliseconds. The freshness window is positive and at most five minutes; a future observation beyond 30 seconds is rejected. Expired ready/empty payloads are stripped and become stale. A recent cloud observation means only that an owner cloud snapshot was queried; it does not certify local changes have synced. Source update time is separate. No global green sync indicator is derived from it.

### Notes projection

Only opaque UUID, bounded title and resource update time. No body, HTML, attachment URL, label list, reminder text or revision history. Deleted records and non-note entities must be excluded by the owner endpoint. Default coverage is `cloud-snapshot`, so local drafts/unsynced changes are not represented. A future local Notes projection needs a separate device context and explicit consent; it cannot be relabeled account-owned.

Summary/continuation: at most ten items. Search: at most twenty owner-matched results. A private query must be applied by the owner and never sent to general web search/AI. A selected note is resolved through Notes' validated UUID launch path by a future certified adapter, rather than accepting an arbitrary URL in the response.

### Library projection

Only opaque work ID, bounded display title, format (`epub`, `pdf`, `web`), positive edition, release version, normalized current/furthest progress and update time. Current must be between zero and furthest; furthest is at most one. Preserve edition/release identity; do not interpret an old edition's position as progress in a new edition. No annotations, highlights, CFI, PDF bytes, EPUB archive, object URL or arbitrary path is exported.

The owner must use its native continuity/migration rules and resolve a valid resume action. Personal books must remain explicitly device-private. Hub must not claim a reader-wide percentage or cross-device progress from a partial device snapshot. H3's generic saved-library handoff is valid even before a selected-resource resolver exists.

### TMS60 projection

Every request/response binds the selected translation. Resource identity is `<translation>:<verse 1..60>:<wording|reference|learning>`. Export a reference label, dimension and update time, never full verse text, answers, word error statistics, events or complete progress state.

Only summary returns `dueTaskCount`, `dueVerseCount` and `newVerseCount`; continuation/search permissions do not carry aggregate counts. Counts are nonnegative bounded integers (tasks at most 180; unique verses and new verses at most 60), and unique due verses cannot exceed due tasks. The owner scheduler determines which tasks count as due at the observation time. Cloud snapshot coverage can omit unsynced local activity; neither timestamp nor count is a promise of full device freshness.

## 5. Authorization, lifecycle and isolation

Proposed purpose scopes are `<provider>.hub.summary.read`, `<provider>.hub.continue.read`, `<provider>.hub.search.read`. They are contract identifiers, **not existing or automatically granted Account permissions**. The runner checks an owner's fresh access snapshot as a UI leakage-prevention gate. Passing a JavaScript object or setting a frontend feature flag is not authorization. A production endpoint must independently enforce authenticated subject, consumer/client identity, current scope grant, app/workspace/translation and account lifecycle on every request.

The result key includes contract version, provider, operation, account/device context, workspace, grant/consent revision and translation. Search uses its request ID instead of persisting query text. Results live only in a private in-memory map. Each new visible set cancels hidden/previous requests and clears the old map. Account switch, sign-out, grant or consent change must call `setAccess`/`clear` synchronously; every pending controller aborts, and an epoch check makes a late response ineligible even if an adapter ignores cancellation. The runner supports simultaneous account-based Notes/TMS60 and device-based Library contexts without reassigning ownership.

No worker cache, localStorage projection cache, persisted private search history or token transport is introduced. Failures emit only provider/status; exceptions/payloads/private titles are not forwarded as diagnostics. A malformed or unsupported provider affects its own contribution, while launchers remain available.

## 6. Budgets and failure behavior

| Budget | Enforcement |
|---|---|
| Visible contributions | At most 6 distinct provider/operation pairs |
| Concurrency | At most 3 requests; additional visible work queues |
| Foreground deadline | 2 seconds per adapter call, independent timeout/fallback |
| Summary/continuation | At most 10 items and 32 KiB UTF-8 |
| Resource search | At most 20 items and 64 KiB UTF-8 |
| Stream handling | Reject announced/actual byte excess, bad status/content type and invalid UTF-8; cancel bounded streams on abort |
| Freshness | Maximum five-minute response window; private data removed on expiry; expired access snapshots cannot emit/cache results |
| Writes | None in H3; navigation only, no automatic retries or fake receipts |
| Added recurring infrastructure | €0; no new service, schema or recurring provider reads |

For later certified transports, quotas/read/egress must be measured before enablement. Reading Notes' entire record list or TMS60's up-to-32-MiB state merely to populate a 32-KiB card violates this design. Build owner projections rather than transferring full databases.

## 7. Gates before private enablement

1. Complete H2 live Google/callback and account-switch/session certification. Merge/deploy the reviewed foundation in the proper order.
2. Choose and implement a trusted consumer-bound authorization/data path. Current broad user JWTs and owner RLS alone do not prove Hub-purpose permission enforcement. Do not solve this with a hidden iframe/token-copy bridge or a shared-origin database scan.
3. Implement bounded owner projections: Notes filters tombstones/entity types, Library obtains explicit device consent and resolves format/edition continuity, TMS60 calls its own scheduler and binds translation. Record the app revision and actual deployment used.
4. Certify positive owner access, other-owner denial, purpose-scope denial, grant/consent revocation, account deletion restrictions, wrong workspace/translation, offline/empty/stale data, timeout and old-account late responses.
5. Record physical-device/cross-engine behavior and quota/read/egress costs. Only then change the corresponding `privateReadsEnabled`/operation flags and wire the adapter into visible Home modules.
6. For inline Notes capture later, require a consumer-bound create scope, destination/account choice, draft recovery, an idempotency key with owner uniqueness enforcement, durable owner receipt, duplicate/lost-response behavior and conflict tests. Current `capture=text` navigation does not meet or claim those write criteria.

## 8. Validation and research evidence

The contract fixtures pass the independent JSON Schema draft-2020-12 validator and the stricter TypeScript semantic validator. Unit coverage tests distinct empty/unconnected states, UTF-8/item limits, unknown fields/version, identity/workspace/grant/translation mismatch, no Account adoption of Library history, progress/count relationships, expiry, independent failure, cancellation, three-request concurrency, six-contribution budget and stream abort.

Browser verification covers Home handoffs, public-only discovery, no provider API calls, no-JavaScript links, 320/1440 light/dark reflow and axe. Existing H1 directory/pin/search/scale checks remain in place. Supabase anonymous denial probes are limited live checks, not complete permission certification. No authenticated private app data was accessed.

Validation on 2026-10-01: 102 unit checks passed (including 29 new H3 cases); 38 Chromium browser checks passed across H1 foundation (22), H2 paired Account (10) and H3 providers (6). Three fictional fixtures pass independent JSON Schema validation. Typecheck has zero errors/warnings and seven existing hints; build, generated-output, catalogue/link syntax and performance checks passed. Home initial HTML/JS/CSS is 26.3 KiB gzip under the existing audit. These are local automated checks; cross-engine/device and real authenticated provider certification remain open.

Source references are pinned in section 1. Current primary research consulted 2026-10-01:

- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): role grants and owner row policies are distinct checks; neither automatically adds a new consumer purpose scope.
- [MDN postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage): cross-origin messages need exact origin/source and content checks. H3 introduces no message/token transport because there is no certified one to reuse.
- [MDN IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB): browser database access is an origin/storage capability, not proof of the Account that owns a device's app data.
- [Supabase changelog](https://supabase.com/changelog.md): scanned current breaking changes. H3 adds no Supabase SDK, database migration or managed-project configuration change.

Next phase: **H4 — Daily Home modules** (Today, Continue, Capture and supporting sections). Public/app-owned handoffs can progress; private cards remain gated on the owner endpoints and authorization certification above. Contract completion does not certify the full private H3 pilot or waive those gates.
