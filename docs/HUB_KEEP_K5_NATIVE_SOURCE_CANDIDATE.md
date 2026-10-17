# K5 — Owner write authorization and original KEEP React candidate

## In-PR implementation

- The original KEEP `KeepNotesDB` device adapter now requires a live, explicit `KeepWriteAuthorization` callback for each source-owning operation: note creation, update, Markdown checkbox completion, original checklist completion, revision restoration and undo (five mutator functions; six use cases).
- Authorization is checked **within the IndexedDB transaction before the write request is issued**, not merely after an async write returns.
- The Hub call sites capture current identity `epoch` and `keepConnectTicket`, and require Knowledge mode, original KEEP owner mode, a connected eligible source, and no Hub privacy mask/lock.
- New focused `tests/unit/hub-keep-owner-session.test.ts` covers negative permissions, exceptions, source-switch and identity epoch changes. It is **not yet executed** at exact HEAD.
- Exact-head manual source-wiring audit: 13/13 PASS. This is static evidence only, not functional IndexedDB or browser acceptance.

## Actual full KEEP B3 React source package — local candidate

A complete source archive is attached in the conversation, `KEEP_B3_native_hub_react_candidate.zip`, checksum (SHA-256)
`cc5b3155e80b495a7a998117e389499844a6b885deff1a39dbd915ee590b2a9f`.

It includes **all 1,269 original KEEP B3 source files** (manifested by individual SHA-256s), the original `src/App.tsx`, `src/pkm/workspace/NoteWorkspaceView.tsx`, `WorkspaceProvider`, `src/services/storage.ts`, original `vaultEncryptionService.ts`, Argon2id `kdf.ts`, AES-GCM crypto and original auto-lock and purge logic.

The candidate adds only:
- `hub-embed/entry.tsx`: an in-document, no-iframe `mountOriginalKeep(container)` entry with explicit original vault lock-and-purge before unmount;
- `hub-embed/vite.config.ts`: separate ESM React build configuration preserving the original dependency tree;
- `hub-embed/SOURCE_SHA256.json`: original source hash manifest;
- `hub-embed/README.md`: native Hub consumption and qualification boundary.

**Critical limitation:** the original source archive is not committed/vendored into PR #168. The live Hub does not mount this candidate. The current Hub lacks React/ReactDOM, @astrojs/react and original KEEP build dependencies, and no compatible install/lock or browser qualification exists. This is a fully source-backed integration *candidate*, not a completed React integration.

## Local verification

- Original KEEP B1b/B2/B3 model tests: 22/22, 33/33, 48/48 PASS.
- Original React candidate source integrity (all 1,269 original source files retained), required original entrypoint/crypto/storage files, mount lock/unmount behavior: PASS (local static checks).
- Candidate TSX and Vite config TypeScript parser: PASS, zero parse diagnostics.
- Candidate ZIP integrity: PASS.
- Full candidate build: **BLOCKED** (Vite and other dependencies unavailable). Original KEEP build exit 127, `vite: not found`.
- Hub branch latest TypeScript/Vitest/build/Chromium: **NOT_TESTED**; GitHub reports no CI runs since earlier failing Quality HEAD.
- No merge, deployment, production writes, migrations, credentials, costs.

## Exact integration acceptance still needed

1. Commit/version the original complete B3 source in a qualified workspace without rewriting or stripping its dependencies, and derive the authoritative package lock.
2. Build the original React app/NoteWorkspaceView and original Argon2id/AES-GCM vault lifecycle as a same-origin native Hub module, with scoped CSS/portals and source contract checks.
3. When real original React writer is mounted, disable the interim `keep-b3-device` writer so competing writable paths cannot race, unless both are proven to share the original revision and vault authority.
4. Treat route change, owner session revoke, privacy mode, cross-tab encryption and auto-lock as hard key purge events. Add transaction abort/cancellation on identity changes occurring *after* an IndexedDB `put()` but before commit; callback-only checks do not cover that narrow race fully.
5. Run actual exact-head TypeScript, Vitest, Vite/Astro build and Chromium/Firefox/WebKit desktop/mobile acceptance before merge.
