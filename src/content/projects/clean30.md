---
schemaVersion: 1
code: T-003
slug: clean30
title: Clean30
subtitle: Guided cleaning workflow
aliases:
- cleaning
- cleaning app
- 30 minute clean
category: tools
type: app
status: live
visibility: listed
summary: Turn household cleaning into a clear, paced sequence of focused tasks and visible progress.
repo: thiepn/clean30
liveUrl: https://thiepn.dev/clean30/
tags:
- cleaning
- productivity
- routines
capabilityTags:
- local-first
platforms:
- desktop
- tablet
- mobile
collections:
- productivity-creation
accent:
  light: '#32745A'
  dark: '#65D19F'
preview:
  tier: P4
  type: synthetic
  provenance: synthetic
  component: Clean30Preview
  duration: 3600
actions:
  primaryLabel: Open tool
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: 30-minute resets
  description: Turn broad cleaning intentions into bounded, concrete reset sessions.
  previewState: tasks
- title: Task progression
  description: Advance through practical room-level tasks with visible completion state.
  previewState: progress
- title: Routine clarity
  description: Keep the interface centered on what to do next rather than productivity-dashboard overhead.
  previewState: routine
- title: Local continuity
  description: Preserve routine state locally so the app remains lightweight and private.
  previewState: complete
gallery:
- label: Tasks
  caption: A room reset begins as a concrete task sequence.
  variant: tasks
- label: Progress
  caption: Completion accumulates without dashboard overhead.
  variant: progress
- label: Complete
  caption: The bounded reset session reaches a clear finish.
  variant: complete
---

A guided cleaning system that reduces decision overhead by turning a room reset into a concrete sequence with progress and completion states.

The design deliberately narrows attention to the next physical action. Instead of adding productivity metrics around cleaning, the app uses bounded sessions, task progression, and an explicit finish state to reduce the friction of starting and continuing a reset.
