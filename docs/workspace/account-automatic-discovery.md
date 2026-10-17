# Automatic Account discovery

An existing THIEPN Account session should connect Hub through the shared SSO/PKCE flow without another sign-in or Connect action.

Hub discovers that session on initial load, window focus, returning to a visible tab, reconnecting to the network and once per minute while visible. Concurrent checks share one operation. The shared SDK retains its probe cooldown, message origin/source/client validation, one-use PKCE flow and explicit sign-out/revocation controls. Hidden tabs do not poll; back/forward-cache restoration restarts discovery.

Account iframe startup has an eight-second budget. The previous 2.5-second budget could expire before Account finished initializing; later Hub checks verified only its missing local token and never retried Account discovery. Pending capture saves are flushed before account navigation checks.

Validation includes cold automatic SSO, Account sign-in after Hub was already open, a three-second delayed discovery response, visible periodic discovery, stable guest draft ownership, existing cross-device/offline sync and account isolation. A local paired runtime check also used the actual deployed Account probe with synthetic intercepted auth responses; it reached automatic authorization despite a 3.5-second identity response. These checks do not use the owner's Google credentials or private app records.

Discovery keeps the guest workspace usable immediately. The final account redirect flushes drafts again, including text typed while the discovery request was in flight, and pauses safely if saving fails. Restoring a page from the browser back/forward cache starts a fresh SSO coordinator. Device-only Library fixtures use explicit guest sign-out so their strict owner-frame and no-cloud-read assertions remain independent of Account discovery.

Workspace initialization and the Account handoff also share a persistence queue. The next save captures its revision after the preceding save finishes, avoiding a false local revision conflict during cold automatic connection while preserving compare-and-swap checks against real concurrent writers.

Account startup must not require free localStorage space. Apps sharing thiepn.dev can fill that quota while Account on its separate origin remains signed in. Hub reads existing credentials without an artificial write probe and falls back to sessionStorage for its own credentials and sign-out marker when persistent writes fail. Fallback records survive same-tab OAuth navigation and reloads, preserve explicit sign-out, and never clear another app's data. Tokenless sign-out messages reach other Hub tabs; a newer persistent credential from another tab replaces an older fallback. A retry handler exists before initialization and reloads the connection after an initialization failure. Error text distinguishes browser session storage denial from other startup failures.

## Reusing the Hub session across tabs

The localStorage-quota fallback above originally persisted credentials only in sessionStorage. Reloads worked, but each new tab performed another SSO/PKCE exchange. A regression now asserts exactly one exchange across fresh tabs, including with full app localStorage.

Hub now keeps its app-scoped credentials, verified offline identity fingerprint and manual-sign-out marker in a dedicated IndexedDB store (`thiepn-hub-account`). It migrates existing local/tab records on first use. Null tombstones prevent an old local/tab credential from resurrecting after sign-out. No other app records are evicted and no credentials are broadcast. Browsers that block IndexedDB retain the previous local/tab storage adapter.

Each SDK verification, token read/refresh, callback and sign-out loads the current durable records under a same-origin Web Lock, commits writes before releasing it, and retains the SDK's own refresh protection. Concurrent new tabs therefore reuse the latest rotated refresh token. The callback commits before returning to Hub. Existing server identity validation, owner isolation, manual opt-out and guest-only use remain intact.

Browser coverage includes tabs reopened after every prior tab closes, full localStorage, blocked IndexedDB, simultaneous expired-token refresh, cross-tab sign-out and a fresh tab after sign-out. These checks use synthetic Account responses, not the owner's credentials.
