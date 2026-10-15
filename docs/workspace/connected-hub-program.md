# Connected Hub: coordinated improvement program

Prepared 15 October 2026. Status: implementation-ready plan; no new application fixes are claimed by this document.

## Outcome

Make thiepn.dev the useful front door to the whole THIEPN ecosystem: current apps, real work to resume, one trustworthy account connection, useful tasks/agenda and personal tracking, arranged in a customizable workspace. Preserve the approved expandable left sidebar, persistent desktop planner, flexible center and existing Apps browsing behavior. Every approved available app must be discoverable; its actual supported integrations must be explicit.

This is one coordinated program with shared registry, data, interaction and acceptance contracts. Implement compatible slices on one integration branch, then qualify the combined experience. Keep release checkpoints and rollbacks rather than merging every historical branch together.

## Audit baseline and limits

- Live public Home, shortcut editor, Apps, mobile Home, Connections, Search and Inbox were captured afresh on 15 October. The shortcut chooser contains **27 app choices** plus its separate action checkbox; Apps also shows 27.
- Main: `e0f64a41b519710136477511144de44f0fcfe3c4`. Account/sync candidate: Hub PR [154](https://github.com/thiepn/thiepn.github.io/pull/154), head `a44e04d`. It remains unmerged at audit time. Account dependency: [83](https://github.com/thiepn/account/pull/83), head `762fed8`, also unmerged.
- Hub renders `src/data/hub.json` through `getHubProjects()` and embeds that same roster into the workspace. Its separate `src/data/products-v2.json` has 10 products. Core main `f1125b2` has **12 products / 30 modules**, including staged entries; 21 modules are declared active with launch URLs, representing 19 distinct URLs. These are different entity types, not interchangeable app counts.
- Diet, Recipe, Orrery, Bikes, Tools and Games/Arcade are examples of current active registry destinations absent as such from the 27-choice legacy roster. Core also has a staged Finance entry missing from Hub’s product snapshot. An assigned URL alone does not make a staged app ready to publish.
- Curio, Nebula Foundry, PflegeLern and Wordfall are explicitly excluded by the legacy Hub list. Review the exclusion reasons; do not classify all four as accidental omissions or silently reinstate them.
- Read-only HEAD requests to the 19 active module launch URLs returned HTTP 200. This checks reachability, not app functionality, login, deep links or authenticated integrations.
- PRs [142–153](https://github.com/thiepn/thiepn.github.io/pulls) form a stacked draft feature chain based on older main. They contain relevant implementation but describe source-only work. Their presence is not evidence of a deployed feature.
- Account CI cannot start because GitHub reports payment/spending-limit problems. Preserve its protected exact-main-commit deployment requirements. The public Hub pipeline can run; private paired jobs that are intentionally skipped do not certify Account integration.
- Authenticated Google sessions, real private app records, external calendars and physical-device behavior were not exercised in this public audit. Screenshots cannot certify WCAG compliance or data isolation. Previously reported local tests belong to PR 154’s existing scope, not to this future program.

## What already works

Home and Apps share the main workspace shell. Core section changes preserve the page instead of reloading it. Layouts can be added, moved, resized, configured and saved; keyboard operations, local tasks/events/notes/trackers, export/import and recovery already exist. Mobile already has four primary destinations. Build on these capabilities.

The shortcut chooser already has a search input. Its key failure is its obsolete source and mixed layout/content editing, not the absence of a search box. Basic undo, date/timezone handling and recovery also exist; the work below extends and unifies them.

## Product and engineering decisions

1. **One inventory, several views.** Core’s reviewed product/module contract is the authority. Generate a versioned Hub launch manifest and derive Apps, shortcut choices, aliases, search and action discovery from it. Public-only approved fields enter the static site; never publish every GitHub repository automatically.
2. **Stable identity over labels.** Use canonical `product/module` references; retain old app IDs as resolvable aliases. Renames and moves update destinations without dropping pins. Do not require a staged parent product to hide its independently active modules.
3. **Separate availability from capability.** Track approved/listed, launchable, account-connected, readable, resumable and writable independently. A launch-only app is not described as synced. Every card/widget can explain its real capability and freshness.
4. **Native apps own their data.** Hub owns layouts and its own tasks/events/notes/trackers. Native app entities remain in their native stores. Aggregation uses bounded owner-authorized projections, resource references and supported commands, not duplicate databases of full private content.
5. **One writer for Hub records.** Capture, tasks, planner, search commands, widgets and app-derived links use the same command/store boundary. Cross-app commands add destination authority and idempotent receipts.
6. **One shell, one state model.** Home, Apps, Tasks, Calendar, Trackers, Search, Inbox, Connections and Hub workflow pages share navigation, theme, spacing, controls and transition behavior. Native apps can keep task-specific layouts while adopting shared identity, navigation and common design primitives.
7. **Dense when useful.** Auto-size empty widgets, offer compact/list views and show actionable information above the fold. Do not fill desktop with large empty cards or show fabricated activity.
8. **Version before expanding the schema.** New task/event/source fields require versioned parsing, migration, export and server validation. Negotiate writer compatibility: an older client must not erase fields it does not understand. Preserve a recovery snapshot before migration.

## Gap and fix register

P0 blocks trustworthy release or core discovery; P1 blocks a useful connected daily experience; P2 improves breadth and usability after those foundations. Every row is part of this program; priority determines dependency order.

| ID | Priority | Confirmed gap or unverified requirement | Fix and completion check |
|---|---|---|---|
| A1 | P0 | Legacy 27-app roster and separate product snapshots drift; newer active destinations cannot be selected. | Generate one reviewed launch manifest from Core. Every eligible active module appears in Apps and shortcut search; every exclusion has a reason. CI fails on unintended drift. |
| A2 | P1 | Names and launch destinations can change while saved shortcuts retain legacy IDs. | Resolve aliases to canonical module IDs at read/launch time; migrate pins and search indexes without duplicates. Old bookmarks and existing workspaces still open the right app. |
| A3 | P1 | Shortcuts are manually chosen from old defaults; app discovery is detached from daily use. | Add Pinned, Recent, Connected and Suggested sections, manual ordering and explicit pin/unpin. Suggestions use explainable opt-in local signals and never move pins. Add pin actions to Apps. |
| A4 | P2 | There is no personal escape hatch for useful destinations outside the managed roster. | Add user-defined HTTPS shortcuts with clear external/launch-only identity, safe URL validation and private user storage. Do not imply authentication or data integration. |
| B1 | P0 | Live Hub sign-in remains disabled; tested sync work is still in PRs. | Qualify Account #83, deploy its sharing controls, then qualify/deploy Hub #154. Verify real login, refresh, deliberate sign-out, two devices and revocation. Restore CI billing first. |
| B2 | P1 | Connections live in a secondary legacy page with technical copy and fragmented sharing controls. | Build one connection center showing account, per-app capabilities, scopes, last successful sync, unavailable/stale states and specific reconnect/review actions. Never show unavailable data as zero. |
| B3 | P1 | Shared identity does not by itself prove consistent login/return behavior in every native app. | Inventory each app’s auth/session path; adopt the shared Account SDK where appropriate, with isolated app tokens, exact callbacks and deliberate opt-out. Test account switching and returns per app. |
| B4 | P0 | Cloud sync needs operational acceptance beyond synthetic tests. | Exercise conflict resolution, queued edits, backup/export/restore, disconnect/delete behavior, quota/retention and client upgrades. Show pending/synced/paused/review states on desktop and mobile; preserve owner isolation. |
| C1 | P1 | Existing provider registry is mostly handoff-only; PR #154 adds a separate narrow metadata path. | Reconcile these into one versioned provider/capability runtime with owner, source, revision, freshness, cancellation, permissions, timeouts and partial-failure behavior. One slow app must not block the Hub. |
| C2 | P1 | Continue is local-note based live; candidate insights open generic apps rather than verified individual resources. | Add native-authorized resumable resource references and app-owned deep links. Notes resumes the chosen note, Library the right edition/location, TMS60 the selected translation/session. Fall back honestly when unsupported. |
| C3 | P1 | Connected coverage stops at limited Notes/Library/TMS60 metadata; newer apps have no Hub adapters. | Publish an integration matrix for every app. Add owner-backed summaries/actions for the user’s priority apps, starting with existing supported contracts; expand Diet, Recipe, Languages, Bikes and others according to actual owner capabilities. Finance remains gated until ready. |
| C4 | P1 | Hub capture and native app capture are separate authorities; destination and outcome can be unclear. | Offer explicit Hub task / Hub note / supported native destination. Show destination before save, durable pending/receipt/error state, and retry the same command safely. Opening an app is not labeled as saving. |
| C5 | P2 | Recent activity reflects Hub-local actions rather than useful cross-app continuity. | Combine bounded authorized app activity with Hub actions, source labels, timestamps and real resume links. Deduplicate by source/event ID; support hiding individual sources and clearing local history. |
| D1 | P1 | Unscheduled, overdue, priority and selected-day tasks are presented by different filters. | Define shared selectors and one task Inbox, Today and Upcoming policy. Planner, full Tasks, widgets and search agree on the same records/counts; overdue work is visible without duplication. |
| D2 | P1 | Tasks and events lack an explicit shared scheduling/resource relationship. | Add schedule/reschedule/unschedule and task-to-time-block links, with clear ownership and undo. Completing a task does not silently delete an unrelated event. Repeated commands remain idempotent. |
| D3 | P1 | Native calendar is manually entered; recurrence, reminders and external source coverage are limited or absent. | Add day/week views, recurrence rules, exceptions, DST-safe edits and reminders. Begin external coverage with reviewed read-only ICS snapshots from #143, clearly label snapshot freshness, then add authenticated read-only calendars through owner-supported integrations. Request writes separately. |
| D4 | P1 | No coherent Today → Focus → Week → Review journey is live. | Reconcile the planning drafts into shared selectors/views: choose next work, focus it, schedule it, review completed/deferred work and explicitly carry it forward. Keep the customizable workspace available. |
| D5 | P2 | Trackers are manual and disconnected from app progress. | Support habits/streaks, editable goals and optional app-sourced measurements. Label manual vs imported values, explain timezones, deduplicate source events and allow corrections without double counting. |
| E1 | P1 | Search, Inbox and Connections still switch to the older site header/layout. | Move these Hub surfaces into the persistent shell with consistent controls, focus, selected navigation, privacy and back/forward behavior. Preserve valid old URLs and the trusted reading host boundary. |
| E2 | P1 | Pinning opens a full layout editor with row/column coordinates and a long mixed-purpose form. | Separate Edit shortcuts from Edit layout. Put app choices and ordering first; use visual size presets and drag/keyboard controls. Keep raw grid coordinates in an optional advanced section. Simple pinning should not create a layout-recovery banner. |
| E3 | P1 | Fresh desktop Home dedicates much of its first screen to large empty cards. | Use content-aware height, compact summaries, a short useful setup path, more meaningful widgets and configurable density. Preserve stable placement and accessibility; do not auto-reorder a user’s layout. |
| E4 | P1 | Mobile’s vertical widget stack pushes agenda and next work below the first screen. | Add a useful Today summary and an accessible agenda/planner sheet, quick capture and touch-friendly editing. Retain the existing four-item navigation and reliable keyboard/screen-reader flows. |
| F1 | P1 | Header search covers apps/tasks/notes; public Search is another system; events, trackers, commands and private app resources are fragmented. | Build one command/search engine with grouped results, aliases, keyboard navigation and supported actions. Add opt-in bounded app-resource search with clear source/privacy and cancellation; retain local results offline. |
| F2 | P1 | Inbox is a disconnected status surface rather than a useful attention queue. | Aggregate real reminders, failed jobs, conflicts and user-selected app signals. Group/deduplicate, support reviewed dismiss/snooze/resolve, and distinguish none / not connected / stale / error. Native owners decide what resolves an issue. |
| F3 | P2 | A calendar item is not a delivered reminder; no complete notification policy is established. | Define in-app reminders, permission-requested browser notifications, quiet hours, timezone behavior and offline limits. Introduce reliable background delivery only with a tested supported backend; do not promise it from an inactive static page. |
| G1 | P1 | The workspace controller has grown into a large combined rendering, editing, search, routing and persistence module. | Extract typed commands, selectors, services, widgets and route controllers behind the existing single writer. Use behavioral tests to preserve working navigation and data flows during refactoring. |
| G2 | P0 | New features will extend a whole-workspace document with bounded size and versioned parsers. | Design schema/writer negotiation, migrations, document growth limits and recovery first. Benchmark realistic large workspaces and concurrent devices. Incremental sync is justified by measured size/latency, not a speculative rewrite. |
| G3 | P1 | Reliable return after interruption, updates and partial failures must be verified across the combined feature set. | Preserve drafts, pending commands, focus and routes through reload, offline, auth refresh and service-worker upgrades. Use per-source health and retry controls; quarantine invalid/unknown data rather than overwriting it. |
| G4 | P1 | Connection failures lack one useful, privacy-preserving diagnostic surface. | Provide safe last-error/status codes, version/release info and redacted exportable diagnostics. Never log note bodies, tokens, financial/health data or private search queries. Define actionable support/runbook steps. |
| H1 | P0 | Twelve overlapping feature drafts and the separate sync branch create conflicting implementations and acceptance claims. | Build a dependency map and behavior matrix, extract/rebase useful slices onto current main + qualified sync, resolve overlap once, then supersede old drafts after verified parity. No bulk merge by PR number. |
| H2 | P1 | Source presence, passing public tests and live app capability can be confused. | Maintain an implementation/CI/deployed/real-owner-verified release ledger. Generate truthful capability states from the same reviewed manifest. Make skipped private tests and staged apps explicit to maintainers. |
| H3 | P0 | Current tests do not certify the future combined connected product. | Run the complete acceptance journeys below on the final head, with synthetic and separately authorized real-owner evidence, accessibility, migration, offline, performance and rollback checks. Release only the capabilities that passed. |

## App inventory repair: first implementation slice

Implement A1–A3 first because stale inventory makes both the launcher and later integrations unreliable.

1. Export Core’s product/module contract with schema version, source commit, generated timestamp, canonical IDs, aliases, visibility, availability, supported URLs, owner repo and actual capability references.
2. Build a reviewed public Hub projection. Reconcile the 27 legacy entries so smaller independent apps do not disappear when product families are introduced. Review the four existing exclusions. Treat catalog membership, family grouping and Home pinning separately.
3. Compare Core and Hub snapshots in CI and generate a readable added/changed/retired report. Discovery may open a reviewable update; it must not silently publish private or staged repositories.
4. Use the same projection in Apps, the shortcut picker, public search, action search and launch routing. Keep the Apps screen’s existing browsing/filter behavior while updating its inventory and destinations.
5. Migrate saved pins through aliases at read/launch time, retain ordering and user choices, and visibly mark a retired/unavailable shortcut instead of silently dropping it. Resolve renamed PDF/Tools/Games and product modules consistently.
6. Allow pin/unpin from Apps and a simple shortcut editor; add recents and optional suggestions only after launch tracking has a clear privacy policy.
7. Verify every eligible active module is selectable and launchable. A staged parent can contain usable active modules; a staged module with a URL is not automatically advertised as available.

## Native app integration contract

Each app publishes capability tiers independently:

| Tier | User promise | Required evidence |
|---|---|---|
| Launch | Opens the correct available app/module. | Reviewed URL, alias resolution and reachable destination; functional route smoke. |
| Account | Recognizes the intended THIEPN identity. | Shared-session contract, exact callback and switch/revocation tests. |
| Read | Shows bounded private summaries/search results. | Owner-enforced access, consent, schema, freshness and offline/error behavior. |
| Resume | Opens the specific owned resource. | App-owned identifier/deep-link contract, context/permission checks and return path. |
| Command | Saves, schedules or resolves in the native app. | Explicit authority, idempotent receipt, concurrency checks, failure recovery and native read-back. |

The initial matrix must cover every launchable module. Ship no invented counts or unsupported actions. Prioritize deeper integrations using the owner’s app list; pending that answer, use the already supported Notes/Library/TMS60 contracts followed by active Diet/Recipe/Languages/Bikes opportunities after checking their actual APIs.

## Reuse and branch consolidation

| Drafts | Useful work to assess | Required reconciliation |
|---|---|---|
| #142–143 | Today aggregation/mobile usability; read-only local ICS parser/panel. | Current unified shell, actual calendar schema and honest snapshot coverage. |
| #144 | Owner-authorized continuation desk. | PR #154’s shared sign-in and metadata path; one provider runtime, genuine resource resume. |
| #145–146 | Task Inbox/capture/scheduling; six additional widgets. | One command writer, current widget schema, migrations and dense defaults. |
| #147 | Search/actions palette. | Current public catalog, canonical aliases, event/tracker/resource coverage and accessible routing. |
| #148–149 | Daily Focus/personalization; recovery/return flows. | Existing drafts/backups, cloud conflicts, offline/auth transitions and mobile access. |
| #150–153 | Contextual task/event handoffs; day/week/review/carryover workflows. | Shared scheduling semantics, recurrence and unified navigation; remove duplicate panels. |
| #154 + Account #83 | Shared sign-in, durable workspace sync and bounded app metadata. | Real-owner qualification/deployment; expand capabilities through explicit owner contracts. |

Read the actual diffs and tests before extraction. Several drafts modify the same `workspace-home.ts`, shell, home-view preferences and styles; later draft titles are not proof that earlier behavior is compatible with current main. Keep original commits available for traceability. Do not import the older Prism backend/NO_GO stacks as a replacement for the chosen account/sync design.

## Delivery sequence and dependencies

| Checkpoint | Work that proceeds together | Exit gate |
|---|---|---|
| 0. Freeze contracts | Record baseline; reconcile app inventory; define canonical IDs, capabilities, source records and schema/writer compatibility; map branches. | Agreed manifest, migrations, integration matrix and acceptance fixtures. |
| 1. Restore the front door | Registry/shortcuts repair; Account/sync release qualification; command/selector extraction; shared shell foundations. | New available apps can be found and pinned; old pins survive; account lifecycle and offline edits verified. |
| 2. Make the daily loop useful | Task Inbox/Today, scheduling, calendar views, capture, useful widgets, content-aware layout and mobile agenda. | One record follows Capture → Today → calendar → Focus → Review without duplication or lost edits. |
| 3. Connect native work | Provider runtime, genuine Continue, priority app adapters, search/actions, attention Inbox and optional tracker sources. | Capability-specific native read/resume/command journeys pass; partial app failure leaves Hub usable. |
| 4. Release as one coherent experience | Finish secondary-route parity, notifications within supported limits, diagnostics, accessibility and migration/performance testing. | Exact final-head checks, real-owner evidence, truthful release ledger, rollback and production smoke. |

Suggested planning size: 5–8 engineering weeks for the connected daily-workspace milestone with two engineering streams and design/QA support, followed by app-owner-dependent integrations. This is a scope estimate, not a delivery commitment. Re-estimate after the draft diffs and each native owner’s API readiness are assessed. Complete cross-app commands for every app cannot be dated before their owner contracts exist.

## Acceptance journeys: the shared definition of done

1. **New app discovery:** add an approved active module to Core → reviewed generated Hub update → appears in Apps, shortcut chooser and search → pin and launch → still pinned after sync/reload/rename. Also verify staged/private entries stay appropriately gated.
2. **Existing user upgrade:** open an older exported/local/cloud workspace → migrate supported fields and aliases → preserve all content, pin order, layout and drafts → reopen in another supported client without field loss. Unsupported old writers stop safely.
3. **One account:** sign in, refresh, reconnect and deliberately sign out; change accounts from another tab; keep pending edits with their original owner; never show/upload the previous owner’s data to the new one.
4. **Daily loop:** capture an unscheduled task → find it in Inbox → schedule it → see matching Today/agenda counts → focus/complete/defer it → review/carry forward intentionally. Undo must preserve source relationships.
5. **Calendar correctness:** day/week views, all-day events, timezones, DST boundaries, recurring exceptions and read-only imports agree. Unsupported recurrence is labeled, never guessed.
6. **Resume work:** a real authorized native app change appears within the declared freshness budget → resume that exact resource/context → return to the same Hub state. Revocation immediately blocks future reads/commands and expires visible metadata within its declared budget.
7. **Search to action:** one palette finds current apps, local records and allowed native resources; keyboard navigation opens the correct destination/action. Private queries are not added to public URLs or analytics.
8. **Failure and conflict:** edit offline on two devices; reconnect with overlapping edits, lost acknowledgement, failed app source and a service-worker update. No lost/doubled writes; both conflicting versions remain recoverable.
9. **Mobile/accessibility:** reach next task, agenda, capture, connections and recovery at 320px, large text and keyboard/screen-reader navigation. Verify focus, contrast, target sizes and reduced motion; preserve the desktop planner and dense useful center.
10. **Operate and release:** compare registry/source/deployed capabilities, inspect redacted diagnostics, restore a backup, roll back the frontend and smoke the correct production artifact. Public-only checks do not substitute for private authenticated evidence.

## Evidence pointers

Visible-flow report and accepted screenshots: `/workspace/hub-audit-20261015/audit-report.md`. Source/branch inventory, Core snapshot, raw capture observations and launch HEAD checks are saved beside it. This program extends the implemented adaptive-workspace foundation; older build-plan route/scope statements are historical where this document or later shipped decisions supersede them.
