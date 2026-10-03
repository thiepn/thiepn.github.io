# H1 validation record

Date: 30 September 2026. Base: `c039bf189442f21ccdb0861e74f6a63d9bba6327`.

## Passed locally

- Clean lockfile install; no package or lockfile changes.
- Generated-output consistency, current catalogue/media/link/source validators.
  Validator inventory: 39 registered records, 31 listed, 27 reviewed Hub apps.
- Astro type check: zero errors/warnings; seven existing hints.
- Unit tests: 64 passed, including H1 recovery, task search and 100/250 fixtures.
- Static production build: 54 pages built.
- H1 browser checks: 22 passed in headless Chromium 153, including rendered
  100/250-app fixtures and keyboard direct-link navigation; 320/390/768/1024/
  1440 px, both themes, open-dialog axe checks, local preference persistence,
  blocked storage, invalid/empty pins, no-JS launchers and query/reload recovery.
- Existing compatibility suite: 140/141 passed in the same engine. The one
  failure is isolated below, with baseline reproduction.
- Project-add automation fixture: metadata-only addition succeeds without UI edits.
- Existing 250-artifact benchmark: search average 3.637 ms, p95 4.695 ms;
  archive p95 0.075 ms in this local execution environment.
- Built useful-transfer budgets pass: root 24.2 KiB gzip, Home 26.2 KiB, Search
  23.2 KiB. This accounting covers HTML plus referenced initial JS/CSS; it
  excludes image/font bytes and later fetched chunks/payloads. Home initial
  JS is 3.2 KiB gzip. These are synthetic bundle measurements, not field Web Vitals.
- Root manifest, app registry, native app routes and app service workers have
  no source changes. No Account/Core/Supabase migrations or production writes.
- Desktop/light and mobile/dark Home/Search captures inspected. The review
  found a missing Unicode glyph; quick capture and mobile navigation now use
  inline SVGs. New H1 checks were rerun after that correction.

## Existing external-media failure

The public `/byte/` route's existing character previews load from
`raw.githubusercontent.com/thiepn/byte/v0.1.0/public/assets/characters/...`.
Nine visible image references did not load in this environment, failing the
generic public-route image assertion. The exact same assertion and URLs fail
in a separate untouched worktree at the base commit. H1 does not change Byte
source or preview URLs. The test was not skipped, weakened or given invented
image fixtures. This remains an external-media dependency to verify in CI/live.

## Browser and release boundary

The pinned Playwright browser download returned an HTML response instead of a
ZIP in this environment. Local tests therefore used an independently unpacked
Chromium 153 headless binary from `@sparticuz/chromium`, installed outside the
repository. Browser configuration and temporary binaries are not part of this
change. The repository's normal Chromium/Firefox/WebKit CI configuration remains
unchanged and includes all new H1 tests. Cross-engine CI results and physical
Android/iPad/desktop checks are not claimed by these local results.

H1 is implemented and locally verified within that boundary. It has not been
merged/deployed by this validation record. H2 is Account entry/session/return
behavior; private provider certification is subsequent work.
