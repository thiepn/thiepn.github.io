# Hub consolidation Phase 12 — original KEEP + legacy reconciliation

## Exact provenance
- Base: draft PR #189 `feat/connected-hub`, Phase 11 HEAD `87ec3b9b1d4519d16ac94acf4676c9d690b86357`.
- The complete **original** K11 KEEP B3 source tree came from the frozen PR #168 HEAD `0d39528b6baaa205ea38f733731f36ad9ea0f16c`.
- Original `vendor/keep-b3` Git tree SHA: `5f69b63683990e5a98e187111bd58d5f879bb495`. Imported as a tree pointer, not 1,269 reauthored files. Import commit `c86c11dc76081b92f45235e6f67becbbe996a270`.
- The original locked loader `src/scripts/keep-native-loader.ts` and offline checksum/Vite builder `scripts/build-original-keep.mjs` reuse Git blob IDs from PR #168 unchanged; original manifest and revision checks still apply.

## Working candidate
- `/home/knowledge/` keeps Hub-local Knowledge intact and introduces an explicit **Open original KEEP** action.
- A persistent React mount host is outside `data-workspace-content`, preserving real `App`/`NoteWorkspaceView` ownership without an iframe, substitute crypto or second note engine.
- Only a verified original KEEP v1 database already on the same Hub origin may be opened; missing/unknown schemas fail closed. No first-use enrollment, silent schema creation, cross-origin transfer or onboarding sample seeding is offered.
- Original KEEP load requires the pinned source/input manifest, every emitted asset SHA-256, same-origin ESM, owner authorization and a live session. Its own original `beginHubSession` and `endHubSession` lock/purge vault keys and activity listeners.
- Session is revoked on Hub identity event, privacy/owner invalidation, route exit, pagehide, backgrounding and original vault-header changes. The Hub Knowledge view returns without changing the original database.
- Hub and original KEEP remain distinct data owners. No KEEP record IDs, original attachments or encrypted vault material are placed into `WorkspaceStore`.

## Historical Folio / Notes
- Existing native Today/Calendar/Tasks/Trackers and original Hub Knowledge are the primary workflows; Phase 11's retirement of duplicate source panels remains.
- `/home/legacy/` continues original explicit source-consent shares and historical deep links.
- The new bounded reconciliation preview counts title similarity and cross-owner ID conflicts **without showing source titles**, persisting snapshots, or treating similar titles as the same records.
- It intentionally returns `importable:0`: those source summaries contain neither note bodies nor attachments nor authenticated export provenance, so they cannot safely migrate data. Original exports, backups, rights, encryption and conflict decisions are required before any future migration.

## Executable qualification supplied
- Original K11 subtree includes original vault locking race, embedded listener lifecycle, real AES-GCM and B1b/B2/B3 source tests, unchanged.
- New original loader manifest unit tests plus 4 adversarial reconciliation unit cases.
- Chromium mobile/desktop tests for missing original DB, absent verified build, unchanged original records and retained Hub notes.
- Separate authentic-runtime Chromium 390px/1440px test is *intentionally skipped* in the default bundle and runs only when `KEEP_NATIVE_BUILT=1` after full original source build.
- New no-deployment GitHub workflow `.github/workflows/hub-keep-native-phase12.yml` installs the frozen original Bun dependencies, qualifies original KDF/AES/vault sources, typechecks KEEP separately, source-hash/build-checks original Vite output, builds Hub and runs the real browser acceptance. Missing dependencies or failing original tests are FAIL, never converted to PASS.
- Hub tsconfig excludes only the separate vendored project from Hub's own typecheck; its own original `bun run lint` remains a mandatory independent gate.

## Release holds
- **NO_GO** until exact-head ordinary Quality/Reading/Library and dedicated original KEEP full source and browser qualification genuinely PASS, including real Argon2id lock/unlock/autolock and source-preserving editing.
- Signed owner-approved full legacy exports and migration review remain unavailable; no data migration may execute.
- No merge, production deployment, storage reset, encrypted vault bypass, original owner deletion, rights approval, cloud credential or billing changes.
