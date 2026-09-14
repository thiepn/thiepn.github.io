# Incident Runbook

## Triage

1. Record detection time and affected service(s).
2. Assign severity: SEV-1 security/data, SEV-2 platform outage, SEV-3 partial degradation, SEV-4 minor operational issue.
3. Stop deployments touching the affected layer.
4. Preserve logs, failing request IDs, deployment SHA and health artifacts.
5. Determine whether the fault is frontend, Auth, database, Edge Function, network/provider or data integrity.

## First actions by failure

| Failure | First response |
| --- | --- |
| Notes frontend regression | Revert/redeploy last known good Notes SHA. Local notes must remain available. |
| Diet frontend regression | Revert/redeploy Diet. Do not redirect writes to the retired project. |
| WORDSTRIKE frontend regression | Revert/redeploy WORDSTRIKE; local gameplay remains available. |
| Shared Auth outage | Freeze account changes, preserve local app modes, check Supabase status/health. |
| Edge Function regression | Redeploy the prior known-good function version/source. |
| Database migration/data incident | Stop writers if needed; use `DATA-RECOVERY.md`, not ad-hoc bulk copying. |
| Synthetic monitor false positive | Prove the application/dependency is healthy, then repair the monitor without weakening product checks. |

## Restore sequence

`contain -> diagnose -> rollback/forward-fix -> verify service -> verify data integrity -> resume deploys`

Verification must include the relevant automated tests plus production health. A GitHub deploy success alone is insufficient.

## Post-incident

Record:

- severity and duration;
- affected components;
- user-visible impact without exposing private user content;
- root cause;
- recovery action;
- regression test/monitor added;
- follow-up owner/action.

Do not store credentials, tokens or private application content in the report.
