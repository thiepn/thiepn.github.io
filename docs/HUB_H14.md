# H14 — staged managed Notes connection

H14 connects the H12 Account consent and H13 owner projection to Home. Production remains at public handoffs: all new environment values are empty, the private panel is absent, and the H8 release gate rejects a private-enabled artifact. No managed OAuth client is registered by this phase.

## Protocol and authority

A staged public Supabase OAuth client uses authorization code, S256 PKCE and a random 256-bit state. Its exact callback is `https://thiepn.dev/home/`, keeping the public route inventory unchanged. H10 identity remains a separate first-party SDK session. A verified first-party RPC reads the user's own consent revision before starting authorization. Account's protected `/oauth/consent` screen uses the maintained SDK authorization methods; it checks the configured client, owner, redirect and `email` scope before approval or denial.

Managed access and rotating refresh tokens live only in memory. Session storage contains only a bounded, single-use verifier/state/owner/revision record for ten minutes. Callback parameters are removed before asynchronous work. The client rejects bad claims but does not treat decoded JWT contents as verification: the H13 server verifies the bearer and rechecks current authorization before every owner read. There is no client secret or custom signing path.

## Home behavior

The staged panel offers recent synced titles, Continue, and explicit title search. Results use the existing strict provider envelope validator and show cloud-snapshot freshness. Titles are text nodes. Links open the real Notes workspace because a resource deep link has not been qualified. Queries travel only in a private POST body. No note bodies, attachments, local drafts, writes, inbox aggregation, persisted result cache, raw Notes REST or Storage access are introduced.

Backgrounding, pagehide, identity changes, sign-out, Hide Home and cross-tab disconnect clear results and managed tokens. Expired snapshots remove titles; Refresh obtains fresh authority. Reload requires reconnecting. Requests have bounded bodies, cancellation and a two-second whole-read deadline; late results cannot restore cleared UI.

## Qualification

Unit coverage includes state/PKCE, replay, malformed callbacks, wrong owner/client/audience/session claims, grant denial before data, strict envelope validation, private search, rotating refresh, cancellation and ignored-abort deadlines. Browser fixtures serve the actual built Hub and Account applications with fictional users and mocked OAuth/owner responses. The dedicated workflow runs Chromium, Firefox and WebKit against an immutable Account source revision. It never deploys its staged artifacts.

Activation requires canonical hosted runtime qualification, exact OAuth client configuration, and project-wide raw table, Storage and existing authenticated SECURITY DEFINER RPC access qualification. H13 installed the hosted schema and preserved native Notes sync access; that does not qualify the whole project boundary. Client issuance and production flags stay off until those gates pass. Human/physical checks remain scheduled for H20.
