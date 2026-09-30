# THIEPN HUB — H1 portal foundation

Baseline: H0.1, reconciled on 30 September 2026 against main commit
`c039bf189442f21ccdb0861e74f6a63d9bba6327`. H1 is additive portal work over
the existing Astro site. The reviewed public catalogue remains 27 launchers.

## Routes and product behavior

- `/`: compact public Apps directory; all reviewed IDs, order, categories,
  canonical launch URLs, details links and four exclusions are preserved.
- `/home/`: personal launcher with eight starter pins, up to 12 selected pins,
  keyboard reorder, spacing, theme, browser-local date and full directory.
  It is noindex, excluded from sitemap and analytics. It contains no private
  app records or pretend sync status. Quick capture opens the existing Notes app.
- `/apps/`: static-host-compatible redirect to `/`, with a working HTML link.
- `/search/`: name/task search over the 27 reviewed apps, direct launches,
  empty state, query URL/reload support and no external query transmission.
  Static app links remain available without JavaScript. Search-page analytics
  is disabled even when a public analytics token is configured.
- `/hub-search.json`: public, build-generated curated search payload. The
  Ctrl/Cmd+K dialog uses this on portal pages. Work/archive pages retain their
  separate project/collection search and `/search-index.json` contract.
- Account links open `https://account.thiepn.dev/`. H1 does not authenticate,
  copy access tokens, assign app grants or change any Account/Core database.
- `/inbox/` remains unimplemented and is not advertised as usable navigation.

The Account/app origins, root/app manifests, workers, caches and local app data
are unchanged. TMS60 keeps `https://tms60.thiepn.dev/`; Scan keeps its native
Android distribution surface. Existing Work, project, collection, archive,
privacy and native download pages retain their routes.

## Preferences and privacy

Only `thiepn:hub-preferences` is written by Home customization. Its version-1
schema contains `pins` and `density`. Invalid/old/oversized data safely returns
to defaults; unknown retired slugs are pruned, duplicate IDs are deduplicated,
and an explicit empty pin list is preserved. No automatic recency ordering.
Storage failure degrades to in-memory customization with an explicit notice.
Cross-tab storage events refresh preferences. No origin-wide clear is used.

Theme keeps the existing `thiepn:index-theme` key and System/Light/Dark control,
avoiding competing preference stores. A blocked write still changes the current
visit's theme; system changes and other-tab updates remain supported.
These settings do not claim cross-device Account sync.

Starter pins: Notes, Library, French 3000, TMS60, PDF Studio, Steadybar, MathLab,
Clean30. These are editable defaults, not an inferred usage ranking. Folio,
Diet, Synth, Vault, Tuner and WTTN were not added to the public catalogue.

## Visual foundation

Portal-only neutral light/dark tokens and blue accent are scoped with
`html[data-portal]`; editorial pages retain their visual system. Content is
1280 px wide at a 1440 px viewport. Header is 56 px. App cards use 4/3/2/1
columns at 1120/800/560 px. Mobile uses one header and Home/Apps/Search bottom
navigation. App-owned widgets are absent until a certified provider exists;
there are no fake agenda, reading, study, health, weather or news counts.
Weather/news start disabled. Dense cards retain genuine app captures and
direct launches; project details remain secondary.

## Verification

Run the existing release gate plus the new H1 tests:

```sh
npm ci
npm run generated:check
npm run validate
npm run typecheck
npm test
npm run build
npm run perf:budget
npm install --prefix /tmp/audit-tools axe-core@4.13.0
npx playwright install --with-deps chromium firefox webkit
npm run test:e2e
```

`tests/unit/hub-foundation.test.ts` checks preference recovery/ownership,
frozen defaults, task lookup and metadata-only 100/250-app fixtures.
`tests/studio/hub-foundation.spec.ts` checks 320/390/768/1024/1440 px in both
themes, pin/spacing persistence, keyboard reorder and focus return, empty
pins, blocked storage, URL search recovery, Account-independent rendering,
curation, install identity compatibility, no-JS launchers and WCAG-tagged axe
checks including the open customization dialog. Existing Studio tests remain
the compatibility contract. Local browser fallback details and actual check
results belong in the PR validation record; no physical-device certification
or field Core Web Vitals is implied.

H1 introduces no dependency changes. Performance budgets now cover Home and
Search alongside public/legacy routes. The scale fixtures do not enter the
production catalogue; a future app requires reviewed metadata, not bespoke
portal page code.

## Next phase

**H2 — Account entry:** certify Hub↔Account session/return behavior, sign-out,
account switching and supported preferences without private leakage. Establish
the real cross-origin contract before enabling any Hub provider or cloud Home
preferences. H3 is the Notes/Library/TMS60 provider pilot after authorization
is proven. H1 is not a claim that those integrations already exist.
