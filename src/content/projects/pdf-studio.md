---
schemaVersion: 1
code: T-001
slug: pdf-studio
title: PDF Studio
subtitle: Browser PDF workspace
aliases:
- pdf
- pdf editor
- browser pdf editor
category: tools
type: tool
status: live
visibility: listed
summary: Edit, organize, annotate, and transform PDFs directly in the browser.
repo: thiepn/pdf
liveUrl: https://thiepn.dev/pdf/
tags:
- pdf
- documents
- productivity
capabilityTags:
- local-first
- offline
platforms:
- desktop
- tablet
- mobile
collections:
- productivity-creation
accent:
  light: '#176FA6'
  dark: '#55C9FF'
preview:
  tier: P5
  type: static
  provenance: captured
  poster: /projects/pdf-studio/screenshot-desktop.png
showcase:
  purpose: Keep consequential PDF work inside a browser-first local workflow so organizing, annotation, redaction, conversion, and export do not require a mandatory cloud round trip.
  release: v7.0.0
  stack:
  - TypeScript
  - Vite
actions:
  primaryLabel: Open tool
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Page organization
  description: Reorder, combine, extract, and restructure document pages without leaving the workspace.
  previewState: organize
- title: Editing & annotation
  description: Mark up pages and work directly with PDF content through a browser-first editing surface.
  previewState: annotate
- title: Permanent redaction
  description: Select sensitive regions and move from review state to irreversible document sanitization.
  previewState: redact
- title: Local export
  description: Finish the workflow locally and produce the resulting PDF without a mandatory cloud round trip.
  previewState: export
gallery:
- label: Home workspace
  caption: The real local-first PDF Studio entry surface, with local processing status, common tasks, and sample access.
  variant: home
  source: /projects/pdf-studio/screenshot-desktop.png
- label: Open document
  caption: A real sample PDF opened inside the editing workspace with pages, tools, zoom, and document canvas visible.
  variant: workspace
  source: /projects/pdf-studio/screenshot-workspace.png
- label: Page organizer
  caption: The same real sample opened in Pages mode, showing thumbnail organization, page selection controls, and non-destructive output actions.
  variant: organize
  source: /projects/pdf-studio/screenshot-pages.png
---

A privacy-first PDF workspace for editing, organizing, annotating, converting, and automating documents locally.

The workflow is organized around document operations rather than uploads to a remote service: page organization, annotation, redaction, conversion, and export stay inside one local-first workspace. The record therefore treats privacy and document consequence as part of the interaction, not as a footer claim.
