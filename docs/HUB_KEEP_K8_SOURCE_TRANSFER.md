# K8 — Complete original KEEP B3 source transfer

> **K9 update (2026-10-17): SOURCE UPLOADED.** The complete K6 original KEEP B3 tree is now committed on THIS draft PR at `vendor/keep-b3/`, starting at import commit `c9345270b50b7d82a2855d9b32614efd8ce47074`. The transfer instructions below are historical and **must not be rerun** into an existing destination. The original `hub-embed/SOURCE_SHA256.json` contains **1,269** entries and SHA-256 `415ae18e0c1ca2ca4ac8e424a2f13fa7ff2717edcebdfc8e02c933a54ee4ee58`; GitHub blobs for the manifest, mount entry, Vite config, package.json and bun.lock match the K6 bytes. K7's stale manifest/count/Vite pins have been fixed on the same PR. Original Vite/React build and encrypted-vault runtime are still NOT qualified.

**Scope:** PR #168, `feature/hub-keep-k1-native-knowledge-workspace` only.
**Status:** Source import verified locally; GitHub upload/push requires access to a checkout holding the full original archive. NO full B3 source has been pushed by ChatGPT in this phase.

## Why an owner-side handoff is required

The complete original source archive is present in ChatGPT's local file container, but that container cannot resolve GitHub/npm. The connected GitHub write methods accept literal file contents or individual Git blobs, not a local ZIP path or Git bundle. There is no authorized adapter to stream the 1,288 local files through that connection. Calling the current draft a complete vendored integration would be incorrect.

## Exact deliverables

1. `KEEP_B3_native_hub_react_K6_candidate.zip`: SHA-256 `702f59e6fc8a51c3094e0b051287cd986932c698ac53a3782a9ba6c0da04ed3d`.
2. `KEEP_B3_original_source_K8.gitbundle`: SHA-256 `bc879863a980bf611297bc9d5f30774d840793c0f93231447da917ddc651e3b8`.
   - Ref `refs/heads/keep-b3-source`
   - Source Git commit `a7fc4c65aa52edee135e24e7bd7a9a36f39a25b0`
   - Contains **1,288** original K6 archive files, **1,269** original B3 source modules.
   - Local Git-bundle verification: PASS; test imported all 1,288 files under `vendor/keep-b3/` while preserving a pre-existing unrelated Hub file; all 1,269 original source hashes PASS afterward.
3. `scripts/import-original-keep.py`, committed to this PR, provides an alternative integrity-checked import directly from the exact ZIP.

## One-time source upload: safest owner command

From a desktop terminal (or a GitHub Codespace) with a **fresh checkout of the existing draft branch**:

```bash
git fetch origin feature/hub-keep-k1-native-knowledge-workspace
git switch feature/hub-keep-k1-native-knowledge-workspace
git pull --ff-only
python3 scripts/import-original-keep.py /absolute/path/to/KEEP_B3_native_hub_react_K6_candidate.zip
git add vendor/keep-b3/
git commit -m "feat(hub): version exact original KEEP B3 source and React dependencies"
git push origin HEAD:feature/hub-keep-k1-native-knowledge-workspace
```

There must be no `vendor/keep-b3/` directory already present. Never force-push; if concurrent FD1 changes advance the branch, fetch and reconcile them before pushing.

**Git-bundle alternative** (if the ZIP cannot be extracted using Python):

```bash
git fetch /absolute/path/to/KEEP_B3_original_source_K8.gitbundle \
  'refs/heads/keep-b3-source:refs/remotes/keep-import/source'
git read-tree --prefix=vendor/keep-b3/ -u refs/remotes/keep-import/source
git diff --cached --stat
git commit -m "feat(hub): version exact original KEEP B3 source and React dependencies"
git push origin HEAD:feature/hub-keep-k1-native-knowledge-workspace
```

The bundle is a full standalone Git history; this operation imports its original tree into the current draft branch without changing the Hub base commit, resetting other files, or touching main.

## Only AFTER that upload, qualify the authentic runtime

```bash
cd vendor/keep-b3
bun install --frozen-lockfile
bun run test:b1b
bun run test:b2
bun run test:b3
cd ../..
node scripts/build-original-keep.mjs vendor/keep-b3
npm ci
npm run typecheck
npm test
npm run build
# Browser tests only after an actual local Hub server has been started.
```

The `bun.lock` uses lockfileVersion 2; verify a compatible Bun toolchain first. The build script refuses modified original sources, changed lock/package/entry/config fingerprints, incomplete emitted React chunks, or an overwritten output directory. Build assets remain gitignored and local; no deploy authorization is implied.

## Verified here

- K6 archive SHA-256: PASS.
- Source manifest SHA-256 and all 1,269 byte-exact source hashes: PASS.
- Original B1b/B2/B3 model suites from extracted K6: PASS 22/22, 33/33, 48/48.
- Git bundle creation and `git bundle verify`: PASS.
- Git bundle graft into an existing separate branch at `vendor/keep-b3/`: PASS, all 1,288 files; no existing Hub file overwritten; source hashes PASS.
- Original Vite build: BLOCKED (`vite` and Bun dependencies not available in current isolated container).
- Original TypeScript: FAIL, including missing React/dependency types and existing source diagnostics.
- Hub exact-head TypeScript, Vitest, build, Chromium: NOT_TESTED; no dependency-installed Hub checkout or exact-head workflow runs available.
- Original Argon2id/AES-GCM unlock and auto-lock inside mounted Hub React: NOT_TESTED.

**Do not merge or deploy.** Preserving original encrypted key authority, source IDs, Folio/Vault/Notes provider ownership, dual-writer protection and FD1 commits remains mandatory.
