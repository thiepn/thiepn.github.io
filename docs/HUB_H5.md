# THIEPN HUB H5 — Search and Inbox

H5 extends H4 with scoped Search and an explicit Inbox entry. Apps and Actions work now. My resources and Inbox expose source coverage without reading private data, showing fictional items or inventing an unread badge. This branch is not deployed. H2 identity certification and H3 owner endpoint certification remain open.

## Capability reconciliation

The roadmap calls for a personal portal across 100+ apps, not a second database owning their contents. H5 preserves the reviewed 27-app directory and adds capability-based composition. Public discovery and private owner reads remain separate.

| Surface | Working now | Certification still required |
|---|---|---|
| Apps | Local public catalogue search, canonical app launch, details, URL/reload recovery | Future directory onboarding and H7 scale qualification |
| Actions | Four reviewed task handoffs: Notes text capture/checklist, Library saved reading, TMS60 opening | Durable cross-app writes and owner receipts under H6 |
| My resources | Notes/Library/TMS60 coverage, ownership/context explanation, direct source links | Real search endpoints, scoped grants and lifecycle-bound UI |
| Inbox | Dedicated route, coverage, Account entry, keyboard Hide/Show, no invented total | Real attention feeds, bounded transport and acknowledgement contracts |

No current pilot has a certified private search or attention projection endpoint. All production private-read flags remain false, transport URLs remain null, and no resource index, app-local database scan or direct cloud-table query is introduced. A future app can join the registry without receiving access to another app's data. The current three-pilot types are deliberately finite; onboarding a fourth private provider requires reviewed contracts rather than only a launcher record.

## Search presentation and behavior

Search keeps the existing page shell, one scroll and compact rows. Apps, Actions and My resources form a labeled tablist with a single tab stop. Arrow keys cycle scopes; Home/End choose the ends; Escape clears the public query and returns focus to Apps. Local tabs activate immediately because their panels are already present. Result counts use a polite status region without moving keyboard focus.

Apps is the default and retains H1 matching/ranking, 27 launchers and public details. Actions searches only reviewed action titles, descriptions and keywords. Results are navigational links with canonical owner destinations: selecting one opens its app and does not execute a save. The currently supported actions are sourced from the owner handoff registry; arbitrary commands, payload URLs and inferred capabilities are excluded.

Only public Apps/Actions queries use `q` in the URL, bounded to 200 characters. Actions additionally uses `scope=actions`. Scope restoration falls back safely to Apps for unknown values. With JavaScript disabled, the entire public directory and its links remain available; scoped filtering is progressive enhancement.

My resources currently has no query input. Collecting a private query without a usable certified source would add no value. Its panel states that no private search was performed and shows each source as Not connected, with an Open app link and context explanation. It distinguishes Library's device-private state from Notes cloud snapshots and TMS60 account/selected-translation snapshots. Hub identity alone is not a provider grant.

An incoming `scope=resources&q=...` is never interpreted as a private search: initialization clears the input and replaces the URL with the scope alone. This cannot undo an incoming URL's prior transmission, server logging or browser history exposure. Future private queries must never be placed in URLs, resource links, analytics, local/session storage, external search or AI requests. The present implementation sends none.

## Future federation contract

`FederatedSearch` composes the existing H3 `ProviderRunner`; Search does not instantiate it. Its grouped view exposes per-owner status, bounded known result count and responding/requested-source coverage. A failure or unsupported source is never silently converted to a successful empty result. Ordering remains grouped by owner; there is no invented cross-app relevance score or supposedly comprehensive count.

H3 limits continue: at most six requested provider/operation contributions, three concurrent reads, a two-second deadline, 20 search items and 64 KiB per response. Queries are bounded to 256 characters with control characters rejected. New queries cancel earlier generations and clear their results even when the replacement query is invalid. Late responses cannot emit into a newer view. Results and queries are not persistently cached.

Access requires an enabled operation, fresh purpose-specific permission and exact owner context. H5 strengthens the runner to reject invalid pilot contexts before invoking an adapter: Notes needs account scope without translation, Library device scope, and TMS60 account scope with a selected translation; unsupported workspace contexts are denied. Response request ID, operation, context, privacy, coverage, version and freshness remain bound and validated. Expired payloads are cleared from the actual in-memory cache, not only a returned copy.

Before a data-backed UI is enabled, its controller must clear/cancel on identity/account/workspace/device/translation changes, revocation, sign-out, lock/hide, page exit and background privacy boundaries. Cross-account results must never be retained behind a loading label. For 100+ apps, select a bounded relevant provider set before execution; do not fan out to every installed app. Ranking, pagination, quota, freshness and incomplete-result presentation need owner-backed evidence.

## Attention contract

H5 publishes structural discovery at `/hub-attention-schema.json`, with `contracts/hub-attention-v1.schema.json` and a fictional test fixture. The fixture is not a deployed feed. Public provider discovery gains an additive attention contract; its proposed permissions are `notes.hub.inbox.read`, `library.hub.inbox.read` and `tms60.hub.inbox.read`. These names are not existing grants and are not automatically issued by Account.

An attention envelope is versioned and bound to provider, operation `inbox`, request ID, exact owner context, private classification, declared coverage and canonical observed/expiry timestamps. Successful data contains at most ten items and the whole UTF-8 response is at most 32 KiB. Unsupported, unconnected, offline, error and stale responses carry no items. Runtime validation adds authority, semantic date, byte and request checks beyond the structural JSON Schema.

