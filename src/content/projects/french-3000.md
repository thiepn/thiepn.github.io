---
schemaVersion: 1
code: L-001
slug: french-3000
title: French 3000
subtitle: French vocabulary trainer
aliases:
- french vocabulary
- vocab
- flashcards
- srs
category: learning
type: flashcards
status: live
visibility: listed
summary: Build practical French vocabulary through focused flashcards, context, and spaced repetition.
repo: thiepn/french3000
liveUrl: https://thiepn.dev/french3000/
tags:
- french
- vocabulary
- study
capabilityTags:
- local-first
- offline
- pwa
platforms:
- desktop
- tablet
- mobile
collections:
- french-learning
accent:
  light: '#B63C3C'
  dark: '#FF7777'
preview:
  tier: P4
  type: synthetic
  provenance: synthetic
  component: French3000Preview
  duration: 3600
actions:
  primaryLabel: Start learning
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Recall-first cards
  description: Prompt active recall before revealing meaning and context.
  previewState: prompt
- title: Spaced repetition
  description: Rate recall quality and move cards through a lightweight review cycle.
  previewState: rating
- title: Contextual vocabulary
  description: Pair vocabulary with pronunciation, meaning, and natural example context.
  previewState: context
- title: Offline study
  description: Keep the core vocabulary workflow available locally for distraction-free review.
  previewState: next
gallery:
- label: Prompt
  caption: Vocabulary begins with active recall.
  variant: prompt
- label: Context
  caption: Meaning, pronunciation, and example usage are revealed.
  variant: context
- label: Rating
  caption: Recall quality determines the next review step.
  variant: rating
---

A local-first French vocabulary system built around active recall, contextual examples, review scheduling, and fast study sessions.

A study cycle begins with retrieval rather than recognition: the learner sees a prompt, attempts recall, reveals pronunciation and contextual meaning, then rates the result. That sequence is designed to keep short sessions useful without turning vocabulary review into a broad course dashboard.
