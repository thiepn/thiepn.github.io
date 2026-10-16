# Automatic Account discovery

An existing THIEPN Account session should connect Hub through the shared SSO/PKCE flow without another sign-in or Connect action.

Hub discovers that session on initial load, window focus, returning to a visible tab, reconnecting to the network and once per minute while visible. Concurrent checks share one operation. The shared SDK retains its probe cooldown, message origin/source/client validation, one-use PKCE flow and explicit sign-out/revocation controls. Hidden tabs do not poll; back/forward-cache restoration restarts discovery.

Account iframe startup has an eight-second budget. The previous 2.5-second budget could expire before Account finished initializing; later Hub checks verified only its missing local token and never retried Account discovery. Pending capture saves are flushed before account navigation checks.

Validation includes cold automatic SSO, Account sign-in after Hub was already open, a three-second delayed discovery response, visible periodic discovery, stable guest draft ownership, existing cross-device/offline sync and account isolation. A local paired runtime check also used the actual deployed Account probe with synthetic intercepted auth responses; it reached automatic authorization despite a 3.5-second identity response. These checks do not use the owner's Google credentials or private app records.

Discovery keeps the guest workspace usable immediately. The final account redirect flushes drafts again, including text typed while the discovery request was in flight, and pauses safely if saving fails. Restoring a page from the browser back/forward cache starts a fresh SSO coordinator. Device-only Library fixtures use explicit guest sign-out so their strict owner-frame and no-cloud-read assertions remain independent of Account discovery.
