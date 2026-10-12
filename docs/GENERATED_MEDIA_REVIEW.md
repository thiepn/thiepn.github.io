# Generated media review

The six generator workflows retain their capture/generation steps but no longer commit or push outputs. They use read-only tokens without persisted checkout credentials and retain a 30-day generated-review artifact containing review.patch and manifest.json. No automatic deployment or PR is created.

The manifest identifies the exact event/check-out source SHA, selected output profile, added/modified/deleted paths, patch bytes and SHA-256. The patch preserves binary images. Staged unrelated changes, non-main Actions context, source-SHA mismatch, symlinks and executable files are rejected.

For a reviewed artifact, verify its workflow/run and original archive provenance in GitHub, then verify review.patch SHA-256 against the manifest. On a clean review branch at the exact baseSha, run git apply --check --binary review.patch before applying it. Inspect the resulting media and diff, open a normal PR, and require Quality on both the candidate and merged-main SHA before any owner-authorized release.

A patch checksum alone does not authenticate an artifact. This change packages output for review; it does not automatically trust/download/apply remote patches. The more elaborate M5 acceptance tooling remains a separate future decision.

Tradeoff: freshly captured assets stop updating main automatically. Reviewed assets reach main through PRs, allowing Quality to run normally instead of leaving bot-produced SHAs without qualification. Existing checked-in production media is unchanged.
