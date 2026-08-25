---
schemaVersion: 1
code: L-008
slug: pflegelern
title: PflegeLern
subtitle: Offline nursing study system
aliases:
- pflege lern
- nursing study
- nursing flashcards
- pflegeprüfung
category: learning
type: study-system
status: live
visibility: listed
summary: Study nursing with structured concepts, flashcards, adaptive review, exam practice, clinical cases, progress tracking, and offline access.
repo: thiepn/pflegelern
liveUrl: https://thiepn.dev/pflegelern/
tags:
- study
- exam-prep
- memorization
capabilityTags:
- local-first
- offline
- pwa
platforms:
- desktop
- tablet
- mobile
controls:
- keyboard
- mouse
- touch
collections: []
accent:
  light: '#246B78'
  dark: '#72D3DF'
preview:
  tier: P0
  type: static
  provenance: static
actions:
  primaryLabel: Start studying
  source: true
dateAdded: '2026-08-25'
yearAdded: 2026
lastMajorUpdate: '2026-08-25'
capabilities:
- title: Structured nursing study
  description: Move from textbook structure into concepts, searchable learning material, bookmarks, and unrestricted focused study.
- title: Adaptive recall
  description: Combine flashcards, confidence feedback, weak-topic review, and FSRS-based scheduling without locking study behind a daily quota.
- title: Exam and case practice
  description: Practice through quick, full, weakness, chapter, and section tests alongside clinical application cases and recovery flows.
- title: Offline continuity
  description: Keep progress, study history, backup and restore, and session recovery in a mobile-first PWA that remains usable offline after first load.
---

A mobile-first nursing study environment built around structured learning, active recall, adaptive review, exam practice, and local progress rather than a passive question bank.

The application is designed for independent study and preserves a clear source boundary: its study bank follows the referenced 2015 textbook edition and should not be mistaken for silently updated clinical guidance. Recommended study helps prioritize work, but unrestricted learning remains available without an artificial daily cap.
