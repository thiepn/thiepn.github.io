# Hub × KEEP K11 — Original encrypted vault native-session lifecycle

**Same draft PR #168; unmerged, undeployed, no database migrations, credentials, production writes, or costs.**

## Product-level correction in the ORIGINAL KEEP B3 engine

The K10 original `VaultEncryptionService` fixed late async key restoration after logout, but its constructor attached four global activity/unload event listeners for the entire browser lifetime. When the original React app is mounted in Hub, leaving that session must not leave the vault's activity tracking alive or permit a pending Argon2id unlock/setup to restore keys.

K11 edits the actual vendored `vendor/keep-b3/src/pkm/encryption/vaultEncryptionService.ts`, **not** a Hub crypto substitute:

- Standalone KEEP continues to attach original activity/unload listeners on construction.
- If the native `[data-keep-native-host]` is present, the real service defers those listeners until the owner-authorized `beginHubSession()` call.
- `endHubSession()` runs original `lockVault()`, which purges decrypted caches and increments the active key-operation epoch (including unencrypted mode), then detaches all four global listeners.
- The beforeunload callback is now a named, removable function, so repeated Hub mount/unmount cycles do not accumulate listeners.
- `vendor/keep-b3/hub-embed/entry.tsx` invokes begin before React render and end during original-root unmount/revocation. It still mounts the original `App` and `NoteWorkspaceView` with original storage, crypto, IDs and provider ownership; no iframe or duplicate writer.
- Existing K10 generation cancellation ensures late `unlockVault` / `setupVaultEncryption` operations cannot publish keys after end.
- The original 1,269-source manifest, original React entry checksum, Hub builder, Hub runtime-loader and its unit manifest fixture were updated consistently. No original KDF/AES algorithms, vault headers, notes or schema contracts changed.

## Focused original-source regressions

New original `vendor/keep-b3/scripts/check-keep-hub-vault-lifecycle.cjs` tests the exported **singleton** (not an extra fabricated service):
1. Embedded initialization defers global listeners; begin attaches four, repeated begin does not duplicate, end removes all.
2. Standalone initialization retains the previous four listeners; suspended session can resume cleanly.
3. Ending an embedded session cancels an in-flight Argon2id unlock, clears active key, executes original vault purge and detaches listeners.
4. Ending an unencrypted embedded session cancels an in-flight encryption setup before a header is stored.

`package.json` `test:keep-b3` now includes original B1b/B2/B3 and original vault lock-race/native lifecycle/real AES-GCM regressions.

## Executed evidence (local source mirror of modified GitHub original files)

- Original B1b/B2/B3: **PASS 22/22, 33/33, 48/48**.
- Original B3 wiring: **PASS 17/17**.
- Original vault async lock-race (controlled KDF/AES scheduling): **PASS 4/4**.
- Original Hub vault embedded lifecycle (controlled crypto scheduling, real singleton/listener management): **PASS 4/4**.
- Original AES-256-GCM tested with Node WebCrypto: **PASS 4/4**.
- Changed vault/React TSX `typescript.transpileModule` syntax: **PASS 0 diagnostics**.
- Full original TypeScript: **FAIL exit 2 with 1,309 diagnostics in an incomplete, offline local dependency tree** (many missing React/Vite types; not a qualified exact-head typecheck).
- `npm run build:hub-embed`: **BLOCKED exit 127, `vite: not found`**.
- Original Argon2id via `hash-wasm`: **NOT_TESTED** (dependency absent).
- Hub exact-head Astro/TypeScript/Vitest, original compiled Vite build, real Chromium desktop/mobile, real unlocked/locked encrypted restore: **NOT_TESTED** (not executable with current offline dependency environment; no exact-head GitHub Actions runs reported at inspection).

Local source mirror tests do not certify a real deployed Hub native React mount. No production data was accessed.

## Exact build/run blocker

The local container has Node 22, TypeScript 5.8, and Chromium, **but no Bun, Vite, React, `hash-wasm`, or `node_modules`**, and network/DNS access to GitHub/npm is blocked. A Chromium acceptance against an absent original ESM build would be fabricated evidence. No GitHub Actions workflow was triggered, since the user's zero-cost/no deployment constraints remain in effect.

A qualified offline cache or explicitly authorized zero-cost CI runner with Bun + original frozen `bun.lock` dependencies is required to run the true build and original Argon2id unlock. Once available, run `bun install --frozen-lockfile` from `vendor/keep-b3`, the exact original tests and typecheck, `node scripts/build-original-keep.mjs vendor/keep-b3`, and Hub Astro/Playwright tests on the same SHA. Keep draft until actual browser and encrypted recovery PASS.
