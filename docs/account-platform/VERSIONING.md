# Account Platform Versioning

Three versions are intentionally separate.

- **Account contract `1.0`** defines authority, session/storage and consumer responsibilities.
- **SDK semver `1.0.0`** defines the browser API used by new consumers.
- **Operations contract `A7.1`** defines failure/diagnostic behavior inherited by A8.

## SDK 1.x compatibility

Patch releases fix defects without changing public behavior. Minor releases may add optional methods/fields while preserving every existing 1.x call. A change to canonical session authority, storage semantics, default sign-out behavior, normalized auth events, redirect rules or required method signatures is breaking and requires SDK 2.x plus an explicit migration phase.

New consumers declare `sdkContract: 1.x`; they do not pin copied SDK source into their own repository. The canonical module URL remains `/account-platform/sdk/v1/index.js` throughout the 1.x line.

Existing `certified-legacy` consumers remain supported during 1.x as long as their conformance checks continue to pass. New auth functionality should be added to the SDK first, then consumed by apps.
