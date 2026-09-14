# A7 — Operations, Observability & Recovery Certification

**Platform:** THIEPN Account Platform  
**Operations contract:** A7.1  
**Canonical Supabase project:** `hycegznamzjhwinegaai`  
**Date:** 2026-09-14  
**Verdict:** **OPERATIONS CERTIFIED WITH LIMITATIONS**

## Certification summary

A7 is implemented and cut over across the central operations control plane, Notes, Diet Copilot and WORDSTRIKE. Repository validation, production deployment checks, the external synthetic monitor, the public platform-health service and non-destructive recovery drills have passed.

The remaining limitations are provider-plan settings and destructive/credentialed scenarios that should not be manufactured against the real production account solely for certification.

## Platform controls

| Control | Status |
| --- | --- |
| Health state model (`healthy/degraded/outage/unknown`) | PASS |
| Public redacted `platform-health` service | PASS — production active |
| Auth health probe | PASS |
| Canonical database health probe | PASS |
| Hourly non-mutating synthetic monitor | PASS |
| Health diagnostic artifact + Actions summary | PASS |
| Static Notes production probe | PASS |
| Static Diet production probe | PASS |
| Static WORDSTRIKE production probe | PASS |
| WORDSTRIKE public leaderboard API probe | PASS |
| Failure taxonomy | PASS |
| Bounded retry contract | PASS |
| Structured/redacted logging policy | PASS |
| Correlation/request IDs | PASS |
| Incident severity/runbook | PASS |
| Security incident runbook | PASS |
| Transactional data recovery runbook | PASS |
| Layer-specific rollback runbook | PASS |
| Recovery-drill evidence | PASS WITH LIMITATION |
| Security Advisor review | PASS WITH ACCEPTED WARNINGS |
| Retired Diet lifecycle | PASS — `INACTIVE`, retained as rollback evidence |
| Exact Supabase backup retention for current organization plan | MANUAL / PLAN DEPENDENT |
| Supabase leaked-password protection | MANUAL / PLAN DEPENDENT — currently disabled |
| Real signed-in OAuth/email/cross-device/destructive-account smoke | MANUAL REQUIRED |

## Consumer certification

### Notes

- A7 safe-read retry/failure taxonomy is implemented.
- Only safe `GET`/`HEAD` reads receive bounded transient retries.
- Auth, writes and destructive operations are not blindly retried.
- Network failure remains distinct from logout.
- Local Notes data is preserved during degraded cloud/account state.
- Post-merge CI passed formatting, contracts, lint, typecheck, unit tests, build, core browser compatibility, the full no-retry release E2E suite, P20 release certification and PWA offline certification.

**Consumer result:** PASS.

### Diet Copilot

- Dashboard remains read-only.
- A7 diagnostics expose only safe operational state and never inspect credentials or nutrition content.
- Network/backend failure does not force sign-out or clear cached data.
- Degraded mode remains `cached-read-only`.
- Existing stable request-ID/idempotent backend write contract remains authoritative.
- A7 operations contract, existing V6.5 CI and GitHub Pages deployment all passed after merge.
- Retired Diet project `mrrqsqawwxwebsdmrnre` is currently reported by Supabase as `INACTIVE`; it is not an application authority and is not deleted.

**Consumer result:** PASS WITH RETAINED ROLLBACK SOURCE.

### WORDSTRIKE

- Local gameplay/progress remains independent from online-account availability.
- Online services return `X-Request-ID` and emit redacted structured operational events.
- Existing origin/auth validation, score validation, idempotent submission behavior and rate limiting remain authoritative.
- Post-merge Node/browser/release/deployment suites passed.
- Production Edge Functions are active with A7 source provenance tied to the merged WORDSTRIKE release.
- External production synthetic monitoring successfully executes the public leaderboard API.

**Consumer result:** PASS.

## Production health evidence

The latest A7 production synthetic run reported the complete required set as healthy:

| Service | Result |
| --- | --- |
| THIEPN Account platform | healthy / HTTP 200 |
| Notes shell | healthy / HTTP 200 |
| Diet Copilot shell | healthy / HTTP 200 |
| WORDSTRIKE shell | healthy / HTTP 200 |
| WORDSTRIKE leaderboard API | healthy / HTTP 200 |

The workflow stores a redacted JSON diagnostic artifact for 14 days and fails when a required dependency becomes unhealthy.

## Recovery evidence

### Synthetic failure/recovery

An early A7 health implementation produced a real failed synthetic run when its database probe was incorrect. The monitor surfaced the failure instead of hiding it, the probe was fixed and redeployed, and later external runs returned fully healthy without mutating user data.

**Result:** PASS.

### Data-recovery conflict check

A read-only canonical Diet verification confirmed:

- one canonical September 13 day row;
- one repaired weight row;
- one repaired meal;
- six repaired meal items;
- two repaired action-history rows;
- zero duplicate non-null action request IDs.

No recovery writes were needed.

**Result:** PASS.

### Frontend rollback

Known-good Git commit SHAs, Pages deployment history, rollback instructions and post-rollback health verification are all available. A deliberate production rollback was not manufactured solely for certification because that would create unnecessary user-facing churn.

**Result:** DRY-RUN PASS.

## Security Advisor state

The production Supabase Security Advisor was reviewed after A7 deployment.

- The existing authenticated-callable `SECURITY DEFINER` RPC warnings remain the previously reviewed intentional THIEPN/Notes privileged interface. A7 did not introduce a new finding.
- RLS-with-no-policy informational findings remain on service-managed/service-role-only tables and are not new A7 regressions.
- Leaked-password protection remains disabled. Enabling it is plan dependent and should be done through Auth configuration when available.

## Backup and restore limitation

Current Supabase documentation states that scheduled daily backups are automatic for Pro, Team and Enterprise projects, with retention varying by plan; Free projects should maintain manual/off-site database dumps. PITR is a paid add-on. Database backups also do not restore Storage API object contents.

The connector does not expose the organization's exact billing plan or currently available backup set, so A7 does **not** claim a specific recovery retention period. Before any restore-dependent incident response, verify the available backup/PITR window in the provider dashboard.

## Accepted limitations

A7 deliberately does not automate or destructively exercise:

1. real Google OAuth/email callback using private credentials;
2. multi-device session revocation using a real user account;
3. destructive account deletion against a real account;
4. a deliberate production frontend rollback solely to prove rollback mechanics;
5. provider backup restoration or PITR without an actual recovery need/test environment;
6. leaked-password protection when the active Supabase plan does not expose it.

These limitations do not block day-to-day operational readiness because the surrounding diagnostics, rollback/recovery procedures, synthetic monitoring, source provenance and non-destructive verification are implemented and tested.

## Final verdict

**OPERATIONS CERTIFIED WITH LIMITATIONS**

A7 has a working production health/control plane, consumer-specific degraded behavior, correlation and redacted diagnostics, automated synthetic monitoring, incident/security/data-recovery procedures, deployment/rollback evidence, and completed non-destructive recovery drills. The remaining gates require provider-plan access or controlled credentialed/destructive testing and remain explicitly documented rather than inferred as passed.
