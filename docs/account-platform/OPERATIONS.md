# THIEPN Account Platform Operations

This document is the operator entry point for the production THIEPN Account Platform.

## Scope

The platform consists of:

- Supabase project `hycegznamzjhwinegaai` for Auth, PostgreSQL and Edge Functions.
- Notes at `https://thiepn.dev/notes/`.
- Diet Copilot at `https://thiepn.dev/diet/`.
- WORDSTRIKE at `https://thiepn.dev/wordstrike/`.
- `thiepn/thiepn.github.io` as the source-controlled operations control plane.

The retired Diet project `mrrqsqawwxwebsdmrnre` is **rollback-only**. It is not an active application authority and must not receive new Diet reads or writes.

## Health model

| State | Meaning |
| --- | --- |
| `healthy` | Required production dependency responds correctly. |
| `degraded` | Service is reachable but a transient or partial dependency problem exists. |
| `outage` | Required dependency is unavailable or the expected application contract is missing. |
| `unknown` | No trustworthy check result is available. |

Do not collapse consumer degradation into a total account outage. Notes sync, Diet data access and WORDSTRIKE online services can fail independently while local functionality remains usable.

## Synthetic monitoring

`.github/workflows/account-platform-health.yml` runs hourly and on demand. It:

1. runs the A7 operational contract tests;
2. calls the public, read-only `platform-health` Edge Function;
3. verifies the Notes, Diet and WORDSTRIKE production shells and stable markers;
4. publishes an Actions summary and `account-platform-health.json` artifact;
5. fails the workflow if any required check is not healthy.

The monitor never signs in, creates users, writes app data, submits scores or mutates the database.

## Public platform health endpoint

`GET https://hycegznamzjhwinegaai.supabase.co/functions/v1/platform-health`

The endpoint returns only:

- platform health state;
- Auth/database health states;
- HTTP status and latency for internal checks;
- check timestamp;
- request/correlation ID.

It never returns database rows, user data, secrets, tokens or internal error bodies. Results are internally cached for 30 seconds to make public probing inexpensive.

## Consumer degraded modes

### Notes

Notes is local-first. Loss of account/network/cloud sync must not delete or block the local library. Sync enters offline/error state and resumes later.

### Diet Copilot

The dashboard is read-only. If the canonical backend is unavailable, retain the most recent cached snapshot and clearly report stale/unavailable cloud state. Never fabricate fresh data or redirect a network failure into logout.

### WORDSTRIKE

Core gameplay and local progress remain usable when account/leaderboard services are unavailable. Public profiles, submissions and global leaderboards may degrade independently.

## Deployment rule

A deployment is not considered operationally healthy merely because GitHub Pages or an Edge Function deploy succeeded.

Required sequence:

`tests -> deployment -> synthetic/consumer checks -> healthy`

A deployed release with failing health checks is **deployed but unhealthy**.

## Incident severity

- **SEV-1:** security incident, cross-user exposure, destructive/widespread data loss.
- **SEV-2:** platform-wide authentication or canonical backend outage.
- **SEV-3:** one consumer or noncritical online subsystem materially degraded.
- **SEV-4:** minor diagnostics, telemetry or non-user-blocking operational defect.

See `INCIDENT-RUNBOOK.md`, `SECURITY-INCIDENTS.md`, `DATA-RECOVERY.md` and `ROLLBACK.md`.

## Operator safety rules

- Never paste passwords, service-role keys, refresh/access tokens or recovery/OAuth codes into incident documents or logs.
- Never log Notes content or Diet meal/weight content for observability.
- Never use `localStorage.clear()` as account recovery.
- Never treat a network failure as proof that a session is invalid.
- Do not delete the retired Diet project until all retirement gates in `ops/account-platform.json` pass.
- Preserve evidence before destructive recovery work.
- Prefer transactional data repair with explicit conflict checks over bulk copying.

## Current manual gates

Production OAuth/email callbacks, true cross-app session propagation, multi-device revocation and destructive account-deletion tests require a controlled signed-in browser/test account. Automated synthetic monitoring deliberately does not exercise those flows.
