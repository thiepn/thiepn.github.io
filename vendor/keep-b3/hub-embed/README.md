# Original KEEP B3 native Hub React entry — candidate only

This candidate uses the **original** `src/App.tsx` and retains the original
`WorkspaceProvider`, `NoteWorkspaceView`, `storage.ts`, Argon2id/AES-GCM
`vaultEncryptionService` and auto-lock/key purge logic. There is **no iframe**.
It uses the existing browser origin and storage without data copying.

Run from the original KEEP B3 source root:

```
npm ci  # only if a genuine compatible package-lock.json is available
npx vite build --config hub-embed/vite.config.ts
```

**Important**: the existing B3 source has bun.lock, not a qualified npm
package-lock.json. Use the exact compatible Bun environment or generate and
review an npm lock in a separate qualified source change. No automated package
installation is part of this artifact.

## Native Hub shell integration (not yet deployed)

The receiving Hub shell should render an empty `<div id="keep-native-root">`
inside its existing workspace content area. The original React library entry is
loaded *from the same origin*, with its compiled styles available in the
correct cascade, and `mountOriginalKeep(container)` called once. On route,
identity, privacy mask, or owner-mode change, call `handle.unmount()`; this
locks/purges the original vault key and unmounts React. On page visibility
loss, apply the original B3 vault lock policy; do not weaken or bypass it.

No Hub or Folio data is passed as KEEP notes. The original KEEP storage
functions are the only authority. Do not use interim Hub `keep-b3-device`
editing concurrently with the original React app until both source writer
paths are jointly qualified for CAS and encryption transitions.

## Safety and missing qualification

The original B3 app imports global CSS and portal-based modals; full
in-place accessibility, mobile, shared navigation, and CSS isolation remain
**NOT_TESTED**. The receiving Hub currently has no React dependencies or
certified B3 source package, and therefore does not import this candidate.

The archive is a complete source candidate, *not* an installed, running or
securely deployed Hub feature. Original source SHA manifests are included.

## K6 integration authority and single-writer contract

`mountOriginalKeep(container, {mayMount, revoked})` requires an active Hub owner
session and an AbortSignal from its identity/privacy lifecycle. Mount sets
`data-keep-original-react-active="true"` on the native container **before**
React begins loading and emits `keep-original-react-mounted`; the interim
`keep-b3-device` connector observes this marker/event and refuses/aborts writes.
Unmount (including AbortSignal revocation) invokes original `lockVault()` and
`vaultPurgeManager` before removing the React root. Mount is singleton and
cannot run if any original root is already active.

The original `vaultEncryptionService` still owns its Argon2id key, AES-GCM
payloads, passphrase unlock and auto-lock. The Hub authority callback is only
permission to show the original app, never permission to decrypt its notes.
This integration is *not live* in the Hub until this complete source tree has
been vendored/versioned, built from a qualified dependency lock, and accepted
in real browser tests.
