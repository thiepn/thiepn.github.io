# A7 — Operations, Observability & Recovery Certification

**Platform:** THIEPN Account Platform  
**Operations contract:** A7.1  
**Canonical Supabase project:** `hycegznamzjhwinegaai`  
**Implementation state:** implementation in progress on `a7-operations-observability-recovery`

## Platform controls

| Control | Status |
| --- | --- |
| Health state model (`healthy/degraded/outage/unknown`) | PASS |
| Public redacted platform health function source | PASS |
| Production `platform-health` Edge Function deployment | PASS — v1 active |
| Hourly non-mutating synthetic monitor | PASS by implementation; first workflow run pending |
| Health diagnostic artifact + Actions summary | PASS by implementation |
| Failure taxonomy | PASS |
| Bounded retry contract | PASS |
| Consumer operations metadata | PENDING consumer branch CI/deploy |
| Structured/redacted logging policy | PASS |
| Incident severity/runbook | PASS |
| Security incident runbook | PASS |
| Transactional data recovery runbook | PASS |
| Layer-specific rollback runbook | PASS |
| Legacy Diet lifecycle | PASS — `rollback-only` |
| Database backup capability/retention confirmed for current Supabase plan | MANUAL REQUIRED |
| Supabase leaked-password protection | MANUAL/PLAN DEPENDENT |
| Real signed-in OAuth/email/cross-device smoke | MANUAL REQUIRED |

## Health architecture

The production health endpoint checks Auth and a minimal canonical-database read internally with service credentials. Its external response contains status, latency, HTTP status, timestamp and request ID only. It never returns database rows, account identity or credentials.

The central GitHub monitor checks that endpoint plus the three production static application shells. It never logs in, creates test users, submits scores or writes application data.

## Consumer degraded modes

- **Notes:** local library remains usable; cloud sync can pause/recover.
- **Diet Copilot:** last trustworthy cached snapshot remains available; the dashboard does not become a writer or fail over to the retired backend.
- **WORDSTRIKE:** local gameplay/progress remains available; account/profile/leaderboard features can fail independently.

## Deployment identity

Static consumer releases are identified by their GitHub Pages deployment run and source commit SHA. Supabase Edge Functions are identified by provider function version plus source-controlled function code. An apparently successful deploy is not considered healthy until its applicable CI/synthetic gates pass.

## Recovery drill requirement

Before marking A7 fully certified, perform and record at least:

1. a safe frontend rollback/redeploy drill using a non-destructive or test-only change;
2. a data-recovery dry run against a test/sample dataset or conflict-check-only SQL path;
3. a synthetic monitor failure/recovery exercise that proves an unhealthy check fails the workflow without mutating production data.

## Known limitations

- A true production Google/email callback cannot be safely synthesized without credentials/test accounts.
- Multi-device revocation and account deletion require controlled manual accounts.
- Supabase backup retention/restore capabilities depend on the current project plan and must be confirmed in the provider dashboard before claiming restore certification.
- The retired Diet project remains available as rollback evidence until signed-in production verification completes.

## Verdict

**NOT CERTIFIED — repository CI, first production synthetic run, recovery drills and manual provider/account gates remain.**
