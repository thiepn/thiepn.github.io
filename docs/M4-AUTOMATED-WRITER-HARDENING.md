# THIEPN Infrastructure M4 — Artifact-only generated asset custody

Status: **stacked draft only**, based on the exact qualified M3 head c92b8bdfac899d0571d04907fb1c28cecdd240ab. This does not alter main, DNS, live GitHub Pages, Vercel, Cloudflare, production data or GitHub rulesets.

## Why

Six existing GitHub Actions workflows committed generated assets directly to main with contents:write. That bypassed source review and conflicted with planned require-PR branch protections. They are now read-only generators: source events still trigger the same generators, but there is no git push, PR creation, production dispatch or deployment.

## Output custody

Every generator runs scripts/prepare-generated-review.mjs with a fixed profile and uploads two files in its generated-review-PROFILE artifact:

- manifest.json: schema, canonical source SHA, changed file list/status, binary patch SHA-256, byte count and replay instructions.
- review.patch: a full-index git --binary patch covering additions, modifications and deletions in only the original workflow's designated output paths.

A binary patch retains the original PNG and JSON bytes even when they are not UTF-8. Empty output still uploads a manifest reporting zero changes. Artifacts are retained 30 days. Source and generated inputs remain unchanged until a human reviews and commits a change by a distinct approved PR. Do not use an empty patch as proof of production parity.

| Workflow | Reviewable generated paths |
| --- | --- |
| brand-icons.yml | 32px favicon, Apple touch icon, 192px and 512px icon |
| capture-hub-media.yml | src/assets/hub, src/generated/hub-media.json |
| capture-previews.yml | public/projects |
| capture-project-media.yml | five named featured public/projects directories and src/generated |
| og-assets.yml | public/og, src/generated/og-raster-manifest.json |
| refresh-generated.yml | src/generated, public/og |

Each job retains its existing capture or generation step and automatic source triggers; only the committing/pushing end step is replaced. No broad modifications to images or datasets are made in this phase. The M3 owner-controlled GitHub Pages deploy requirement remains in place.

## Review/replay workflow (operator action, not automated)

1. Inspect the Actions run, exact source commit, job conclusion and the generated-review-PROFILE artifact.
2. Extract manifest.json and review.patch from the artifact; verify patch SHA-256 matches manifest.sha256 and its nonzero byte count matches manifest.patchBytes.
3. Checkout a new local review branch starting at exactly manifest.baseSha. Never apply an unknown patch or commit onto main directly.
4. Run git apply --check --binary review.patch, then git apply --binary review.patch.
5. Inspect git diff and all media/images, run the quality and release checks on the changed output, and submit a **separate reviewable PR** with those files. Compare with any newer canonical source so an old patch cannot clobber current generated assets.
6. Owner independently approves the merge; CI success and merge do not authorize a production release. M3 manual owner release gate remains decisive.

## Expected behavior and edge cases

- The source checkout must be main when generation runs in GitHub Actions; unknown profiles, unexpected events, pre-staged files and unsupported change statuses fail closed.
- The GITHUB_TOKEN is read-only and does not carry pull-requests:write; no fallback code pushes to a feature branch and no personal access token is needed.
- A failure to upload the patch or manifest fails the job; the outputs are not silently discarded.
- Existing media generation can access live public pages to capture imagery, as it did before; no protected production data is authorized.
- Artifact-only generation means brand-new generated media does **not** appear in the public Hub until reviewed and merged. The previous automatic media-update behavior is deliberately suspended to preserve owner control.
- Existing automatic publication through other workflows is separately controlled by M3. Audit any new writers or external integrations before enabling required-PR enforcement.

## Qualification and owner activation

Before merging, require green exact-head Quality, new M4 binary-patch replay/security tests, previous M3 release-gate tests, and pertinent existing browser/integration jobs. Inspect original retained artifacts and failures. This draft must stay unmerged until explicitly approved.

After a separately approved merge and successful main CI, owner may configure public-repository branch protection/rulesets requiring PR and the exact Quality check. GitHub environment reviewer constraints must not require impossible self-approval.

Rollback premerge: close the M4 draft; the M3 PR is unchanged. Postmerge: revert M4 workflow/script changes via an approved PR if the loss of automatic generated-file publication is unacceptable, but do not restore direct pushes without considering the resulting exposure. Recovery of an omitted generated asset requires a reviewed artifact patch PR, not a production bypass.
