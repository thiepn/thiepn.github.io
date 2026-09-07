---
schemaVersion: 1
code: T-006
slug: tiny-tools
title: Tiny Tools
subtitle: Small tools for everyday work
aliases:
- tools
- utility suite
- text cleaner
- image converter
- JSON formatter
category: tools
type: app
status: live
visibility: listed
summary: Focused browser utilities for text, images, files, data and everyday tasks, without an account.
repo: thiepn/tools
liveUrl: https://thiepn.dev/tools/
tags:
- productivity
- documents
- cleaning
capabilityTags:
- local-first
platforms:
- desktop
- tablet
- mobile
controls:
- keyboard
- mouse
- touch
collections:
- productivity-creation
accent:
  light: '#356142'
  dark: '#D6E6AB'
preview:
  tier: P4
  type: static
  provenance: captured
  poster: /projects/tiny-tools/showcase.webp
showcase:
  purpose: Put everyday text, file, image and data tasks in small browser workspaces with direct links, local processing and explicit format limits.
  stack:
  - React
  - TypeScript
  - Vite
actions:
  primaryLabel: Open
  source: true
dateAdded: '2026-09-08'
yearAdded: 2026
capabilities:
- title: Text without the friction
  description: Clean spacing, change case, count words, compare versions and format structured data in focused workspaces.
- title: Files, images and formats
  description: Convert, inspect and work with supported files locally. Available formats and fidelity depend on the tool and browser.
- title: A direct route to the task
  description: Open individual tools through stable hash links, use search to find another task, or browse the full utility collection.
- title: Local processing, explicit exceptions
  description: Most content processing runs in the browser. Currency rates and user-started network diagnostics disclose their external connections.
gallery:
- label: Text cleaning
  caption: A sample text being normalized inside the real Tiny Tools Text Cleaner, with transformations and output visible.
  variant: cleaner
  source: /projects/tiny-tools/showcase.webp
- label: Structured data
  caption: A small sample object inside the real Tiny Tools JSON Formatter. No private or production data is shown.
  variant: json
  source: /projects/tiny-tools/showcase-json.webp
---

Some jobs do not need another account or a large application. They need a place to paste some text, convert a supported file, tidy a table, or check a value.

Tiny Tools brings those jobs into focused browser workspaces. Start with the Text Cleaner, JSON Formatter, Image Converter or QR Studio, then use the wider collection when another task comes up.

Files are not sent to an application conversion service. Some tools first download a local runtime; others, such as currency and network diagnostics, intentionally contact disclosed external services. Format support and output fidelity have limits: keep originals and check consequential results.
