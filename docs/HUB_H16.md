# H16 — Library continuity

Home has an isolated staged Library card under
`PUBLIC_HUB_LIBRARY_PRIVATE=staged-v1`. Public releases keep the flag unset;
`hub-release.json` reports private reads when it is set, so H8 cannot certify or
deploy a staged fixture as the public-handoffs profile. No registry operations
or account features are activated. The immutable owner source is Library
`1b227548c50d8c9f414f48fbf56bf467820ef9bc` (PR 133).

“Reading on this browser” is a browser-profile connection, available without
sign-in and explicitly unrelated to account ownership. Shared-browser reading
history may belong to another person. Library owns all three purpose choices
and separate imported-title consent at `/library/hub`.

Home loads no bridge or reading database until an explicit Connect click.
After the exact source/origin/channel-bound handshake, each request carries a
fresh ID and Library-issued device/consent revision. Requests time out after
two seconds; replies pass the existing bounded provider-envelope validator.
Search is title-only, sends no URL query, stores no result or search text, and
renders through textContent. Continuation links contain only exact resource,
format, edition and release identity; Library rechecks those before opening
its native reader, which alone restores the actual reading position.

Current and furthest progress are separate. EPUB/PDF records must match the
active catalogue edition/release. Missing, blocked, unknown-schema or oversized
storage never becomes invented progress. No legacy web progress, other devices,
cloud synchronization, book bodies, files, CFI, PDF anchors, annotations or
chapter labels are included. Imported files are checked with native key-only
cursors; only a consent-owned title index is read, and deleted imports vanish.

Snapshot lifetime is two minutes. Hide Home, disconnect, pagehide, background,
identity transition, reload/bfcache, cross-tab revoke and native reading updates
erase the RAM view and remove the owner frame. Showing Home or signing in does
not reconnect automatically. Owner checks authorization after asynchronous reads
as well as before them. Both apps share thiepn.dev’s script trust boundary;
this protocol does not claim to sandbox malicious same-origin JavaScript.

The paired browser suite serves the actual immutable owner build and staged
Hub over their canonical fictional origin, seeds fictional IndexedDB progress,
and exercises consent, unavailable storage, exact releases, metadata-only
results and lifetime invalidation. CI runs Chromium, Firefox and WebKit.
Local unit checks: 206 Hub tests and 58 Library reader regressions. Local Firefox
paired checks: 18 scenarios. Existing public release/quality gates stay required.
Human/device qualification and production activation remain H20.

Library PR 133 remains unmerged: its inherited security audit is down to one
high advisory, GHSA-ch52-4w7c-c8xp. The declared http-cache-semantics 4.2.1
fix is unavailable from the build registry. Library publication and staged
activation are blocked; Hub public deployment remains qualified and default-off.
