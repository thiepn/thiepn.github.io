# Account Platform Versioning

Four versions are intentionally separate.

- **Platform release `1.0.0`** identifies the frozen cross-cutting production baseline.
- **Account contract `1.0`** defines identity authority, session/storage semantics and consumer responsibilities.
- **SDK semver `1.0.0`** / contract `1.x` defines the browser API used by new consumers.
- **Operations contract `A7.1`** defines failure, diagnostics and recovery behavior inherited by A8/A9.

## Immutable release identity

THIEPN Account Platform v1.0 is identified by the full certified Git commit:

`169e083f268e895cd44d8a5fe706ba5d4532bfa2`

Release-sensitive consumer CI pins both the reusable conformance workflow and its validator to that exact commit rather than to `main`. This prevents unrelated central-site work from silently changing an application's certification contract.

A human-friendly tag or GitHub Release may later alias the same commit, but it must not redefine or move the v1.0 baseline. Compatible later platform releases receive a new immutable commit/reference; existing consumers upgrade deliberately.

## SDK 1.x compatibility

Patch releases fix defects without changing public behavior. Minor releases may add optional methods or fields while preserving existing 1.x calls. Changes to canonical session authority, storage semantics, default sign-out behavior, normalized auth events, redirect rules or required method signatures are breaking and require SDK 2.x plus an explicit migration phase.

New consumers declare `sdkContract: 1.x` and use the centrally published SDK rather than copying auth/session code. The canonical module URL remains `/account-platform/sdk/v1/index.js` throughout the 1.x line.

Existing `certified-legacy` consumers remain supported during 1.x while their dedicated conformance gates pass. New consumers must use `sdk-1.x`; `certified-legacy` is not a future onboarding mode.
