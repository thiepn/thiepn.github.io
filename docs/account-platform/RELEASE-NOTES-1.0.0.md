# THIEPN Account Platform v1.0.0

This release freezes the production baseline established through A1–A8.

## Immutable release identity

Central release commit:

`169e083f268e895cd44d8a5fe706ba5d4532bfa2`

The Account Platform v1.0 conformance workflow and validator are pinned to that exact commit. A Git tag/release alias can point to the same commit when published, but consumer certification does not depend on a movable branch name.

## Platform contracts

- Account contract: `1.0`
- Browser SDK: `1.0.0` / contract `1.x`
- Shared Account UI: `1.0.0`
- Operations contract: `A7.1`
- Developer contract: `A8.1`
- Consumer manifest schema: `1.0`

## Included capabilities

- Canonical THIEPN identity/session authority across supported apps.
- Email/password and Google authentication entry points through the Account SDK.
- Password recovery and account security helpers.
- Token-free normalized public session state.
- Local sign-out by default, with explicit wider security scopes.
- Same-origin redirect protection.
- A7 health, diagnostics, incident, rollback and recovery controls.
- Versioned Browser SDK and shared account UI.
- Reference `sdk-1.x` consumer and consumer manifest schema.
- Reusable consumer conformance workflow pinned to the v1.0 release commit.

## Existing consumers

Notes, Diet Copilot and WORDSTRIKE remain supported as A8-certified `certified-legacy` integrations. They retain their app-specific runtime conformance tests; new account-enabled apps must use `sdk-1.x`.

## Compatibility policy

SDK 1.x remains backward compatible. Patches may fix defects and minor releases may add optional behavior, but canonical identity/session authority, storage semantics, default sign-out behavior, normalized auth events, redirect rules and required method signatures remain compatible throughout 1.x. Breaking changes require SDK 2.x and an explicit migration phase.
