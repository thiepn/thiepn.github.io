# Generated asset and catalogue review boundary

The six media/catalogue/brand generation workflows are read-only. They keep their existing triggers and generation commands, but never push or commit to main. If outputs change, the run uploads a binary-safe `generated-review-*` artifact containing `changes.patch`, `review.json` (exact base SHA), and `changed-files.txt`. No change produces no artifact.

Review the artifact on a branch based on its recorded SHA. Apply with `git apply --check changes.patch` then `git apply changes.patch`, inspect the diff, and commit only the intended changes. Rebase or regenerate against current main if necessary. Open a normal PR and require successful Quality and all applicable public contracts before merging. Never apply a patch directly to main. No write token or automated PR permission is required to produce review artifacts, and bot-generated events are not treated as qualifying CI evidence.

The existing production workflow remains owner-dispatched, requires the exact current main SHA with successful **push** Quality, repeats authorization before build and deploy, and verifies served fingerprints. A PR Quality run, stale main SHA or manual Quality run cannot authorize production. The review artifacts do not publish anything. For source changes that require generated outputs, include those outputs in the same reviewed PR so the existing generated consistency check passes.

Quality now checks the read-only generator boundary and tests binary patch export/reapplication before running the browser matrix.
