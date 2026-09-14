# A9 — THIEPN Account Platform v1.0 Certification

**Platform release:** `1.0.0`  
**Immutable platform baseline:** `169e083f268e895cd44d8a5fe706ba5d4532bfa2`  
**Central A9 release-metadata merge:** `d6d0d045d56a95ce540a2962c64d70609aee6b81`  
**Account contract:** `1.0`  
**Browser SDK:** `1.0.0` / contract `1.x`  
**Shared Account UI:** `1.0.0`  
**Operations contract:** `A7.1`  
**Developer contract:** `A8.1`  
**Consumer manifest schema:** `1.0`  
**Date:** 2026-09-14

## Release model

The authoritative v1.0 identity is the full Git commit SHA `169e083f268e895cd44d8a5fe706ba5d4532bfa2`, the fully A8-certified production platform baseline. A9 publishes release metadata and freezes future-app conformance to that commit rather than to `main`.

The connected GitHub integration does not expose a supported write operation for Git tags or GitHub Releases. The attempted workflow-based workaround was not used because repository-write automation of that kind was blocked by the execution environment's write-safety controls. A human-friendly `account-platform-v1.0.0` tag/GitHub Release alias is therefore not part of this automated certification. This does not weaken the immutable release identity: the full commit SHA is the canonical v1.0 reference.

## Central release controls

| Control | Status |
| --- | --- |
| Immutable Platform v1 release SHA declared | PASS |
| Public v1 release manifest | PASS |
| Account Contract 1.0 frozen | PASS |
| SDK 1.0.0 / 1.x frozen | PASS |
| Shared Account UI 1.0.0 frozen | PASS |
| Operations A7.1 frozen | PASS |
| Developer Contract A8.1 frozen | PASS |
| Consumer schema 1.0 frozen | PASS |
| Future onboarding no longer uses `@main` | PASS |
| Reusable workflow reference pinned to immutable SHA | PASS |
| Validator reference pinned to immutable SHA | PASS |
| SDK + A8 developer tests | PASS |
| A9 release-contract tests | PASS |
| Reference `sdk-1.x` consumer | PASS |
| Account Platform Health after A9 merge | PASS |
| Central Pages build/deploy/production verify after A9 merge | PASS |
| Full central Quality after A9 merge | PASS |

## Certified consumer alignment

| Consumer | Platform integration | A9 `main` merge | Runtime evidence |
| --- | --- | --- | --- |
| Notes | `certified-legacy` | `25e447e818e0223fac1ff931778d9511e24b9844` | A8 contract PASS; pre-alignment application commit passed production build/deploy/live smoke/stable release; A9 changes are metadata/CI only |
| Diet Copilot | `certified-legacy` | `e7319479b37a00a7cf53d20fb95c4f6daee5002b` | A7/A8/A9 + current Web 1.0/V6.8 production CI PASS |
| WORDSTRIKE | `certified-legacy` | `dfa38aac70cb1dfe26c84059d24e6730d867c162` | A8/A9 + tests + typing/customization + full Non-Practice browser release matrix PASS |

A9 changes no consumer authentication/session/application runtime. Each consumer receives only a Platform v1 release record and a dedicated release-alignment gate.

## Registry and authority audit

The canonical Supabase project remains `hycegznamzjhwinegaai`. The production application registry still contains exactly three active manifest-v1 consumers:

- `diet` → `/diet/`
- `notes` → `/notes/`
- `wordstrike` → `/wordstrike/`

No A9 shadow registry, reference-app row, second identity project or second session authority was introduced.

## Production cross-repository gate

`Account Platform v1 Certification` performs a non-mutating production check against:

- `/account-platform/release/v1/manifest.json`
- `/account-platform/sdk/v1/manifest.json`
- `/account-platform/ui/v1/manifest.json`
- `/notes/.well-known/thiepn-account-release.json`
- `/diet/.well-known/thiepn-account-release.json`
- `/wordstrike/.well-known/thiepn-account-release.json`

All release records must identify Platform `1.0.0` and immutable platform commit `169e083f268e895cd44d8a5fe706ba5d4532bfa2` before A9 is closed.

## Release-alias limitation

A Git tag/GitHub Release alias is **pending external publication** because the available GitHub connector cannot create either object and the execution environment did not permit a write-enabled Actions workaround. If published later, the alias must point to `169e083f268e895cd44d8a5fe706ba5d4532bfa2`; it must not redefine the v1 baseline.

## Verdict

**CERTIFICATION PENDING LIVE CROSS-REPOSITORY RELEASE CHECK.** Once the production cross-repository gate passes on this exact certificate head, the verdict becomes:

**ACCOUNT PLATFORM v1.0 CERTIFIED — immutable SHA baseline; Git tag/GitHub Release alias pending external publication.**
