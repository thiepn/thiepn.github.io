# Adaptive workspace implementation

Implemented B0–B6 of the approved build plan. B7 remains a release requirement; this branch is not a production deployment.

Home now renders the configurable workspace rather than a duplicate Apps catalogue. It has an expandable rail, persistent desktop task/agenda planner, six configurable widget types, three presets plus blank, named workspaces, pointer/keyboard geometry editing, Undo/Redo/Cancel and draft recovery. Full local Tasks, Calendar, Trackers and Settings routes share records. Capture, tracker logs, search and activity operate on real local content.

Local persistence uses an identity-scoped IndexedDB snapshot with atomic optimistic revision checks, edit drafts and replacement backups. Layouts and content are separate objects in this snapshot, rather than independent database tables; this keeps imports and conflict recovery atomic. Tasks/events/notes/trackers are shared between layouts within the same identity. Legacy pins/density/timezone/privacy are migrated once with an untouched source backup. Cloud sync and provider snapshots are not introduced.

Export/import includes bounded schema validation and a count/mode preview. Unsupported future versions stay untouched. Storage failures retain in-memory content with an Unsaved indicator. Multi-tab conflicts preserve changes and require recovery rather than silently overwriting. Privacy can be held per tab. The offline worker caches public workspace shells/static assets only; auth, connections, query requests and provider APIs are excluded.

Existing owner handoffs and feature-gated cloud integrations remain at `/home/connections/`. Device Library reading stays inside the Home account/connection dialog because the immutable owner bridge trusts `/home/` specifically. Closing or masking this dialog clears its RAM-only snapshot and frame; reopening requires fresh opt-in. Existing Apps, search and launch routes remain compatible. Release policy checks the embedded app registry and every new private workspace route.

## Validation

- Typecheck: zero errors/warnings.
- Unit suite: 279 passing tests.
- Focused Chromium production scenarios: 66 passing, including offline reload, scope changes, conflicts and recovery.
- Full Chromium studio suite: 195 passing. The final focus-return and preset-sizing changes additionally pass targeted checks; populated light/dark axe checks report zero violations.
- Build, registry/source validation, performance budget, release qualification, release rejection fixtures and served-artifact smoke fixtures passed.
- Pinned Library owner: 18 local Chromium scenarios passed; pinned reading-pilot owner: 19 local Chromium/Android scenarios passed, including dialog close and 44px reading controls.
- Public Quality on the prior UI candidate: 583 browser scenarios passed across all three engines; the integrated reading-host candidate is being requalified.
- Firefox/WebKit and GitHub CI status must be recorded separately; local host startup limits do not establish cross-browser acceptance. The local Firefox workspace scenarios passed, with its populated accessibility and midnight checks verified separately; an existing Byte external-image failure remains in that broader local run.

## Release

CI-boundary PR #132 is merged; the UI PR now targets main. Media PR #133 and Orrery PR #134 are independent. Preserve the owner-only exact-main release workflow. After integrated Quality passes, dispatch Deploy to GitHub Pages on main with its exact qualified SHA, then run served UI/persistence/editing smoke checks. The connected tools cannot dispatch workflows and the local GitHub CLI token is invalid; live release cannot be claimed from this workspace.

Screenshots in this directory show the runnable implementation with disposable sample records, not the currently served site. See `design-qa.md` at the project root.

## Main-site routing

The workspace is the primary page at `https://thiepn.dev/`. The existing complete catalogue now renders at `/apps/` with its category filters, canonical URL and no-JavaScript launchers. Navigation, project return links, sitemap and release checks use the new catalogue address.

`/home/` stays a real workspace compatibility page because the pinned Library owner bridge only trusts that parent pathname. The root Account dialog links to `/home/#reading`, which opens the reading dialog. Both workspace addresses use the unchanged scoped IndexedDB database; no data migration or reset is required. Tasks, calendar, trackers, settings, connections and auth callback addresses remain available.

The offline shell registers `/workspace-sw.js` at root scope, with an explicit allowlist of workspace pages and static assets. The public Apps catalogue shares the offline shell; its category filters are the only allowed navigation query. Auth callbacks, connection pages, other queries and APIs are outside the navigation cache. The old `/home/workspace-sw.js` endpoint is retained for existing browser registrations. Root personal content remains noindex and has no analytics or sitemap entry; `/apps/` is indexable.

## One Hub interface

Home, Apps, Tasks, Calendar, Trackers and Settings use `WorkspaceShell`: one expandable rail, topbar search/capture/account, responsive mobile navigation, and persistent desktop tasks/agenda planner. Apps supplies its server-rendered catalogue through the shell slot. Catalogue cards and category controls use the same workspace typography, spacing, borders, colours and buttons; the second public-site header/footer and closing section are removed from Apps.

The shared controller keeps public catalogue nodes in place while identity, privacy, tasks and layout preferences change. Category links survive hydration and reload. Personal data stays masked under the privacy shield or an unavailable identity; public app browsing remains usable with disabled or unavailable storage. Search restores focus on close. Apps remains indexable and has no analytics while the planner renders personal local data.
