---
schemaVersion: 1
code: T-010
slug: scan
title: Scan
subtitle: Private document scanning for Android
aliases:
- document scanner
- android scanner
- pdf scanner
- receipt scanner
- OCR scanner
category: tools
type: app
status: beta
visibility: listed
summary: Scan paper and PDFs into a local searchable Android library with OCR, page editing, organization, secure export and encrypted backup.
repo: thiepn/scan
liveUrl: https://thiepn.dev/scan/
previewRoute: /scan/
tags:
- documents
- pdf
- productivity
capabilityTags:
- local-first
- offline
platforms:
- mobile
controls:
- touch
collections:
- productivity-creation
accent:
  light: '#4D57C8'
  dark: '#AEB2FF'
preview:
  tier: P1
  type: auto
showcase:
  purpose: Turn paper and existing PDFs into a private, searchable Android document library where capture, OCR, cleanup, organization, security and export stay local-first.
  release: v1.0.0 RC
  stack:
  - Kotlin
  - Jetpack Compose
  - Room
  - ML Kit
  highlights:
  - value: API 26+
    label: Android 8.0 and newer
  - value: OCR
    label: Searchable local document text
  - value: Local
    label: No app INTERNET permission
  - value: PDF
    label: Searchable export and page tools
actions:
  primaryLabel: Open product page
  source: true
dateAdded: '2026-09-28'
yearAdded: 2026
dateUpdated: '2026-09-28'
lastMajorUpdate: '2026-09-28'
capabilities:
- title: Capture and import
  description: Scan multipage documents and specialized modes through the Android capture flow, or import existing PDFs into the same local library.
  previewState: capture
- title: OCR and search
  description: Recognize text on-device, search exact phrases and prefixes, inspect highlighted matches, and jump directly to the matching page.
  previewState: search
- title: Page editing
  description: Reorder, rotate, crop, enhance, clean up, annotate, redact, sign, fill forms, edit recognized text, and replace individual pages.
  previewState: edit
- title: Document organization
  description: File documents into nested folders and tags, use smart collections, favorites, archive and Trash, or apply bulk organization workflows.
  previewState: organize
- title: Searchable PDF output
  description: Export searchable PDFs at multiple quality levels, merge or extract pages, save through Android document providers, or protect copies with AES-256 passwords.
  previewState: export
- title: Private recovery
  description: Keep documents in app-private storage, use secure-vault controls, and create encrypted portable backups for recovery after reinstall or app-data loss.
  previewState: security
---

Scan is the native Android document side of the THIEPN toolset. It is designed for the workflow that starts with paper, receipts, forms, books, notes, IDs, certificates or an existing PDF and ends with something searchable, editable, organized and exportable.

The app keeps document files in app-private storage and document metadata in a local Room database. Its final release manifest removes the app-level INTERNET permission; Google Play services remains the external dependency that supplies the document-scanner capture module.

The public product page at `/scan/` explains the current v1 release state and installation path. The Android source itself remains separate in `thiepn/scan`.
