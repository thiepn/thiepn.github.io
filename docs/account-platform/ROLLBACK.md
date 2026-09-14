# Rollback

## Principle

Rollback the smallest failing layer. Do not roll back unrelated consumers or the canonical database because one frontend is unhealthy.

## Matrix

| Failure | Recovery |
| --- | --- |
| Notes frontend | Revert/redeploy the last known-good Notes SHA. |
| Diet frontend | Revert/redeploy Diet; continue using the canonical backend. |
| WORDSTRIKE frontend | Revert/redeploy WORDSTRIKE. |
| Edge Function | Redeploy the prior source/version and run its health/contract tests. |
| Account SDK/contract regression | Stop rollout and revert the shared account change before consumer work continues. |
| Database migration | Prefer a reviewed forward-fix; use restore only when forward repair cannot preserve integrity. |
| Supabase/provider outage | Enter degraded mode; do not destructively rewrite local/session state. |

## Frontend rollback procedure

1. Identify last known-good SHA from a successful CI + Pages deployment.
2. Revert the faulty change or create a rollback commit; do not rewrite public branch history.
3. Run repository tests.
4. Deploy.
5. Verify the production shell and applicable account/backend health.
6. Confirm app-local data remains intact.

## Edge Function rollback

Function source must be committed in Git before/with production deployment. To roll back:

1. identify the prior known-good function source/commit;
2. redeploy that source;
3. verify status, CORS/auth requirements and response contract;
4. inspect redacted logs for recovery;
5. run synthetic health.

## Database rollback

Do not assume down-migrations are safe. Data-destructive schema changes use expand -> migrate -> verify -> cut over -> contract. If failure occurs after data movement, use `DATA-RECOVERY.md` and a reviewed forward repair or provider restore.

## Retired Diet project

The retired project is rollback evidence, not a hot failover target. Current application code must never automatically switch reads/writes back to it. It may move from `rollback-only` to `paused` only after the production account/data smoke gates and recovery snapshot conditions in `ops/account-platform.json` pass.
