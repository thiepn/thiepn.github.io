# CI narrow-change qualification experiment

PR #211 was merged into its stacked base, not main. This experiment is based on the exact merged head 33f5aa3f0602c63987e9a3e2c5bd4bc8a521e0b2, tree f49ef245193c3e9a562727704566927ec2115a7f. No main, previous PR, deployment or settings changes.

One actual source modification refactors personalHiddenAppIds to select the same array before spreading it, preserving its existing semantics including the undefined default, defensive copy, and saved preferences. This is a benchmark candidate, not a requested product feature. Do not merge it merely to activate fast CI.

The experiment validates the exact original Git blob, exact source transformation and diff, and five tooling additions. No other paths may be added, modified, deleted or renamed. Its successor base is pinned to a reviewed immutable tree rather than disabling the historical drift guard. The original CI Fast workflow remains unchanged and may conservatively fall back.

The original classifier is exercised on the actual one-file source diff. All 565 application unit tests, CI tooling, source/security/type/build/performance gates remain required. Native full Playwright discovery must match 1,206 historical cases; launch/continuation closure and mandatory sentinels are expected to select 141 cases across all three browser engines. Exact selected discovery and real outcomes must match the original baseline (including allowed skip reasons); retain shared-build fingerprint, reports, exact tested SHA and elapsed time. Independent full parallel Quality runs on the same revision, with no selector-based coverage reduction.

The experiment is a single narrow behavior-preserving case, not proof of general impact-map soundness. Qualification requires both actual targeted and full parallel runs, measured elapsed and runner time, candidate tree parity, and independent public and owner integration success. It does not enable targeted-only draft routing or approve the cutover stack for main. A previously failed sequential WebKit Office O19 test at the CI-04 revision passed on a later sequential run; preserve both observations, do not silently waive the historical failure. No production release from this experiment.

The temporary experimental source refactor and workflow must remain separate from the intended cutover stack unless independently reviewed. An explicit cutover decision and fresh main-push Quality are still needed for activation and release.
