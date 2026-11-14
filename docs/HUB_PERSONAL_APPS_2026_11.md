# Hub personal Apps selection — 13 November 2026

## Owner-approved scope

- Ordered proposed Home shortcut pins: StudyOS, My Daily Devotion, PDF Studio, THIEPN Library, Notes, TMS60, Tiny Tools, Clearpage.
- Hide LiGoQuiz and Control **from the personal Apps view only**. Their canonical launch entries, source repositories, public catalogue/archive records and project URLs are not removed.
- Keep all other 31 generated published entries and existing shortcut-only apps discoverable.
- Add Clearpage to the opt-in **shortcut-only** directory because its owner README identifies `https://page.thiepn.dev/` as the live address. A source-provided address is not independent uptime or device certification.
- Display four owner-requested apps as **non-clickable pending candidates**, never as live/public manifest entries:
  - Folio: repo describes `https://thiepn.dev/folio/` as a deployment target; a successful live release was not confirmed.
  - Randomizer Arcade: source reports a stable release but does not identify a verified canonical production URL.
  - CHAOS CLUB: source says the public site serves a frozen offline build; the canonical production URL and device QA are not independently confirmed.
  - THIEPN Convert: source reports post-v1 hardening but no verifiable canonical launch endpoint was found.
- The compiled source at this change has 31 generated public entries, 13 shortcut-only entries including Clearpage and 4 non-launchable pending candidates; 46 items are personally visible by default with 2 hidden.

## Personal preferences and migration

The saved Hub workspace is owned by an individual guest/account namespace in IndexedDB. Existing workspace records are never overwritten with the new default pins. The 8-item preset applies to **new** workspaces, or on a deliberate click of **Use my selected 8 shortcuts**. The old `thiepn:hub-preferences` key, stored pins, density, user-custom shortcuts and tasks are not rewritten or cleared. Existing workspace exports can be reimported unchanged.

`WorkspaceState.preferences.hiddenAppIds` is optional for compatibility with saved version-1 workspaces. When absent, the two owner-selected default hides are resolved in memory; no migration writes to storage at load time. When present, even `[]` is honored. Hide/show saves through the established versioned workspace store, with revision conflict handling and account isolation. An accessibility-labeled **Show hidden personal apps** toggle reveals hidden cards for restoration.

The underlying generated Core manifest, project archive, `src/data/hub.json`, apps' production status, Core grants, account schema and public search corpus remain unmodified. Pending candidates have no linked launch URL and cannot be pinned until qualified.

## Verification

Added unit tests for exact ordered pins, new workspace initialization, old saved configuration, optional-field recovery, reversible hides, candidate gating and legacy parsing. Added Playwright tests for personal Apps filtering, restoration after reload, non-clickable pending candidates, Home shortcut order and explicit legacy-preset opt-in.

Before acceptance: run `npm ci && npm run validate && npm run typecheck && npm test && npm run build`, then the supported browser/Accessibility suite with Playwright prerequisites. Actual production-origin HTTP and real-device status are **NOT_TESTED** in this branch unless later evidenced. No merge or deployment is authorized.
