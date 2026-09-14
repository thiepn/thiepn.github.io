# THIEPN Account Consumer Contract 1.0

Every account-enabled app has two independent ownership layers:

1. **THIEPN Account owns identity and security:** canonical user ID, sessions, credentials, OAuth, recovery, MFA/security state and account deletion.
2. **The consumer owns app data:** notes, nutrition records, game progress, preferences and other app-specific state.

A consumer may query normalized account state, display account identity, subscribe to account changes, request approved account actions and store app data keyed to the canonical user ID. It must not become a second identity authority.

## Integration modes

- `sdk-1.x`: mandatory for new consumers. The app imports the centrally published browser SDK.
- `certified-legacy`: allowed for Notes, Diet Copilot and WORDSTRIKE because their A6/A7 implementations already implement the same authority/storage/failure rules. It is a compatibility classification, not permission to add new local auth behavior.

No new application may choose `certified-legacy`.

## Manifest

Every consumer publishes `.well-known/thiepn-app.json` conforming to `/account-platform/contracts/thiepn-app.schema.json`.

Required invariants include account contract `1.0`, SDK compatibility `1.x`, session authority `thiepn-account`, A7 operations compatibility, explicit degraded-mode behavior and `networkFailureLogsOutUser: false`.

## Security boundary

Consumer authorization must be enforced at the database/RPC/Edge Function layer. UI visibility is never authorization. Tokens, passwords, recovery codes and OAuth codes must not enter consumer telemetry.