| Item field | Meaning |
|---|---|
| `issueId`, `dedupeKey` | Opaque stable owner identifiers; one-to-one within the response |
| `title`, `type` | Bounded plain text and allowlisted attention class |
| `severity` | Critical, important or normal; a security notice cannot be normal |
| `state` | Owner issue lifecycle: open or resolved |
| `attention` | User attention state: unread, read or dismissed |
| `updatedAt`, `expiresAt` | Owner timestamp and optional issue expiry |
| `actionKey` | Reviewed `open` action, resolved from the registry |

Allowed classes are sync conflict, failed export, device approval, completed job, chosen reminder and security notice. These are contract vocabulary, not claims that the three pilots implement them. Save-success notifications, routine game events, raw logs, arbitrary HTML/body fields and response-provided URLs are rejected. A source must implement the underlying lifecycle before supplying a class.

`InboxStore` is a passive, memory-only contract store. It does not fetch, poll, schedule, acknowledge, dismiss or write owner state. A future certified bounded transport calls begin/accept/fail. Each new refresh invalidates the previous pending response; access changes synchronously wipe pending requests and envelopes. Disabled/expired access clears stored content. Invalid version/schema responses fail closed without logging raw private payloads.

Items dedupe within their owner, never across owners. The most recently updated version wins; equal-time ambiguity favors resolved/dismissed, then read, rather than reviving an unread issue. Resolved, dismissed and expired items are excluded from the active view. Remaining items order by severity, then time, then stable owner/key. Read open issues remain distinguishable from unread open issues. Opening the canonical owner route changes none of these fields. Issue-specific navigation is deferred until its owner contract is certified.

The store reports `knownUnread` for the returned projection. Its nullable `unreadCount` is also a projection count, available only when all configured sources returned fresh ready/empty envelopes. It is not a count of every issue in every app: bounded feeds may omit additional issues. A future global badge requires explicit completeness/pagination or authoritative count metadata; H5 renders no badge or total. Idle, failed, unavailable or stale coverage cannot justify a zero. A true successful empty response is distinct from not having read the source.

## Inbox presentation and privacy

`/inbox/` is noindex and excluded from the public route manifest/sitemap. Desktop portal navigation and the four labeled mobile destinations provide Home, Apps, Search and Inbox access. Inbox does not use an unread dot, red zero or speculative summary. Its initial heading says Inbox is not connected yet and explains that no feed has been read, which does not establish that there are no unresolved issues.

The Account card uses the existing H2 identity behavior. Hide Inbox removes Account and coverage from visible layout and keyboard/accessibility navigation. The same focused button becomes Show Inbox. This shield is visit-local, independently reversible and not a persistent Home preference, authentication boundary or sign-out. Future contribution DOM is cleared on hide, identity events, page exit and background visibility. No private contribution is currently instantiated or rendered; future controllers must also clear their store and abort transport at those boundaries.

Coverage rows wrap rather than clip at 320 pixels and enlarged text. Owner links remain available without JavaScript. Loaded public controls work without a network; offline reload and another app's offline availability are not certified. No new dependency, iframe bridge, service worker, telemetry or Account/app schema is introduced.

## Research decisions

Primary references consulted 2026-10-01:

- [OWASP query-string exposure](https://community.owasp.org/vulnerabilities/Information_exposure_through_query_strings_in_url): private queries stay out of URLs; URL replacement cannot retroactively remove exposure.
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): owner-side deny-by-default authorization on every request remains mandatory. Browser checks and context fields are not authorization proof.
- [W3C APG Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/): roving focus, arrows/Home/End and immediate local-panel activation.
- [W3C Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages): scope/result status is programmatically announced without focus changes.
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController): cancellation supplements generation/request binding; neither alone authorizes a response.

These inform the implementation; the attention vocabulary, conservative reconciliation and bounded projection policy are THIEPN design decisions. They do not certify a current owner endpoint.

## Verification and release

Verification on 2026-10-01: 133 unit checks and 57 local Chromium browser checks passed (22 H1, 6 H3, 9 H4, 7 H5 and 13 paired Hub/Account). The seven H5 browser checks passed again after the final scoped-copy change. Typecheck returned zero errors/warnings with seven existing hints. Build, generated-output, catalogue/media/link syntax and performance gates passed. An independent Draft 2020-12 validator checked both schemas and all four fictional fixtures. Search initial HTML/JS/CSS is 26.5 KiB gzip; Inbox is 18.2 KiB, with Inbox added to the ongoing budget audit. These transfer figures exclude subsequent fonts/media and are not field Web Vitals.

Coverage includes query URL isolation, public filtering/reload, keyboard tabs, disabled/no-private-read behavior, partial failure/timeouts, cancellation and late responses, owner/device/translation access, version/byte/item/date rejection, attention reconciliation, expiry/revocation, no-JavaScript links, light/dark mobile/desktop, 200% text and axe. The paired check uses the actual built Hub/Account and SDK with a controlled issuer; it verifies that Hub sign-in does not authorize private owner reads. It does not certify live Google, production grants or owner APIs. The clean default build contains no paired-test fixture key, and Inbox is absent from the sitemap. Cross-engine CI and physical-device qualification remain separate. Production identity remains disabled in the default build. Owner contracts, server authorization, device bridge, rate limits, real revocation and complete-count behavior remain qualification gates. No merge or deployment is performed by H5.

Next: **H6 — Workflow handoffs**. Extend only actions supported by reviewed owners, preserving explicit intent, durable receipts, idempotency and truthful outcomes. A click, redirect or received projection must not be described as a successful app mutation.
