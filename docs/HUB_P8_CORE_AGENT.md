# P8 — Staged Core agent wiring for Notes

This branch wires the existing Hub Notes OAuth session to the staged THIEPN Core Notes-agent endpoint.

It does not activate the managed OAuth client in production.

## Staged switches

Both values are required in a staged Hub build:

```text
PUBLIC_HUB_CORE_AGENT_NOTES=staged-v1
PUBLIC_CORE_GATEWAY_ORIGIN=https://<core-origin>
```

Core must separately enable:

```text
CORE_NOTES_AGENT_MODE=staged-v1
```

If the Hub flag is set without an exact HTTPS Core origin, the private Notes/capture session fails closed.

## Search

When staged, title search uses:

```text
portal-notes
→ HubNotesSession.searchViaCore()
→ Core /v1/agent/notes
→ P1 route
→ P7 folio.notes.search
→ P6 execution
→ Account read_thiepn_hub_notes RPC
```

Only note IDs/titles return to Hub. Existing summary/continue behavior is unchanged.

## Capture

The existing `NotesCapture` recovery model remains authoritative in the browser.

Its persistent command `requestId` becomes Core's `idempotencyKey`, and Core forwards that same UUID to `thiepn_hub_notes_capture`.

A retry after an uncertain browser/network outcome therefore replays the same write identity rather than creating a new note.

The existing direct capture path remains the default when the staged flag is absent.

## Token handling

Managed OAuth access/refresh tokens continue to live only inside `HubNotesSession`.

UI code does not receive the bearer.

Core calls use the bearer only in the Authorization header. Grant revision, query or capture command data are sent in the JSON body; the bearer is never copied into that body or local/session storage.

## Production guard

Account H20 documentation currently blocks managed-client activation pending broader native-boundary qualification.

This P8 wiring does not alter that decision, the OAuth allowlist, production Hub environment variables, or Core production CORS.

The branch is integration-ready but remains staged until the existing security gate is intentionally cleared.
