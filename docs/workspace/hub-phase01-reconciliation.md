# Hub Phase 01 — canonical source reconciliation

Baseline: `3d9a750766a280fbb5ba5733b02ad50f2b38f065` (23 Oct 2026). Existing integration branch `feat/connected-hub` at `ff460f7d9ab124bc99c72b18398cbd84d5a7a8cc` was an ancestor of main, with 0 unique commits and 70 behind. Fast-forward inheritance retains all original history; no old PR wholesale merge.

## Adopted in this candidate
- Calendar PR #185: original StudyOS read-only client transport failure classification, stale/out-of-window cache invalidation, next-date navigation, 15 real unit cases, public anonymous CORS/denial contract check, and targeted original browser smoke in Quality. Files were checked against the unchanged main-side base before transplantation; no Account scopes, source records or deployments.
- Apps PR #188: corrected actual combined-category browser assertions over **31** approved published plus **12** shortcut-only sources. The former `Tools 8` fixture contradicted merged PR #187's `Tools 9`; preserve `Published apps` selector and source separation. A draft-only temporary cross-PR merge workflow was *not* copied because both fixes now live in one candidate.
- Machine-readable ownership and ancestry inventory plus no-duplicate/main-capability integrity check, executed by Quality.

## Do not replay existing code
- PR #178's four files are byte-identical to main; original guest consent/Account IndexedDB contract is already represented.
- PR #175's original Documents route/editor and all PR file paths are on main. 982/1000 of the PR's blob paths match exact source; inspect the 18 differences without replacing newer main sources.
- PR #166 still has 59 original paths absent from main, including planning workflows. Port only independently qualified actions and tests against the one Hub workspace writer.
- PR #168 retains 1334 source-only paths and original KEEP B3 dependencies. Never replace encrypted-vault protections with the local unencrypted adapter.
- PR #176 changes shared shell/UI copy on older main. Rebase intentionally and retain genuine source/consent instructions.

## Phase 02 handoff
1. On this single integration branch, qualify full Apps/Calendar/Library/Reading/Account checks against the exact new head. Separate original failures from source changes; do not weaken real consent tests.
2. Reconcile P0 Today navigation and selective original task/planning changes from #166 with current native routes (especially Documents) in one owner-preserving batch.
3. Defer KEEP full vendor/runtime adoption until original source, build, encryption/owner keys and real same-origin deployment boundaries can be qualified.
4. After code and real-owner acceptance, request separate authorization for merge and production release. No migration, OAuth grant, publication or activation occurs in this phase.
