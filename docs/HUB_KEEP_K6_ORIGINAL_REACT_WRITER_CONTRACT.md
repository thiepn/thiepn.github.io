# THIEPN Hub × KEEP K6 — original React mount candidate and exclusive writer boundary

**Scope:** Same draft PR #168 only, no merge/deploy/migration/production writes/costs. User-supplied complete original KEEP B3 source candidate remains a **separate artifact**, not vendored or built in Hub.

## Actual implemented changes on PR

- All original `KeepNotesDB` write actions now require a current owner-session callback and revocable `AbortSignal`. They check inside original IndexedDB readwrite transactions; source disconnect, reconnect, account epoch change, privacy masking, route exit and original React takeover abort still-pending operations.
- When original React claims the native writer (`data-keep-original-react-active="true"` plus `keep-original-react-mounted`), Hub revokes the interim connection and removes rendered original-note plaintext without re-rendering the outer shell (which would destroy the React root).
- Original device connector refuses to open/read/write while native React is authoritative. No separate note database, fake decrypted records, duplicate record writer, or provider mutations.
- Focused owner-session unit tests and original React-takeover browser regression added. Not yet run at exact PR head.

## Complete original source candidate — attachment in this conversation

`KEEP_B3_native_hub_react_K6_candidate.zip`
- SHA-256: `702f59e6fc8a51c3094e0b051287cd986932c698ac53a3782a9ba6c0da04ed3d`
- 1,288 archive files; all **1,269 original KEEP B3 source files** validated byte-identical using `hub-embed/SOURCE_SHA256.json`.
- Includes original `src/App.tsx`, `src/pkm/workspace/NoteWorkspaceView.tsx`, KEEP workspace context, `src/services/storage.ts`, `vaultEncryptionService.ts`, original Argon2id `kdf.ts`, AES-GCM implementation and original key-purge/auto-lock.
- Restores original **scripts and tests**, which the prior K5 candidate omitted, including portable `require('typescript')` in the K6 smoke script, so `npm run test:b1b`, `test:b2`, `test:b3` execute from the candidate directory.
- `hub-embed/entry.tsx` mounts `<App/>` with `createRoot` on an empty, connected same-origin Hub container; must receive `{mayMount, revoked: AbortSignal}`, allows only one React owner root, marks native source active before render, and locks/purges with the original `vaultEncryptionService.lockVault()` during revocation and unmount.
- `hub-embed/vite.config.ts`: ESM-safe `import.meta.url` path resolution, candidate original React ESM build, no CDN, no externals for React or crypto.
- `scripts/check-hub-embed.cjs` verifies all original source SHA-256 hashes and entry/config syntax.

**Explicit limitation:** This full source candidate is NOT committed to GitHub PR #168, not compiled with React dependencies, and not mounted into the running Hub. The current Hub root package has no React/ReactDOM, no `@astrojs/react` and no qualified original KEEP package dependency lock. The K6 repo-side code only prevents dual writers in anticipation of mounting the authentic package. The entire original Argon2id/AES-GCM unlock and auto-lock lifecycle is therefore NOT_RUNNING in Hub. No implied acceptance.

## Executed evidence

- Original KEEP B1b/B2/B3 tests from candidate: **PASS 22/22 + 33/33 + 48/48**.
- Original-source manifest: **PASS 1,269/1,269** SHA-256.
- React K6 entry and ESM Vite configuration TypeScript syntax: **PASS** with zero parser diagnostics. Not typecheck.
- Archive ZIP integrity: **PASS**.
- Full original candidate TypeScript: **FAIL** (missing React/Vite/lucide dependencies, plus existing source diagnostics; exit 2).
- `npm run build:hub-embed`: **BLOCKED** exit 127 `vite: not found`.
- Exact-head Hub Astro typecheck, Vitest, build, desktop/mobile Chromium: **NOT_TESTED**. The PR's previous Quality failure occurred on an earlier SHA; no current-head GitHub Actions runs reported.
- Original KEEP encrypted unlock/auto-lock in native Hub: **NOT_INTEGRATED / NOT_TESTED**.

## Remaining coherent implementation work

1. Version/upload the complete source candidate as a real workspace in a qualified repository; produce verified dependency lock and build, then consume it as a *native* React island in Hub (not an iframe).
2. Disable the interim writer whenever the authentic React component is mounted, with cross-tab source authorization; test consent revocation after an IDB request but before commit.
3. Qualify the original vault unlock/auto-lock/owner-recovery lifecycle and key purge on identity/privacy/source transitions; preserve same-origin KEK/VEK data and original record IDs.
4. Repair actual type/build/browser failures and reconcile concurrent FD1 work with main before considering any merge or production release.
