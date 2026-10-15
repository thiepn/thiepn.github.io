# Hub account sync release

Hub connects through THIEPN Account’s shared OAuth 2.1/PKCE session SDK. An eligible Account session can connect automatically; deliberate Hub sign-out prevents an immediate reconnect. Guest data stays in its own device namespace until explicitly imported.

## Data and behavior

- Layouts, shortcuts, tasks, Hub notes, calendar entries, trackers, history and appearance preferences save to IndexedDB first, then the connected account. Privacy masking and sidebar expansion remain device preferences.
- Changes upload after a short debounce. Visible pages check for account changes every 15 seconds and on reconnection/visibility changes. This is automatic polling, not a realtime subscription.
- Durable mutation IDs and server revision checks prevent duplicate retries and stale overwrites. Independent edits merge. Overlapping edits retain both versions for review and export; replaced local workspaces also receive a recovery backup.
- Notes shares recent synced titles, Library shares EPUB progress metadata, and TMS60 shares translation-specific review counts when the relevant Account sharing choices allow them. Insights refresh every 30 seconds and expire within 60 seconds; they clear on privacy masking, account change or lost access. Book files, note bodies and practice answers remain in their native apps.
- Hub capture creates Hub notes/tasks. It does not silently create or modify native app records. Opening an app uses its existing canonical app URL.

## Release dependencies

Account change: https://github.com/thiepn/account/pull/83. Its three additive database migrations are already applied to the existing Account project. The Hub public client has the exact callback `https://thiepn.dev/home/auth/callback/`; registration is never run automatically by CI.

The Account frontend must ship its existing sharing pages before the dependent Hub frontend is released. Run successful CI on each exact main commit, then use the existing protected deployment workflows. Do not replace their evidence checks with local test results.

On October 15, GitHub rejected Account jobs before execution because account payments failed or the spending limit must increase. The frontend changes are not certified as live. Once Actions can run again: qualify and deploy Account, qualify and deploy Hub, then verify real Google sign-in, sharing permissions, two-device sync and revocation using the owner’s accounts. Synthetic browser fixtures do not certify those live authenticated flows.

## Verification

Local checks cover PKCE challenge/state and one-use callback exchange, tokenless automatic SSO, two isolated browser devices, offline retry, account separation, active capture drafts, sign-out, mobile controls and consented metadata. Real PostgreSQL 17 tests cover current session/grant checks, owner isolation, disconnect/revocation, pending deletion, compare-and-swap, idempotent replay/reuse, bounded history and exclusion of Library anchors. Hosted metadata checks confirm the client binding and denial of direct client access to private workspace tables.
