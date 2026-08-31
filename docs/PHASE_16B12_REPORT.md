# Phase 16B-12 — Playwright CI parallelism

## Baseline

The complete Quality job is now dominated by browser certification rather than source/build work.

A representative green run on the Phase 16B-9 head completed in 11m32s total. Its `Complete Playwright browser and accessibility certification` step alone ran for 10m10s, while checkout, installs, source gates, scale benchmark, typecheck, unit tests, production build, and built-performance budgets together consumed roughly 80 seconds.

The Playwright configuration already uses `fullyParallel: true`, but CI explicitly constrains execution to one worker. The browser matrix itself is intentional and must remain unchanged:

- Chromium desktop;
- Firefox desktop;
- WebKit desktop;
- mobile Chromium for `@mobile-cert` tests;
- mobile WebKit for `@mobile-cert` tests.

## Experiment

Phase 16B-12 changes only the CI Playwright worker ceiling from 1 to 2.

The purpose is to use modest runner parallelism while retaining:

- the same test files;
- the same five browser projects;
- the same mobile tag partition;
- the same CI retry policy;
- the same assertions and browser coverage;
- the same build/preview server.

A source-contract unit test prevents accidental browser-matrix reduction while preserving the two-worker ceiling.

## Acceptance

The experiment is acceptable only if the complete Quality workflow remains green on the exact merge candidate. After certification, compare the Playwright step duration with the 10m10s single-worker baseline. Do not merge solely because the configuration is syntactically valid; the two-worker run must demonstrate stable coverage without browser/test regressions.

After merge, the authoritative Pages workflow must still complete build, deploy, and `thiepn.dev` verification successfully.
