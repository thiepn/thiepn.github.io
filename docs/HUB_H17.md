# H17 — actionable Notes reminder Inbox

H17 connects the staged Inbox to the canonical Notes-owned reminder projection in Account's Supabase project. It projects explicitly chosen, due, active synced reminders; it does not manufacture notifications from study progress or reading activity. Library and TMS60 remain explicitly unsupported attention sources. Partial coverage has no global unread total.

The staged build uses `PUBLIC_HUB_INBOX_PRIVATE=staged-v1`, `PUBLIC_HUB_INBOX_CLIENT_ID`, the existing canonical publishable key and `PUBLIC_HUB_ACCOUNT_ENTRY=v1`. Defaults are unset. The staged release metadata reports private reads, Inbox reads and inline attention writes so it cannot be mistaken for a qualified public-only release. No managed client registration or production flag activation occurs.

## Owner boundary

Account adds separate Notes Inbox read and attention-write consent choices. Write consent requires read consent. The canonical `thiepn_hub_notes_inbox` RPC derives the owner from the managed JWT and checks its allowlisted client, current session, account lifecycle, Notes entitlement and exact consent revision on every request. Ordinary native tokens cannot call it. Reminder and parent-note sync records supply the metadata; private sidecar state stores read/dismiss attention. The owning SQL lives in Account's immutable migration source and is exercised against the actual hosted database in rollback-only tests.

Mark read and dismiss never resolve the underlying issue or alter native reminder lifecycle. Dismissal returns a tombstone before hiding the row. A rescheduled occurrence becomes unread. Actions lock the source records, compare the displayed timestamp and enforce request-ID idempotency. Changed sources or consent reject stale commands. Unknown write outcomes require refresh; Hub never claims optimistic success or retries a write automatically.

## Hub behavior

Connecting is explicit. Browser PKCE uses a separate one-use pending key and exact `https://thiepn.dev/inbox/` callback. Managed access/refresh tokens exist in RAM only. Consent snapshots must match the token-bound owner and revision. Feed reads and actions send IDs/preconditions in POST bodies, never URLs. Responses are capped at 32 KiB/ten rows; reads have a two-second deadline and three-source concurrency limit. Owners enforce the byte cap before responding; Hub validates again.

Titles render as text. Handoffs use reviewed app URLs. Opening Notes does not mark a reminder read, dismiss it or resolve it; Notes currently opens its workspace rather than a qualified reminder deep link. Source coverage distinguishes successful empty from unavailable/unsupported. No private request occurs automatically on visiting Inbox. Hide, identity change, backgrounding, tab disconnect, pagehide and restored navigation clear private DOM/RAM. Snapshot or authorization expiry removes contributions without waiting for interaction. Showing Inbox or reloading never reconnects automatically.

## Qualification

The Account and Hub unit suites cover independent consent, callback boundaries, context mismatch, duplicate actions, stale/late results, owner confirmations and uncertain writes. Thirteen hosted owner assertions pass using fictional records that are entirely rolled back. Paired browser tests build actual Hub and Account source, exercise the actual SDK/PKCE/authorization UI, and simulate network replies; they complement the real SQL tests and do not pretend to be production OAuth issuance.

The hosted RPC and consent schema are installed. Public build controls remain off, managed client allowlist remains empty and physical-device/production OAuth activation remains H20. Further Library/TMS60 attention sources and reminder-specific Notes deep links are future owner capabilities, not fabricated H17 results.
