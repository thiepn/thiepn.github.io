# THIEPN Account Platform Observability

## Principles

Observability answers whether the platform is working without recording private user activity.

Allowed operational dimensions include:

- event name;
- consumer/service name;
- environment;
- request/correlation ID;
- safe error code/category;
- HTTP status;
- latency/duration;
- deployment/function version where available.

Forbidden telemetry includes:

- passwords;
- access or refresh tokens;
- OAuth/recovery codes;
- full email addresses;
- Notes content, attachment contents or filenames unless explicitly required for a one-off operator investigation;
- Diet meal, weight, goal or coaching contents;
- authorization headers;
- Supabase service-role/secret credentials.

## Event taxonomy

Core event namespaces:

```text
auth.login.success
auth.login.failure
auth.logout
auth.session.refresh
auth.session.revoked
auth.password.reset.requested
auth.password.changed
account.app.connected
account.app.access.denied
notes.sync.failure
diet.refresh.failure
wordstrike.leaderboard.failure
wordstrike.score.failure
platform.health
```

Not every consumer needs to emit every event. Events should exist only where they are operationally useful.

## Failure taxonomy

| Category | Typical source | Retry? |
| --- | --- | --- |
| `network` | DNS/offline/timeout | bounded, safe reads only |
| `authentication` | 401 | no blind retry; refresh/re-auth flow |
| `authorization` | 403 | no automatic retry |
| `rate_limit` | 429 | only after bounded delay/Retry-After where applicable |
| `request` | other 4xx | no automatic retry |
| `service` | 5xx | bounded retry for safe/idempotent operations |
| `unknown` | uncategorized client failure | no automatic retry by default |

A network exception is not a logout signal.

## Correlation IDs

Back-end/Edge Function requests should use an `X-Request-ID` response header and include the same ID in structured logs. Incoming `x-request-id` values may be accepted only after length/safety bounding; otherwise create a fresh UUID.

Correlation IDs identify operations, not people. They must not encode user IDs, email addresses or tokens.

## Structured log shape

Example:

```json
{
  "event": "wordstrike.score.failure",
  "request_id": "uuid",
  "service": "submit-score",
  "category": "service",
  "http_status": 500,
  "board_key": "typing-60s-english200-v1",
  "duration_ms": 43
}
```

Board keys and action names are non-sensitive protocol metadata. User identity and submitted metrics are intentionally absent.

## Retention

- Synthetic health artifacts: 14 days in GitHub Actions.
- Routine Edge Function logs: use the provider's normal short operational retention; do not duplicate them into permanent Git history.
- Security evidence: retain only as long as justified for the incident and redact secrets/user content.
- Incident reports: retain root cause, impact, timing and corrective actions; exclude credentials and unnecessary personal data.

## Alert policy

Actionable failures:

- production synthetic health workflow fails;
- Auth/database platform health is degraded/outage;
- a consumer production shell/marker fails;
- Edge Function error/rate-limit patterns materially spike;
- deployment completes but health gate fails;
- Supabase security advisor introduces a High/Critical finding.

Do not alert on every individual failed password, offline client or single 404.

## Dependency monitoring

Review current Supabase changelog/advisories before account-platform changes. Do not build new monitoring on deprecated Management API fields such as `logs.all`; use currently supported log surfaces.
