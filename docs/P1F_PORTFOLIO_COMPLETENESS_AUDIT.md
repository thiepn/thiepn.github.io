# P1F — Portfolio Completeness Audit

**Audit date:** 2026-08-25  
**Scope:** THIEPN portfolio catalogue, current THIEPN GitHub repositories, first-class book records, and obvious prototype/coursework lineage.

## Governing rule

The portfolio is a curated product universe, not a mirror of every repository. A project should be publicly listed when it is a distinct, substantial artifact with a stable identity and a usable release or public beta. Internal study systems, narrow predecessors, stakeholder demos, implementation snapshots, coursework repositories, and unreleased concepts may remain hidden or absent without making the portfolio incomplete.

The audit classifications are:

- **Keep** — public entry is distinct and worthwhile.
- **Add** — substantial released product is missing from the catalogue.
- **Hide** — retain its permanent catalogue identity but keep it out of public browsing.
- **Merge** — preserve as lineage, but represent it through a stronger canonical project rather than a separate public card.
- **Hold** — potentially portfolio-worthy, but not yet ready to present as a finished public artifact.
- **Archive** — obsolete artifact that should remain historically addressable but not active.
- **Needs media** — public record is valid, but its portfolio presentation still lacks authentic captured project media.
- **Needs metadata** — identity/status or public-product information is insufficient for a trustworthy listing.

## Result

P1F finds **two true omissions** from the public project catalogue:

1. **PflegeLern** — a released, mobile-first, offline-capable nursing study application with adaptive review, exam practice, local persistence, and PWA behavior.
2. **THIEPN Library** — the static-first publishing and reading platform behind the first-class book catalogue, with native web reading, search, versioned releases, and verified publication artifacts.

Both should be added as normal listed projects. No existing listed project needs to be removed or archived in this pass.

The audit also finds one concrete status defect: **AlgoDat Study System** is registered as `live`, while its source release notes still identify a release candidate and state that `1.0.0` is blocked. Its portfolio status should therefore be `beta` while remaining hidden.

## Existing public catalogue

| Project | Decision | Media state | Notes |
| --- | --- | --- | --- |
| Koinē Path | Keep | Needs media | Distinct Biblical Greek learning product; retain public beta status. |
| Clean30 | Keep | Needs media | Distinct practical workflow tool. |
| Curio | Keep | Needs media | Distinct auction/appraisal game. |
| ECHOFRAME: LAST SIGNAL | Keep | Needs media | Distinct action/roguelite project; retain beta status. |
| French 3000 | Keep | Needs media | Canonical vocabulary/SRS product. |
| Impossible Transit | Keep | Needs media | Distinct authored browser game. |
| Le Carnet Français | Keep | Needs media | Canonical broader French course companion. |
| LiGo Quizabend | Keep | Needs media | Distinct hosted/community quiz product. |
| Manuscript | Keep | Needs media | Distinct local-first publishing tool. |
| MathLab | Keep | Needs media | Broad mathematics workbench; retain beta status. |
| Nebula Foundry | Keep | Needs media | Distinct incremental game. |
| PDF Studio | Keep | Needs media | Distinct browser PDF workspace. |
| Skyspire | Keep | Needs media | Distinct platform game; retain beta status. |
| The Bible Challenge | Keep | Captured media present | Flagship project; authentic desktop/mobile screenshots already exist. |
| TMS60 | Keep | Needs media | Distinct Bible memorization product. |
| Unreached | Keep | Needs media | Distinct mission/reference visualization. |
| VOIDCUT | Keep | Needs media | Distinct precision arcade game. |
| Wordfall | Keep | Needs media | Distinct typing-defense game. |
| WORDSTRIKE | Keep | Captured media present | Authentic demo video already exists. |

## Additions made by P1F

