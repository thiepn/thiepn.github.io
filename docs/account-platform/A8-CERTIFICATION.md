# A8 — Developer Platform & Future App Onboarding Certification

**Platform:** THIEPN Account Platform  
**Developer contract:** A8.1  
**SDK:** 1.0.0 / contract 1.x  
**Shared UI:** 1.0.0  
**Account contract:** 1.0  
**Operations contract:** A7.1  
**Date:** 2026-09-14  
**Central A8 merge:** `418a2a319a847183daf8de44741ef05c73d4cb60`  
**Verdict:** **DEVELOPER PLATFORM CERTIFIED**

## Summary

A8 extracts the account behavior certified through A1–A7 into a real, versioned developer surface for future THIEPN apps. New consumers use the centrally published Browser SDK 1.x and manifest schema rather than copying authentication/session logic from existing applications. Existing Notes, Diet Copilot and WORDSTRIKE integrations remain runtime-stable and are classified as `certified-legacy` compatibility consumers.

The central A8 release is merged to `main`, deployed through the production Pages workflow, and protected by a dedicated live-publication check that verifies the SDK, types, UI, schema and developer page directly from `https://thiepn.dev`.

## Developer platform controls

| Control | Status |
| --- | --- |
| Canonical browser SDK 1.0.0 source | PASS |
| Canonical Supabase project/storage config frozen | PASS |
| Live enabled publishable key verified | PASS |
| No privileged/service-role key in SDK | PASS |
| Token-free normalized public session API | PASS |
| Email/password sign-in and signup | PASS |
| Google OAuth entry point | PASS |
| Password-reset request + completion | PASS |
| Signup-confirmation resend | PASS |
| Email/password security update helpers | PASS |
| Reauthentication helper | PASS |
| Session refresh | PASS |
| Local sign-out default | PASS |
| Explicit `others` / `global` security sign-out scopes | PASS |
| Same-origin redirect guard | PASS |
| A7 failure taxonomy inherited | PASS |
| Non-sensitive SDK diagnostics | PASS |
| Shared Account UI 1.0 control | PASS |
| Network/service failure is not rendered as signed out | PASS |
| Consumer manifest schema 1.0 | PASS |
| Reference `sdk-1.x` consumer | PASS |
| New-consumer conformance validator | PASS |
| Raw `auth.setSession(...)` restoration rejected | PASS |
| Broad storage clearing rejected | PASS |
| Implicit/global ordinary sign-out rejected | PASS |
| Retired account/session authority patterns rejected | PASS |
| Reusable cross-repository conformance workflow | PASS |
| Reusable workflow self-test against reference consumer | PASS |
| SDK/validator/reference-consumer automated tests | PASS |
| Developer onboarding documentation | PASS |
| Versioning/breaking-change policy | PASS |
| New-app registration template | PASS — review-only template, no unreviewed DB mutation |
| Existing DB app registry reused | PASS — no parallel registry introduced |
| Account Platform Health on merged `main` | PASS |
| GitHub Pages build/deploy/production verification | PASS |
| Production SDK/UI/schema/developer-page publication | PASS — enforced by `A8 Publication Certification` |

## Published developer surface

Production paths:

- `/account-platform/sdk/v1/index.js`
- `/account-platform/sdk/v1/index.d.ts`
- `/account-platform/sdk/v1/manifest.json`
- `/account-platform/ui/v1/index.js`
- `/account-platform/ui/v1/styles.css`
- `/account-platform/ui/v1/manifest.json`
- `/account-platform/contracts/thiepn-app.schema.json`
- `/dev/account-platform/`

The publication verifier fetches each production asset over HTTPS, requires HTTP success and validates A8/SDK markers or JSON contracts. It does not authenticate or mutate production data.

## Certified existing consumers

| Consumer | Integration mode | A8 merge | Result |
| --- | --- | --- | --- |
| Notes | `certified-legacy` | `b1ac91dad15d8f6561bc9ab01c16e0893a1b57de` | CONSUMER CONTRACT CERTIFIED |
| Diet Copilot | `certified-legacy` | `bba1180f9b9ac8a1e82a5fb8c3299a5944dff839` | CONSUMER CONTRACT CERTIFIED |
| WORDSTRIKE | `certified-legacy` | `29974be329e9d7be3e82a9cb6cba94891a473124` | CONSUMER CONTRACT CERTIFIED |

A8 intentionally does not rewrite those applications to import SDK 1.x. Their A6/A7 runtimes already implement the same canonical identity/session/storage/failure rules. New applications may not choose `certified-legacy`; they must use `sdk-1.x`.

## Registry state

The canonical database continues to use `account_apps`, `account_user_apps` and `account_app_manifests`. A8 introduces no second application registry and performs no speculative registration for the reference app. The production registry remains Notes, Diet Copilot and WORDSTRIKE only; the reference app exists solely as a source/test fixture.

## Future-app onboarding rule

A new THIEPN account-enabled web app must:

1. declare manifest schema 1.0 with `integrationMode: sdk-1.x`;
2. import the central SDK instead of copying consumer auth code;
3. define degraded behavior where network/service failure is distinct from logout;
4. enforce app-data authorization at the authoritative backend layer;
5. register in the existing account app/manifest registry after review;
6. use the reusable Account Consumer Conformance workflow;
7. deploy, smoke-test and certify its account/degraded-mode behavior.

## A9 handoff

A9 should tag the Account Platform v1.0 release and replace the reusable consumer-workflow `@main` recommendation with an immutable v1 tag. SDK 1.x remains backward compatible according to `VERSIONING.md`; breaking session/storage/redirect/sign-out semantics require SDK 2.x and an explicit migration phase.

## Final verdict

**DEVELOPER PLATFORM CERTIFIED.** A8 is complete once this final certification change itself passes the live publication workflow and is merged to `main`.
