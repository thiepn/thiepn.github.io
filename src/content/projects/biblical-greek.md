---
schemaVersion: 1
code: L-901
slug: biblical-greek
title: Koinē Path
subtitle: Interactive Biblical Greek learning
aliases:
- biblical greek
- koine greek
- greek new testament
- koine path
category: learning
type: study-system
status: beta
visibility: listed
summary: Learn Biblical Greek through structured grammar, parsing drills, progressive hints, guided New Testament reading, review, and meaningful progress tracking.
repo: thiepn/greek
liveUrl: https://thiepn.dev/greek/
tags:
- bible
- grammar
- study
- vocabulary
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
- bible-faith
accent:
  light: '#9A6A2F'
  dark: '#D5B075'
preview:
  tier: P0
  type: static
  provenance: static
actions:
  primaryLabel: Start learning
  source: true
dateAdded: '2026-08-21'
yearAdded: 2026
capabilities:
- title: Structured Greek course
  description: Move from alphabet and case recognition into noun morphology, present verbs, and direct reading of John 1:1.
  previewState: learn
- title: Recall-first parsing drills
  description: Identify morphology before seeing answers, with mistakes automatically collected into a focused review queue.
  previewState: drill
- title: Progressive reader hints
  description: Explore John 1:1 through staged grammatical cues, lemma reveals, full parsing, and optional translation support.
  previewState: reader
- title: Local guided tutor
  description: Ask foundation grammar questions through a deterministic Socratic tutor designed for a later secure server-side AI bridge.
  previewState: tutor
- title: Meaningful progress metrics
  description: Track course mastery, parsing accuracy, reader exploration, and competency estimates rather than abstract experience points.
  previewState: progress
gallery:
- label: Learn
  caption: Structured grammar lessons connect forms directly to reading tasks.
  variant: learn
- label: Drill
  caption: Parsing practice turns endings and paradigms into automatic recognition.
  variant: drill
- label: Reader
  caption: John 1:1 uses progressive hints instead of instant interlinear answers.
  variant: reader
---

Koinē Path is an interactive Biblical Greek study system built around one principle: grammar should move the learner toward reading the Greek New Testament as early as possible.

The first beta combines five foundation lessons, active-recall parsing drills, a guided John 1:1 reader, a local review queue, competency-based progress tracking, and a deterministic tutor interface. The tutor layer is intentionally local in the GitHub Pages build because API secrets must not be embedded in a static client; the interface is prepared for a later secure AI proxy.
