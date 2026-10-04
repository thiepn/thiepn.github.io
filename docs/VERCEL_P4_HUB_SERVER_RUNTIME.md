# P4 — THIEPN Hub Account/Core Integration Boundary & Product-Owned Server Runtime

**Production private reads:** disabled. **Enabled Hub OAuth clients at implementation:** 0. **Active Notes Hub consents:** 0.

P4 moves Hub-specific trusted execution into `thiepn/thiepn.github.io`; it does not revive the superseded central `thiepn-platform`.

```text
Hub browser
  -> Hub Vercel Function
      -> Supabase Auth /auth/v1/user
      -> Account authorize_thiepn_hub_notes
      -> Notes/Account read_thiepn_hub_notes
```

Supabase Auth/Account owns identity, live session/client/account/entitlement/consent authority. The installed Notes projection RPC owns database access and binds the owner from `auth.uid()`. Hub owns only HTTP adaptation, exact-origin enforcement, input/output validation, cancellation and the provider envelope. Core remains at `api.thiepn.dev` for genuinely Core-owned capabilities; Notes traffic is not proxied through Core.

## Routes

- `POST /api/v1/private/hub/notes/access`
- `POST /api/hub/notes/v1`

Both default to 503 unless `THIEPN_HUB_PRIVATE_RUNTIME=staged-v1`, `THIEPN_ACCOUNT_URL`, `THIEPN_ACCOUNT_PUBLISHABLE_KEY` and an exact UUID `THIEPN_HUB_OAUTH_CLIENT_ID` are configured. No secret/service-role key is accepted.

The browser prefers its own Vercel origin when the historical `PUBLIC_HUB_PLATFORM_ORIGIN` override is absent. The override remains only for the existing immutable paired browser fixture.

## Authority sequence

The runtime verifies the exact bearer with Supabase Auth before decoding claims. It then rejects wrong issuer, audience, role, client, subject, session, anonymous state or expiry; calls current Account authorization; performs the metadata-only Notes RPC with the same bearer/publishable key; and rechecks authorization before releasing the envelope. JWT claims are rejection checks, never app authorization.

## Privacy and limits

No raw Notes table access, SQL text, owner override, secret key, body/file/attachment projection, token persistence, server cache or private query string is introduced. Access bodies are capped at 1 KiB, projection bodies at 4 KiB, authorization responses at 4 KiB and projection responses at 64 KiB. The whole operation has a two-second deadline even if an upstream ignores abort. Responses are no-store and errors never reflect upstream data.

## Hosted prerequisites observed

The canonical Account project contains migration `20261003202015_hub_h12_h13_notes_projection`; both `authorize_thiepn_hub_notes(text,uuid)` and `read_thiepn_hub_notes(text,uuid,text)` exist. At this check there are zero enabled Hub clients and zero active Notes Hub consents. P4 intentionally leaves those counts unchanged.

## Activation gate

P4 source completion does not authorize OAuth issuance. Before enabling a real client: complete a real P3 Vercel Preview, register exact OAuth redirect/origin configuration, qualify project-wide raw-table/Storage/view/SECURITY-DEFINER denial for OAuth clients, run positive/negative hosted tests with fictional staged tokens, recheck Account revocation and first-party Notes compatibility, then perform the later physical/human activation gate.
