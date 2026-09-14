# Security Incident Runbook

Security incidents are handled separately from ordinary availability incidents.

## SEV-1 triggers

- secret/service-role credential exposure;
- unauthorized database or privileged RPC access;
- cross-user data exposure;
- credible account takeover path;
- leaked signing/authentication material;
- destructive unauthorized actions.

## Procedure

1. **Contain:** disable or isolate the affected path; stop deployments.
2. **Revoke/rotate:** revoke exposed credentials/sessions and rotate affected secrets using the provider's supported mechanism.
3. **Preserve evidence:** retain timestamps, deployment SHAs, request IDs and redacted logs before cleanup.
4. **Inspect:** determine scope, affected identities/data and whether access was successful.
5. **Repair:** patch authorization/configuration, redeploy, and add regression coverage.
6. **Verify:** rerun RLS/security advisors, automated tests and targeted production checks.
7. **Document:** root cause, scope and remediation without embedding secrets or unnecessary personal data.

## Auth-specific rules

- Do not use user-editable metadata for authorization.
- Revoking/deleting a user must account for existing access-token lifetime/session revocation semantics.
- Privileged database functions must have explicit role grants, safe `search_path`, and user/confirmation checks appropriate to the operation.
- Frontend clients may contain only publishable credentials.

## User data handling

Do not copy Notes content, Diet history or raw account identifiers into incident documents unless they are indispensable to determining scope. Prefer counts, hashed/correlated identifiers and request IDs.
