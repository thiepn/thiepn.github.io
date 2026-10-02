# The Orrery — Long-Term Maintenance Baseline

Current stable line: **2.0.x**

## Maintenance policy

The v2 product architecture is frozen around Explore / Sky / Learn / Missions. Stable maintenance should not add broad features. Create a new planned phase for feature expansion.

Patch releases are appropriate for:
- correctness or astronomy regressions
- broken production/PWA boot or update behavior
- accessibility regressions
- security/privacy issues
- browser/device compatibility failures
- external API contract drift that breaks an existing feature
- material UX regressions introduced by maintenance

## Daily production burn-in

The `Orrery Production Burn-In` GitHub Actions workflow runs once per day and can also be started manually.

It checks:
1. production HTML, manifest, version metadata, and service-worker cache
2. embedded scientific/product tests
3. all four workspaces and responsive shell containment
4. Chromium service-worker registration and offline reload over production HTTPS
5. THIEPN Core precision health
6. a real Saturn observer request through NASA/JPL Horizons
7. Horizons object lookup
8. Open-Meteo geocoding and weather contract
9. Chromium and WebKit-class browser boot without page/console errors

Burn-in evidence is retained as a GitHub Actions artifact for 14 days.

## Escalation thresholds

**Immediate patch**
- production route does not boot
- service worker strands installed users on a broken release
- embedded scientific test fails
- shared-state privacy leaks observer location/timezone
- precision service returns malformed astronomy data
- stable release identity/version metadata disagree

**Patch after reproduction**
- one workspace is unusable
- browser/device layout or accessibility regression
- Open-Meteo/JPL contract changed and existing feature no longer degrades correctly
- sustained retained-memory growth across repeated identical post-GC stress batches

**Observe before changing code**
- isolated third-party timeout
- one failed scheduled external-service probe followed by recovery
- one-time lazy heap growth that stabilizes after GC
- cosmetic differences between browser engines that do not impair use

## Offline-first dependency rule

Explore, local Sky calculations, Learn, Missions, saved settings, and core navigation must remain usable without JPL Horizons, Supabase, Open-Meteo, geolocation, or install APIs. Optional network failures should degrade to local/offline behavior instead of blocking the app.

## PWA icon watch item

Production uses scalable SVG manifest icons, which are valid manifest resources. The release source also contains raster 192/512 and maskable assets. Add raster fallbacks to production only if physical-device install surfaces show a reproducible compatibility/quality issue.
