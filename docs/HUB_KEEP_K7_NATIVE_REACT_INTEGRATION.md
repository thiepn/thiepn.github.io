# Hub × KEEP K7 — Original React native integration boundary

**Draft PR #168 only. Never merge or deploy this feature without a qualified original KEEP build.**

## Implemented on this PR
- A persistent native React mount host `[data-keep-native-host]` within the Hub Knowledge route, **outside** Hub's frequently rerendered `[data-workspace-content]`.
- An explicit owner-initiated **Open original KEEP editor** action. It preserves Hub shell/navigation and loads the real K6 `mountOriginalKeep` export from a same-origin, verified ESM build; **no iframe, substitute editor, or converted Hub note database**.
- Hub authority is supplied as a revocable `{mayMount,revoked}` contract. Route exit, identity changes, privacy mask, pagehide, source change and original vault-header changes unmount and lock/purge the original React session using KEEP's original `vaultEncryptionService.lockVault()`.
- KEEP interim source writer remains disabled and its displayed private content is scrubbed during original React takeover. The original React app owns `KeepNotesDB`.
- Before mounting, verify that the **original** `KeepNotesDB` v1 `notes` object store already exists on the Hub origin; refuse absent/upgraded databases, and do not initialize one implicitly. This prevents converting a separate-origin KEEP database into a brand-new duplicate.
- A strict original-build manifest: pinned SHA-256 of all 1,269 original source files via `hub-embed/SOURCE_SHA256.json`, plus pinned checksums of K6's original `entry.tsx`, `vite.config.ts`, `package.json`, and `bun.lock`. The browser verifies every emitted ESM JS, CSS, worker, WASM and other asset against the manifest before dynamic import.
- Offline-only `scripts/build-original-keep.mjs` compiles the original K6 source and verifies all hashes, build outputs, sizes and generated manifests before writing **local** `public/keep-b3-native/` assets. This output is gitignored; it must not be deployed without separate qualification and authorization.
- Focused unit tests for manifest validation and desktop/mobile Chromium tests for absent source, absent build, original takeover/retained account safety are committed.

## Original KEEP input (unchanged)
The separately provided `KEEP_B3_native_hub_react_K6_candidate.zip`, SHA-256 `702f59e6fc8a51c3094e0b051287cd986932c698ac53a3782a9ba6c0da04ed3d`, supplies the complete original 1,269-file source and original test closure:
- `src/App.tsx`, `src/pkm/workspace/NoteWorkspaceView.tsx` and `WorkspaceProvider`
- `src/services/storage.ts` and original record IDs/ownership
- original `src/pkm/encryption/vaultEncryptionService.ts` / Argon2id `kdf.ts` / AES-GCM / key purge / auto-lock
- `hub-embed/entry.tsx` and `hub-embed/vite.config.ts`
- `hub-embed/SOURCE_SHA256.json`, `bun.lock`, original `package.json`, tests

The source manifest digest pinned in Hub is `415ae18e0c1ca2ca4ac8e424a2f13fa7ff2717edcebdfc8e02c933a54ee4ee58`.

## Source-qualified local staging procedure
1. Extract the exact K6 ZIP to a local working directory, leaving the original `src/` files untouched.
2. In that extracted K6 root, **only when a compatible reviewed dependency environment is available**, use the original `bun.lock` to install dependencies. Never substitute mock React or crypto packages. The current container has neither Bun nor the original dependency closure, and network access is unavailable.
3. From a Hub checkout, run `node scripts/build-original-keep.mjs /absolute/path/to/keep_b3_native_hub_candidate`. It refuses unknown packages, changed source files, missing Vite, incomplete/unsafe emitted chunks, absent React export or existing generated output.
4. Inspect the locally generated `public/keep-b3-native/manifest.json`, run `npm run typecheck`, `npm run test`, `npm run build` and browser tests on the **exact branch head**. Original vault unlock, auto-lock, recovery, offline/mobile, CSS portals and cross-tab privacy must pass.
5. After independent authorization of a preview, the same-origin built assets may be staged for testing. No deployment or production changes are authorized by this PR.

## Not accomplished yet
- The complete original KEEP B3 source tree is **not committed/vendored into the Hub Git tree**, because the available connected GitHub write interface cannot ingest the local ZIP or recursively read container files. Instead the exact local source version and offline staging pipeline are pinned on PR #168. Do not describe this as complete source vendoring.
- Original React/Vite cannot compile in the current container (`vite` and React dependencies absent). The original encrypted lifecycle is included in the K6 candidate and called by its mount wrapper, but has **not run in Hub**.
- The full Hub TypeScript/Vitest/build and desktop/mobile Chromium acceptance are **NOT_TESTED** on this exact head because there is no runnable dependency-installed checkout and GitHub has reported no exact-head CI runs.
- Browser-origin ownership requires a pre-existing KEEP B3 database on the Hub origin. If KEEP was historically used on another origin, this explicit gate correctly refuses connection; an owner-reviewed migration is separately required.
- The original KEEP React app imports global CSS/portals and may not be compatible with Hub layout/keyboard behavior; no claims of successful integration testing yet.

## Required next batch
Transfer/version the entire original K6 source into GitHub using an authorized file-upload/checkout workflow, then qualify the original Bun dependency closure and build in CI. Repair genuine source/runtime failures and execute exact-head desktop/mobile browser acceptance. Preserve the canonical IDs, Argon2id/AES-GCM keys, encrypted recovery and exclusive data ownership. Never merge/deploy while unresolved.
