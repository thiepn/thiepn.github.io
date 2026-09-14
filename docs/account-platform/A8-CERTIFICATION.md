# A8 — Developer Platform & Future App Onboarding Certification

**Platform:** THIEPN Account Platform  
**Developer contract:** A8.1  
**SDK:** 1.0.0 / contract 1.x  
**Shared UI:** 1.0.0  
**Account contract:** 1.0  
**Operations contract:** A7.1  
**Date:** 2026-09-14  
**Pre-publication verdict:** **DEVELOPER PLATFORM CERTIFIED FOR RELEASE**

## Summary

A8 extracts the account behavior certified through A1–A7 into a real, versioned developer surface for future THIEPN apps. New consumers use the centrally published Browser SDK 1.x and manifest schema rather than copying authentication/session logic from existing applications. Existing Notes, Diet Copilot and WORDSTRIKE integrations remain runtime-stable and are classified as `certified-legacy` compatibility consumers.

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
| Reusable cross-repository conformance workflow | PASS by implementation; exact-head CI required before merge |
| SDK/validator/reference-consumer automated tests | PASS on preceding A8 heads; exact final head required before merge |
| Developer onboarding documentation | PASS |
| Versioning/breaking-change policy | PASS |
| New-app registration template | PASS — review-only template, no unreviewed DB mutation |
| Existing DB app registry reused | PASS — no parallel registry introduced |

## Certified existing consumers

| Consumer | Integration mode | A8 merge | Result |
| --- | --- | --- | --- |
| Notes | `certified-legacy` | `b1ac91dad15d8f6561bc9ab01c16e0893a1b57de` | CONSUMER CONTRACT CERTIFIED |
| Diet Copilot | `certified-legacy` | `bba1180f9b9ac8a1e82a5fb8c3299a5944dff839` | CONSUMER CONTRACT CERTIFIED |
| WORDSTRIKE | `certified-legacy` | `29974be329e9d7be3e82a9cb6cba94891a473124` | CONSUMER CONTRACT CERTIFIED |

A8 intentionally does not rewrite those applications to import SDK 1.x. Their A6/A7 runtimes already implement the same canonical identity/session/storage/failure rules. New applications may not choose `certified-legacy`; they must use `sdk-1.x`.

## Registry state

The canonical database continues to use `account_apps`, `account_user_apps` and `account_app_manifests`. A8 introduces no second application registry and performs no speculative registration for the reference app. The reference app exists only as a source/test fixture.

## Publication gate

The following are release-time rather than branch-time checks and must pass after the central PR is merged before A8 is closed:

1. publish `/account-platform/sdk/v1/index.js`, its type declarations and manifest;
2. publish `/account-platform/ui/v1/`;
3. publish `/account-platform/contracts/thiepn-app.schema.json`;
4. publish the no-index developer page `/dev/account-platform/`;
5. pass Account Platform Developer Contract on `main`;
6. pass Account Platform Health on `main`;
7. pass the existing full site Quality audit;
8. pass GitHub Pages build/deploy/production verification;
9. verify the public SDK/UI/schema assets return successfully from `thiepn.dev`.

## A9 handoff

A9 should tag the Account Platform v1.0 release and replace the reusable consumer-workflow `@main` recommendation with an immutable v1 tag. SDK 1.x remains backward compatible according to `VERSIONING.md`; breaking session/storage/redirect/sign-out semantics require SDK 2.x and an explicit migration phase.

## Verdict

**DEVELOPER PLATFORM CERTIFIED FOR RELEASE.** A8 becomes **DEVELOPER PLATFORM CERTIFIED** only after every publication gate above passes on the merged `main` release.
