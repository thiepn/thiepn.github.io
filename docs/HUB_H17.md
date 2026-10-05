# H17 — Inbox transport and attention actions (partial)

H17 adds the Hub-side coordinator and rendering for actionable attention. It does not yet complete the phase: no Notes, Library or TMS60 owner has implemented and qualified a live attention adapter. The public Inbox continues to perform zero private reads and has an unknown unread total. No flags, OAuth clients, Account grants or owner databases change.

The coordinator accepts explicitly constructed owner adapters, never window messages containing credentials or arbitrary payloads. Reads require the existing owner-specific `*.hub.inbox.read` purpose, exact owner/device/revision/translation context and unexpired authorization. There are at most six providers, three simultaneous reads, a two-second deadline, 32 KiB responses and ten rows per provider. Owners enforce response byte limits while receiving the body; the Hub validates the completed response again. New refreshes and access changes abort pending work and suppress late replies.

Actions require a second, proposed `*.hub.inbox.attention.write` purpose, an owner acknowledgement transport and `inlineWritesEnabled`. Supported operations are mark read and dismiss; resolving an issue remains in its owning app. Each command contains a fresh request ID (owner idempotency key), exact context, issue ID and expected update timestamp. The owner must enforce compare-and-set and return a fresh attention envelope with an explicit read or dismissed row, including a dismissal tombstone. Hub rejects a changed issue identity, older version, different underlying issue state, missing confirmation, malformed or late response. There is no optimistic success or automatic write retry. Unknown write outcomes remove the old snapshot and require a fresh read.

The controller uses text nodes for private titles, reviewed manifest links for handoff, explicit source coverage and unknown totals under partial coverage. Opening a link never acknowledges or resolves an issue. Hide, identity change, backgrounding and pagehide clear RAM and private DOM. Showing the Inbox does not reconnect automatically.

## Remaining work to finish H17

1. Implement an owner projection for explicitly chosen, active Notes reminders. Preserve native reminder semantics and exclude trashed, locked and otherwise inaccessible notes. Qualify real owner code, not just fictional fixture adapters.
2. Extend Account and the canonical owner authorization boundary with separate Inbox read and attention write consent purposes, revision enforcement and revocation. Do not reuse Home/search permission as authorization.
3. Implement owner compare-and-set, idempotency and acknowledgement/tombstone storage; verify action races and timeouts against the deployed owner boundary.
4. Connect the qualified Notes adapter and staged consent UI to this coordinator, and expiry-driven DOM clearing. Library and TMS60 remain explicitly unsupported until they have genuine attention sources. Due study tasks and ordinary reading progress are not invented Inbox issues.
5. Verify actual-owner browser flows across all supported engines; keep production activation and physical-device qualification at H20.

Unit tests qualify Hub coordination and action rejection, not live owner integration. H16 Hub and Library deployments have completed successfully.
