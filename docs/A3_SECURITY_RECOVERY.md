# A3 — Security & Recovery

## Purpose

A3 hardens the THIEPN Account identity layer without merging app data or changing the ownership boundary established by A1 and A2.

The phase adds practical account recovery, optional multi-factor authentication, active-session visibility, remote session revocation, stronger destructive-action protection, and permanent regression contracts.

A3 is intentionally additive. Notes, Diet Copilot, WORDSTRIKE, and future apps keep their own data models and Row Level Security boundaries.

## Security model

The canonical identity remains Supabase `auth.users.id` in project `hycegznamzjhwinegaai`.

The canonical browser session key remains:

```text
sb-hycegznamzjhwinegaai-auth-token
```

A3 uses Supabase Auth as the authority for authentication state. Local JWT decoding is used only to decide what security UI to show. It is never treated as server-side authorization. Sensitive backend actions independently evaluate `auth.uid()` and, where required, the authenticated JWT assurance level.

## Shipped controls

### Email recovery and passwordless fallback

The account sign-in surface can request an email OTP for an **existing account only**. The request uses `create_user: false`, so recovery cannot silently create a second identity.

The current Supabase email template determines whether the message contains a numeric token or a sign-in link. The UI therefore supports a token when present and explicitly tells the user to open the sign-in link when the provider sends a link instead.

Password recovery continues to use the Supabase recovery flow and redirects back to `/account/`.

### Stronger password floor

A3 requires at least **12 characters** when a password is newly created through the THIEPN Account page or changed through the account security form.

Existing accounts are not locked out merely because an older password is shorter. This is an account-UI policy; an authoritative project-wide minimum must also be configured in Supabase Auth before it can be guaranteed across every client.

### Optional TOTP multi-factor authentication

A user can enroll an authenticator-app TOTP factor from THIEPN Account.

The flow is:

1. Create an unverified TOTP factor.
2. Show the provider-generated QR code and manual secret.
3. Create an MFA challenge.
4. Verify the authenticator code.
5. Store the upgraded session returned by Supabase Auth.

A verified factor opts the user into stronger account security. When the current session is `aal1` but a verified factor exists, the account dashboard is hidden behind an MFA challenge until the session reaches `aal2`.

### Recovery from a lost authenticator

A3 does not invent recovery codes or bypass MFA. The recovery model is:

- keep the account email current;
- keep Google connected when desired;
- enroll a **second TOTP factor** and keep it on a separate device or authenticator store;
- use normal password recovery for a forgotten password;
- still complete a verified second factor when MFA is enabled.

Password reset is not an MFA bypass.

### Active sessions

A3 adds `public.list_thiepn_account_sessions()`.

The RPC:

- reads `auth.sessions` only for `auth.uid()`;
- returns at most 50 records;
- exposes only session metadata needed for account security UI;
- marks the current session from the JWT `session_id` claim;
- uses `search_path = ''`;
- revokes `PUBLIC` and `anon` execution;
- grants execution only to `authenticated`.

The account UI shows a coarse browser/platform description, last activity, current-device state, and AAL. Raw IP addresses are deliberately not exposed.

### Sign out other devices

`scope=others` revokes other refresh sessions while preserving the current browser session.

The UI states the important limitation: an access token that was already issued may continue working until its normal expiry. Remote sign-out is therefore session revocation, not an instantaneous kill switch for already-issued JWTs.

### Destructive-action protection

The ecosystem account-deletion RPC now checks whether the current user has a verified MFA factor.

- No verified factor: existing exact-confirmation behavior remains unchanged.
- Verified factor present: the current JWT must be `aal2` or deletion returns `mfa_required`.

The legacy Notes identity-deletion RPC uses the same guard so it cannot become a weaker bypass path.

The browser also blocks the deletion action behind the second-factor screen, but the database RPC remains the authoritative guard.

## Backend migration

A3 is represented in source by:

```text
supabase/migrations/20260913160000_a3_security_recovery.sql
```

The migration has also been applied to the canonical Supabase project as `a3_security_recovery`.

## SDK contract

A3 advances `@thiepn/account-sdk` from `1.0.0` to `1.1.0`.

New security/recovery capabilities include:

- JWT metadata decoding for UI state;
- AAL/AMR/session-id inspection;
- verified-factor detection;
- email OTP request and verification;
- reauthentication request support;
- TOTP enroll/challenge/verify/unenroll;
- active-session listing;
- `signOutOtherSessions()`;
- correct `scope=others` persistence semantics.

The SDK remains dependency-free and framework-independent.

## Provider and plan limitations

### Leaked-password protection

The live Supabase security advisor reports that leaked-password protection is disabled. Supabase currently gates its built-in compromised-password check behind paid plans; this project is on the Free plan. A3 therefore does not claim that this protection is enabled.

The 12-character account-UI floor is useful defense in depth but is not a replacement for compromised-password screening.

### Email deliverability

Production auth email reliability ultimately depends on the Supabase Auth email configuration and SMTP provider. A3 adds safe client behavior but does not fabricate SMTP credentials or silently modify provider settings that are not exposed through the connected management surface.

For production-grade recovery, use a controlled SMTP sender and keep the recovery/OTP templates under versioned operational review.

### Email token versus magic link

`signInWithOtp` can result in a numeric OTP or a magic link depending on the configured email template. A3 supports both user journeys at the UI level. If a strict numeric-code experience is required everywhere, configure the provider template to expose the token rather than only a confirmation URL.

### Passkeys

Passkeys/WebAuthn are deliberately deferred. Supabase's current passkey support is experimental, and the A3 goal is a stable security baseline rather than adding an experimental primary recovery mechanism.

### Recovery codes

A3 does not depend on experimental recovery-code APIs. The stable recovery recommendation is a second independent TOTP factor.

## Security advisor interpretation

The canonical project currently reports existing `SECURITY DEFINER` warnings for authenticated RPCs. A3 adds one more intentional instance for `list_thiepn_account_sessions()` because normal authenticated clients cannot query `auth.sessions` directly.

That warning is accepted only because the RPC is deliberately narrow:

- no caller-supplied user ID;
- ownership is fixed to `auth.uid()`;
- read-only query;
- 50-row cap;
- empty `search_path`;
- no IP output;
- `PUBLIC` and `anon` execution revoked.

A warning from the database advisor is not treated as a clean bill of health; it is a privileged surface that remains part of the release audit.

## A2 dependency and app-data MFA enforcement

A3 does **not** yet add restrictive `aal2` RLS policies to Notes, Diet Copilot, or WORDSTRIKE private data tables.

That is intentional. A2's shared SDK consumer migration is not complete across all apps. Enforcing `aal2` at the data layer before each client can detect an `aal1 → aal2` requirement and complete the challenge would break opted-in accounts.

The correct sequencing is:

1. finish A2 SDK adoption in every authenticated app;
2. add A3 MFA challenge handling to each consumer;
3. certify recovery and second-factor flows in each app;
4. only then add restrictive MFA-aware RLS where the product policy requires it.

Until that cutover, A3 strongly protects the central account-management and deletion surfaces without creating a cross-app lockout regression.

## Release gates

A3 is not complete unless all of the following pass on the exact candidate SHA:

- static A3 account-security contract;
- TypeScript/Astro typecheck;
- focused account SDK security tests;
- production build;
- focused account security browser tests with Playwright retries disabled by the repository config;
- normal repository Quality workflow.

No A3 source branch should be merged solely because the live database migration applied successfully.
