# Hub × KEEP K9 — Imported B3 Build Fingerprints and Source Runtime Repairs

**Scope:** existing draft PR #168, branch `feature/hub-keep-k1-native-knowledge-workspace`. No merge, deployment, migration, access to credentials, production writes or costs.

## Demonstrated build-preflight failure fixed

The imported original KEEP B3 source at `vendor/keep-b3/` is byte-identical to the original K6 source archive at import commit `c9345270b50b7d82a2855d9b32614efd8ce47074` (verified via Git blob SHA matches for its source-manifest, original React entry, Vite configuration, package manifest and Bun lockfile).

But the existing K7 offline builder and runtime loader pinned **stale / incorrect** digests:
- Actual original source count: **1,269**, not 1,271.
- Actual K6 source manifest SHA-256: `415ae18e0c1ca2ca4ac8e424a2f13fa7ff2717edcebdfc8e02c933a54ee4ee58`, not `f7eca79bd43e76d470a3042ea3ae66bfa88ada46b49f6a37d96b846fe1f9fa59`.
- Actual original `hub-embed/vite.config.ts` SHA-256: `084560c67eb08f0413c97edafc04f16b4f1e15bb7e9c9ceea5aad8eb375581c7`, not `7d1ca4bf20954164fdf03a646dbe2bfd6476ce7b26a5f4ece0130c2668114c08`.

Fixed the builder and native Hub loader together. Added npm entrypoints for the original B3 source tests, source verification and isolated original React build, without introducing a second React app or notes store.

## Original B3 TypeScript/runtime repairs

The original standalone `tsc --noEmit` identified actual source issues beyond missing dependency types:
- `src/App.tsx` reads `Note.isDailyNote` in the original daily-note gamification workflow, but the canonical `Note` interface omitted this optional flag. Added `isDailyNote?: boolean` in the original type, preserving all existing notes and IDs.
- Six calls in the original archive/export, vault-diagnostics and gamification UI invoked nonexistent `soundscapeService.playSuccessChime()`. Corrected those call sites to the original, already implemented `soundscapeService.playCompletionChime()`; no new audio engine.

The affected four source files were patched without modifying KEEP encryption, original `KeepNotesDB`, storage records, Folio/Vault/Notes providers, or original editor ownership. Regenerated the existing `SOURCE_SHA256.json` with the four updated SHA-256s.

**Patched current original-source manifest SHA-256:** `ec50d0767c824ae1f822efc12ff43c3bb2a1143af43d92954a8e8d96df7d6faa`.

Both `scripts/build-original-keep.mjs` and `src/scripts/keep-native-loader.ts`, plus the existing unit manifest fixture, now pin that patched source revision. The original entry, package.json, Vite config and Bun lockfile remain unmodified.

## Executable local evidence

Against the byte-identical locally patched original source files and manifest (Git blob IDs compared with GitHub commit):
- B1b: **PASS 22/22**
- B2: **PASS 33/33**
- B3: **PASS 48/48**
- Original native entry and 1,269 original file SHA checks: **PASS**
- Builder JavaScript syntax and 9 pin consistency checks: **PASS**
- Standalone original `npm run lint` / `tsc --noEmit`: **FAIL**. Full original dependency closure unavailable; TS2307 module resolution and TS2875 JSX runtime missing, plus additional genuine type errors requiring later review. Newly repaired `isDailyNote` and completion-sound errors no longer appear.
- `npm run build:hub-embed`: **BLOCKED** (exit 127, `vite: not found`).
- Exact-head Hub Astro TypeScript, Vitest, full build and desktop/mobile Chromium: **NOT_TESTED**. The container lacks a dependency-installed exact-head Hub checkout; GitHub reports no runs for current HEAD.
- Original Argon2id/AES-GCM unlock, key purge, auto-lock and recovery *inside* the native Hub mount: **NOT_TESTED**. No pretend or parallel encryption engine is introduced.

## Remaining actions

1. Qualify/install the authentic original Bun dependency tree from `vendor/keep-b3/bun.lock` in an isolated, authorized runnable environment; run the original B3 TypeScript and Vite build and fix real diagnostics.
2. Build original `App`/`NoteWorkspaceView` via the existing K7 native bundle; keep original encryption authority, single-writer lock and original IDs.
3. Run browser acceptance on the actual exact-head preview at 390px and 1440px, with original unlocked/encrypted, auto-lock, recovery, route exit, privacy masking and cross-tab flows. Preserve PR draft/NO-GO until then.
4. Reconcile any FD1 work and main divergence in a separate reviewed integration step; no merge authorized.
