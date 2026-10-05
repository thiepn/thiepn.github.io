# H20 — Integrated Release & Device Qualification

Status: automated qualification and native-boundary repair; **private activation
blocked**. Production remains GitHub Pages. No DNS, Vercel promotion or OAuth
client enablement is performed by this phase.

H20 updates the paired workflow to current immutable Account and Library sources
and adds Android Chrome and iPad Safari viewport/touch emulation to the three
desktop engines. Eight scenarios run in each of five projects (40 total).
The new long-draft case checks horizontal overflow and reload recovery with no
automatic write. Emulation does not certify real keyboards, browser suspension,
Safari storage eviction, cross-device sync or installed PWAs. The Library bridge
continues to report explicitly device-local metadata despite Library cloud sync.

## Hosted boundary

Real hosted probes found native Account inventory and Notes attachment access
available to managed tokens despite raw Notes RLS denial. Account's H20 migration
guards 19 native management RPCs, private implementation ACLs, native Account
rows and the Notes attachment bucket. Hosted tests use actual `authenticated`
roles and rollback fictional fixtures; H20 adds 28 assertions alongside 24 H17/H18
regressions. Signed OAuth token issuance is a separate, unmet qualification.
Other products in the shared database remain outside this repair. Their raw
tables/native RPCs must be reviewed or isolated before managed OAuth activation.

## Activation gate

`node scripts/h20-release-gate.mjs --candidate <40-character Hub SHA> --activation`
fails unless the exact candidate has every gate for every integration. The
structure-only command is permitted to pass with activation blocked. Evidence
requires exact owner revisions, a tester, observation within seven days, correct
physical/observed mode, physical device/OS/browser/version details and an existing
SHA-256-verified artifact. Browser fixtures
cannot substitute for signed OAuth or physical devices. No pass records are
fabricated; the committed records list is empty. Future selective qualification
can be inspected independently for capture, reading and due review. This gate
does not enable anything; production's public-only artifact gate still rejects
all staged private flags.

## Remaining observations

- A real managed OAuth client and signed authorization/revocation flow are absent
  (zero registered clients, consents and enabled Hub allowlist entries observed).
- Shared-project native surfaces still require managed-token isolation review.
- Physical Samsung/Android Chrome and iPad Safari runs are absent. On each, verify
  sign-in/denial, capture with keyboard, uncertain save/reload without duplicates,
  reading-note preparation and resume, due-review navigation, background/resume,
  sign-out/revocation, offline interruption and shared-device draft erasure.
- Verify deployed owner revisions and full Library reader content; paired tests
  use real owner builds with simulated OAuth/write replies, not production data.
- Record actual request/response size, p95 latency and usage/cost before activation.
  Existing response limits, explicit reads and durable receipts remain enforced.
- Legacy Pages publishing still invokes a second Jekyll pipeline. Repository
  Settings → Pages → Source must be GitHub Actions. The connector cannot change
  that administrative setting; adding `.nojekyll` could publish the wrong source
  tree, so it is not an appropriate substitute.

## Rollback

First disable enabled entries in `private.account_hub_clients` (currently none).
This denies subsequent scoped RPCs even for an unexpired managed token. Clear
staged frontend flags, serve the last qualified public artifact and rerun exact
public artifact verification. Do not remove the security migration, delete user
notes, erase unknown commands or expire capture receipts. Existing browser drafts
remain available for explicit recovery. Hosting migration stays under the
separate controlled Vercel release plan.

Next: H21 — Controlled Pilot Activation, once the above real authorization,
shared-project isolation and physical-device evidence has been obtained.
