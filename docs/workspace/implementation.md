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