| Project | Decision | Public classification | Follow-up |
| --- | --- | --- | --- |
| PflegeLern | Add | Learning / Study system / Live | Capture authentic mobile + desktop media in the media pass. |
| THIEPN Library | Add | Tools / App / Live | Capture catalogue, reader, and search views in the media pass. |

## Registered but intentionally non-public

| Project | Decision | Reason |
| --- | --- | --- |
| Analysis Idle | Hide | Explicit experimental game identity; keep registered until it reaches a stronger release/presentation threshold. |
| AlgoDat Study System | Hide | Substantial product, but release notes still block `1.0.0`; P1F corrects status from Live to Beta. |
| Analysis II Klausurlabor | Hide | Useful but highly course-specific. It does not need a separate public portfolio card to keep the portfolio complete. |
| Analysis II Lernsystem | Hide / Merge candidate | Overlaps strongly with the Klausurlabor as Analysis II study infrastructure; if surfaced later, prefer a single Analysis II suite/case study rather than two adjacent cards. |
| Französisch Flashcards | Merge | Narrow predecessor/companion relative to French 3000 and Le Carnet Français. Preserve repository/history, but do not create a third public French card. |
| Markdown Guide | Hold | The record itself states that the useful reference still needs repackaging to the public artifact standard. |

## Repositories deliberately excluded from public project cards

### UBF Köln website repository — Hold

The current repository identifies itself as a **stakeholder demo** and ships `noindex,nofollow`. It may become a strong real-world web/case-study entry after the production identity, ownership/credit framing, public URL, and finished state are clear. Until then, listing it as a finished THIEPN product would overstate the artifact.

### Encounter demo 1 / 2 / 3 — Merge lineage

These repositories are explicitly named `encounter-demo-1`, `encounter-demo-2`, and `encounter-demo-3`, and are implementation snapshots rather than three independently identified products. Do not create three cards. If Encounter becomes a canonical released product, represent the demos as development lineage/media inside that one project.

### `Uebung01`–`Uebung09` — Exclude

Course exercise repositories are repository history, not portfolio products. They should not be listed merely because they are public on GitHub.

### Unreleased concepts without a canonical public artifact — Exclude for now

Planning work, early concepts, and projects without a stable release/repository identity should enter the portfolio only when a real artifact exists. Completeness is measured against meaningful shipped work, not against every idea.

## Books

The three current first-class book records remain correct and should all stay public:

- **AI for the Kingdom** — Keep.
- **How to Love God** — Keep.
- **The Unfinished Mission** — Keep.

The Library is added separately because it is the software/publishing platform; the books remain publication records rather than being converted into ordinary project cards.

## Media completeness queue

P1F treats synthetic/reconstructed portfolio previews as valid fallbacks but not as final proof media. Authentic captured media currently exists for The Bible Challenge and WORDSTRIKE. The remaining listed projects, including the two P1F additions, stay in the **Needs media** queue until authentic screenshots or short demos are available.

This is a presentation debt, not a reason to hide otherwise complete products.

## Metadata and lifecycle rules established by P1F

1. `live` means the project itself has crossed its release gate; a deployed release candidate is still `beta`.
2. GitHub repository existence alone does not qualify a project for listing.
3. Multiple repositories representing iterations of one product should resolve to one canonical portfolio identity.
4. Course-specific utilities can remain hidden even when functional; curation is allowed.
5. Stakeholder/client demos stay on hold until their public-production and credit boundaries are clear.
6. Books remain first-class publications; the Library may simultaneously exist as a first-class software project.
7. New substantial releases should be checked against the portfolio catalogue so missing-project drift does not recur.

## P1F gate

P1F is complete when:

- PflegeLern and THIEPN Library are registered, listed, searchable, routable, and represented in the permanent ledger;
- AlgoDat is no longer incorrectly labelled `live`;
- generated catalogue/search/route/OG outputs are refreshed;
- public counts are derived from the resulting catalogue rather than hard-coded;
- existing hold/hidden lineage remains non-public;
- build, structural validation, and browser regression gates pass.
