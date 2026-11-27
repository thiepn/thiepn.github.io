# CI-05 — First controlled cutover candidate

This draft is stacked on PR #210 at e4daf3f1ee23f3b46ac35da06507247356444550. It implements the public-consolidation and full-parallel PR routing stages together. It is **not activated on main**. No repository settings, deployment or merge are authorized.

## Actual source changes

- Original Quality retains its name, file path, main push and manual recovery triggers, and every original job/step. Its automatic PR trigger is removed only in this proposed revision.
- Quality Parallel retains the complete four-shard matrix, shared build provenance, all smoke checks, coverage/outcome parity, and final gates. All PRs (draft and ready) qualify in full; ready-for-review and synchronize both trigger the workflow.
- Consolidated public integration checks run for every PR and main push, plus manual dispatch. All seven logical contracts, eight files and 128 known tests remain included. Seven legacy public workflows keep their exact original job bodies, private pin definitions, and disabled private suites; automatic triggers become manual recovery only.
- CI Fast remains a diagnostic shadow, not a replacement for full coverage. Narrow targeted-only draft routing remains disabled. Independent Library/reading-pilot and deploy workflows are unchanged.
- The historical CI-01 baseline remains byte-identical. The reviewed migration manifest records exact before/after routing and security-guard edits. Reversing only those exact edits must reproduce each historical Git blob. A changed job, pin, permission, unreviewed trigger, or changed baseline workflow fails closed. The Account security guard checks manual-only legacy routes and still requires all original private inertness, public test execution and credential separation invariants.
- CI-04 retains original historical command/inventory verification via the verified projection, and separately tests the actual new routing and current source pins. Existing coverage tests and public report multiplicity checks remain in force.

## Gate and rollback

This candidate is permitted to run on its own draft branch only. Before any activation, all parent checks must finish, candidate native CI tooling and full parallel coverage must pass, the new consolidated public route must pass, independent pinned integrations must pass, and the exact candidate sequential job must be dispatched as a non-release reference. Compare the candidate and original run evidence at their exact revisions; manual dispatch is never main-push release evidence. Main-push routing is source-tested until an explicitly authorized merge occurs. No required-check settings are changed. Review the exact diff before owner-approved activation.

Rollback is a separate reviewed commit restoring the seven legacy workflow triggers and the PR trigger of original Quality, restoring the consolidated shadow trigger and the original guard/verifier files from the immutable parent. Do not delete the historical evidence. Keep owner release authorization untouched.

Strict historical coverage remains deliberately fail-closed for new test inventories. A successor-baseline process and real narrow-change qualification are still needed before enabling targeted-only draft routing; this candidate makes neither change. The initial practical cutover does not need that experimental mode.
