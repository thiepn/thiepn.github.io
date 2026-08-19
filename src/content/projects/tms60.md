---
schemaVersion: 1
code: L-007
slug: tms60
title: TMS60
subtitle: Bible verse memorization system
aliases:
- bible memorization
- verse memory
- topical memory system
- tms
category: learning
type: study-system
status: live
visibility: listed
summary: Memorize and maintain a structured set of Bible verses through focused recall and review.
repo: thiepn/tms60
liveUrl: https://thiepn.dev/tms60/
tags:
- bible
- memorization
- study
capabilityTags:
- local-first
- offline
platforms:
- desktop
- tablet
- mobile
collections:
- bible-faith
accent:
  light: '#53683C'
  dark: '#9CC36E'
preview:
  tier: P3
  type: synthetic
  component: Tms60Preview
actions:
  primaryLabel: Start learning
  source: true
dateAdded: '2026-08-18'
yearAdded: 2026
capabilities:
- title: Verse selection
  description: Choose any verse directly rather than forcing time-gated progression.
- title: Active recall
  description: Practice reproducing verse text instead of only rereading it.
- title: Maintain vs stable
  description: Distinguish recently learned material from verses that have become reliably retained.
- title: Offline memorization
  description: Keep the complete memorization workflow local and private.
---

A focused memorization tool for the Topical Memory System, built around direct verse selection, active recall, and long-term maintenance.

The learning model distinguishes between verses that are newly learned and need maintenance and verses that have become stable over time. Direct verse selection keeps the user in control, while active recall and review state make progress more meaningful than a simple completed/not-completed counter.
