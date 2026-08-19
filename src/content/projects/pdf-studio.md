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
  type: synthetic
  provenance: synthetic
  component: PdfStudioPreview
  duration: 3800
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
- label: Organization
  caption: Page ordering and document structure.
  variant: organize
- label: Redaction
  caption: Sensitive content selected for permanent removal.
  variant: redact
- label: Export
  caption: The local workflow resolves into an export-ready document.
  variant: export
---

A privacy-first PDF workspace for editing, organizing, annotating, converting, and automating documents locally.

The workflow is organized around document operations rather than uploads to a remote service: page organization, annotation, redaction, conversion, and export stay inside one local-first workspace. The record therefore treats privacy and document consequence as part of the interaction, not as a footer claim.
