# THIEPN Infrastructure M5 — Owner-Controlled Generated Asset Acceptance

M5 is a **stacked draft** after M3 PR #116 and M4 PR #117. This is a local operator review mechanism only. M5 does not download, dispatch, create branches or PRs, push, merge, publish or deploy by itself. No existing producer workflow or production site is modified.

## Trust model and supported inputs

Input is the **original ZIP** from a GitHub Actions artifact named generated-review-PROFILE, produced by one of the six M4 main-branch generators. Do not use extracted files from an untrusted source or arbitrary emailed patch bundles.

The M5 verifier reads the following public GitHub API resources (GET only):
- GET /repos/thiepn/thiepn.github.io/actions/runs/RUN_ID
- GET /repos/thiepn/thiepn.github.io/actions/artifacts/ARTIFACT_ID

It checks both identities, completed-success run, expected generating workflow, canonical main source SHA, linked artifact, artifact name, expiry, **original ZIP size and GitHub's own sha256 digest**. It then validates the manifest's SHA-256 of the review.patch, patch length, bounded ZIP/contents and CRC, allowlisted output paths, matching added/modified/deleted status, no symlinks or executable mode changes, and a successful git apply --check --index --binary. If the GitHub API lacks an artifact SHA-256 digest, acceptance fails rather than relying on the manifest's self-attested hash alone.

The exact source commit must equal all of: the command's --expected-base, the artifact manifest baseSha, the authenticated GitHub run head SHA and the local review branch HEAD. The destination must be a clean local branch starting with review/generated- (never main/master). Noncanonical workflow branches, PR artifacts, failed runs, missing/expired artifacts, wrong SHA or unapproved output paths are rejected.

The optional --apply stage is additionally prohibited inside CI/GitHub Actions and requires --confirm-sha equal to the source SHA. It only runs git apply --index --binary and verifies the staged file list; it never invokes git commit, git push, gh workflow, GitHub write APIs or a production system. The owner must inspect binary media and separately create a review PR.

## Operator procedure, not performed by M5

1. On the public repository's Actions page, select a completed successful generator workflow from main (brand-icons, capture-hub-media, capture-previews, capture-project-media, og-assets, refresh-generated). Record its **run ID** and exact head SHA. Download the **original** generated-review-PROFILE ZIP from that run and note its **artifact ID** using the GitHub Actions API or linked artifact metadata.
2. In a local clone with the exact source commit available, create a review branch at that commit (no main changes):

   git fetch origin
   git switch -c review/generated-brand-icons-example FULL_SOURCE_SHA

3. Verify the original ZIP without applying anything:

   python3 scripts/accept-generated-review.py --zip /path/to/original-generated-review.zip --expected-base FULL_SOURCE_SHA --run-id RUN_ID --artifact-id ARTIFACT_ID

4. Read the validation JSON, including source SHA, provenance and file list. Only if the output paths and media change are expected, explicitly stage them:

   python3 scripts/accept-generated-review.py --zip /path/to/original-generated-review.zip --expected-base FULL_SOURCE_SHA --run-id RUN_ID --artifact-id ARTIFACT_ID --apply --confirm-sha FULL_SOURCE_SHA

5. Inspect git diff --cached --stat and git diff --cached --binary, preview the actual resulting images, rerun relevant quality tests and commit to this **local review branch**. Open a separate owner-reviewed PR via your normal manually approved workflow. Never push changes directly to main.
6. Owner separately authorizes merge after full exact-head quality; successful merge is still not permission to dispatch a production release (M3 remains decisive).

If the source commit is no longer main, the artifact can still be evaluated against its **original exact source commit**; do not rebase its binary patch blindly onto a newer head. Resolve stale output against current source in a new reviewed change.

## Evidence and limitations

- M3 certified PR #116 head c92b8bdfac899d0571d04907fb1c28cecdd240ab, all 8 workflows successful; original Quality artifact 11685823135: 45 entries, CRC clean, 528 expected visual tests, zero unexpected.
- M4 certified PR #117 head 139fc8f783028044ed48ec0002d691fb1be9c01f, all 8 workflows successful; original Quality artifact 11686047919: 45 entries, CRC clean, 528 expected visual tests, zero unexpected.
- M4 generated-review artifacts **have not yet been produced by the new generator workflows on main**, since PRs are drafts. M5 unit tests use isolated local Git repos and fake GitHub metadata, not a live production artifact. An actual generated ZIP/run/artifact SHA match remains a future owner-authorized acceptance test after separate activation.
- A GitHub artifact digest authenticates the ZIP against the GitHub API record, assuming trusted HTTPS/API and access control. It is **not** a separate cryptographic author signature.
- Original M3/M4 Pages release gating and all release restrictions remain unchanged. GitHub Free public repository branch rules require separate owner settings approval after review.

## Rollback

Before merge, close M5 PR; M3/M4 are unchanged. After merge, remove this acceptance tool by an owner-approved revert PR if necessary. For a mistakenly staged review patch, git reset --hard SOURCE_SHA on **the local dedicated review branch only** (discards local staged/uncommitted changes); never force-push or reset main. No production rollback is required because this tool does not publish anything.
