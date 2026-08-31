# Phase 16B-11 — Homepage portfolio identity

## Baseline

Phase 16B-10 is production-verified. PR #27 passed the complete Quality workflow, then the authoritative Pages workflow completed build, deploy, and custom-domain verification successfully against `https://thiepn.dev/`.

The prior smoke-concurrency improvement remains intact: production verification checks all current public routes and live project launches through the bounded worker pool.

## Findings

The broader Portfolio identity had already been established in canonical site metadata, install metadata, structured data, footer copy, and generated social cards. The homepage still retained three older project-era signals:

1. it overrode `BaseLayout` with a narrower title that omitted Books;
2. its page-specific description and first-fold summary also omitted Books;
3. visible discovery copy still referred to the `THIEPN universe`.

This created avoidable duplication: the homepage maintained its own metadata string instead of inheriting the canonical `SITE.title` and `SITE.description` used by the rest of the site identity.

## Changes

Phase 16B-11:

- removes the homepage-specific title and description override so `/` inherits `SITE.title` and `SITE.description` from `BaseLayout`;
- therefore uses the canonical title `THIEPN — Software, Games, Learning & Books` and the canonical description that explicitly includes books;
- changes the first-fold eyebrow from `Independent software & experiments` to `Independent digital portfolio`;
- adds Books to the first-fold portfolio summary;
- changes `Five ways into the THIEPN universe` to `Five ways to explore the portfolio`;
- leaves internal `.universe*` class names unchanged because they are implementation identifiers, not visitor-facing brand copy;
- adds Playwright coverage tying rendered homepage metadata to `SITE` and rejecting the legacy visible identity wording.

## Non-goals

No homepage layout, project ordering, featured curation, interaction, search behavior, or visual styling changes are part of this tranche.

## Acceptance

The final head must pass the complete Quality workflow. After merge, the authoritative Pages workflow must pass build, deploy, and `thiepn.dev` production verification.
