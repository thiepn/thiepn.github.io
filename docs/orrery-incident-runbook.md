# The Orrery — Incident Runbook

## 1. Establish scope

Check whether the failure is:
- core application/PWA
- one workspace
- precision/JPL only
- weather/geocoding only
- one browser/device
- stale installed service-worker cache

Do not treat an external-service outage as a core Orrery outage when offline functionality still works.

## 2. Verify release identity

The following must agree:
- rendered `APP_VERSION`
- Help footer
- `public/orrery/version.json`
- service-worker cache generation

Never reuse a service-worker cache identifier for changed stable bytes.

## 3. Check synthetic evidence

Open the latest **Orrery Production Burn-In** workflow result and its artifact:
- `orrery-burnin.json`
- `orrery-playwright.xml`
- traces/screenshots when Playwright fails

## 4. Dependency isolation

For precision failures verify:
- `/functions/v1/orrery-precision/health`
- CORS origin is `https://thiepn.dev`
- a fixed Saturn observer query
- Horizons lookup

For Sky network failures verify Open-Meteo geocoding and forecast independently. Offline astronomy should continue working.

## 5. PWA/update failures

Confirm:
- manifest loads
- service worker loads
- current cache generation is unique
- online reload becomes controlled
- subsequent offline reload boots the same stable version

If users are stranded on a broken cache, restore last-known-good runtime bytes and publish a new cache generation.

## 6. Regression gate before patch promotion

Require:
- embedded suite green
- legacy share schemas still readable
- privacy test green
- responsive smoke green
- zero page errors
- production HTTPS offline reload green
- dependency synthetic green or documented external outage

## 7. Release discipline

Use patch versions for stable fixes. Keep a frozen release branch for every production patch. Broad feature work belongs in a separately planned phase, not an emergency maintenance patch.
